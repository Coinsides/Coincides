import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import test, { after } from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import {
  createDefaultNoteBindingSection,
  createDefaultNoteBindingSettings,
  NOTE_BINDING_SLOT_NAMES,
} from '../../../shared/types/noteBinding.js';
import { createManualBindingPreset } from '../../../shared/types/notePresets.js';
import { closeDb, initDb } from '../db/init.js';
import migration079 from '../db/migrations/079_v14_note_binding.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import { noteBindingSettingsSchema } from '../validators/noteBinding.js';

const temporaryRoot = resolve(tmpdir());
const directory = mkdtempSync(join(temporaryRoot, 'coincides-binding-'));
const userId = 'binding-user';
const courseId = '14000000-0000-4000-8000-000000000081';
const noteId = 'binding-note';
let fixtureNumber = 0;

after(() => {
  closeDb();
  assert.ok(resolve(directory).startsWith(`${temporaryRoot}${sep}coincides-binding-`));
  rmSync(directory, { recursive: true, force: true });
});

async function fixture() {
  const path = join(directory, `binding-${++fixtureNumber}.sqlite`);
  let db = await initDb(path);
  db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,?,'synthetic','Binding')")
    .run(userId, 'binding@example.test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Binding project');
  const metadata = { typography: { fontFamily: 'serif' }, binding: { cover: null },
    canvas: { frames: [{ id: 'page-1', width: 800, height: 1100 }] } };
  db.prepare('INSERT INTO notes(id,user_id,course_id,title,metadata) VALUES(?,?,?,?,?)')
    .run(noteId, userId, courseId, 'Binding note', JSON.stringify(metadata));
  db.prepare(`INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text)
    VALUES('binding-block',?,?,'text',?,?)`).run(userId, courseId,
    JSON.stringify({ text: 'Unchanged writing' }), 'Unchanged writing');
  db.prepare(`INSERT INTO note_block_placements(id,note_id,block_id,order_index,display_overrides_json)
    VALUES('binding-place',?,'binding-block',0,?)`).run(noteId,
    JSON.stringify({ position: { x: 72, y: 96 }, frameId: 'page-1' }));
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/notes', noteRoutes);
  app.use(errorHandler);
  const server = await new Promise<Server>((resolveServer) => {
    const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    get db() { return db; },
    async request(method: string, route = `/${noteId}`, body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/notes${route}`, {
        method, ...(body === undefined ? {} : {
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    },
    async reopen() { closeDb(); db = await initDb(path); },
    async close() {
      await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
      closeDb();
    },
  };
}

test('079 adds nullable note storage without rewriting old rows and is idempotent', () => {
  const db = new Database(':memory:');
  try {
    db.exec("CREATE TABLE notes(id TEXT PRIMARY KEY, title TEXT, metadata TEXT, updated_at TEXT);"
      + "INSERT INTO notes VALUES('old','Old note','{\"preserve\":true}','unchanged');"
      + 'CREATE TABLE row_updates(count INTEGER); INSERT INTO row_updates VALUES(0);'
      + 'CREATE TRIGGER track_update AFTER UPDATE ON notes BEGIN UPDATE row_updates SET count=count+1; END;');
    const before = db.prepare('SELECT * FROM notes').get();
    migration079.up(db);
    migration079.up(db);
    const stored = db.prepare('SELECT * FROM notes').get() as any;
    assert.deepEqual(stored, { ...before as object, binding_settings_json: null });
    assert.equal((db.prepare('SELECT count FROM row_updates').get() as any).count, 0);
    const column = (db.pragma('table_info(notes)') as any[]).find((entry) => entry.name === 'binding_settings_json');
    assert.equal(column.type, 'TEXT'); assert.equal(column.notnull, 0); assert.equal(column.dflt_value, 'NULL');
  } finally { db.close(); }
});

test('shared defaults are valid, cover the six slots, and produce independent settings objects', () => {
  const settings = createDefaultNoteBindingSettings();
  assert.deepEqual(noteBindingSettingsSchema.parse(settings), settings);
  assert.deepEqual(Object.keys(settings.sections[0].slots), [...NOTE_BINDING_SLOT_NAMES]);
  assert.equal(settings.sections[0].startPage, 1);
  assert.equal(settings.sections[0].pageNumber.slot, 'footer-center');
  assert.equal(settings.enabled, true); assert.equal(settings.dropFolioOnCover, true);
  settings.sections[0].slots['header-left'].text = 'Changed';
  assert.equal(createDefaultNoteBindingSettings().sections[0].slots['header-left'].text, '');
  assert.equal(settings.sections[0].slots['header-center'].text, '');
});

test('old and newly created notes expose an implicit default without writing settings on read', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const before = f.db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
  assert.equal((await f.request('GET', `/${noteId}/binding-settings`)).binding_settings, null);
  assert.equal((await f.request('GET')).binding_settings, undefined);
  assert.equal((await f.request('GET', `?course_id=${courseId}`))[0].binding_settings, undefined);
  assert.deepEqual(f.db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId), before);
  const created = await f.request('POST', '', { course_id: courseId, title: 'New binding note' }, 201);
  assert.equal((await f.request('GET', `/${created.id}/binding-settings`)).binding_settings, null);
  assert.equal(Object.prototype.hasOwnProperty.call(created, 'binding_settings_json'), false);
});

test('note settings persist six slots, styles, three counters, and mechanical section boundaries across reopen', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const settings = createDefaultNoteBindingSettings();
  settings.sections.push(createDefaultNoteBindingSection('chapter', 3), createDefaultNoteBindingSection('appendix', 8));
  settings.sections[1].pageNumber = { enabled: true, startAt: 4, format: 'roman-lower',
    prefix: 'Chapter · ', suffix: ' · end', slot: 'header-right' };
  settings.sections[2].pageNumber.format = 'roman-upper';
  settings.sections[2].headerFooterEnabled = false;
  for (const [index, slot] of NOTE_BINDING_SLOT_NAMES.entries()) {
    settings.sections[0].slots[slot] = { text: `Manual ${slot}`, offsetX: index + 0.125, offsetY: -index - 0.25,
      style: { fontFamily: 'serif', fontSize: 13.5, fontWeight: 600, colorToken: 'ink-muted', italic: true } };
  }
  const blocks = f.db.prepare('SELECT * FROM note_blocks').all();
  const placements = f.db.prepare('SELECT * FROM note_block_placements').all();
  const before = await f.request('GET');
  const updated = await f.request('PUT', `/${noteId}/binding-settings`, { binding_settings: settings });
  assert.deepEqual(updated.binding_settings, settings);
  assert.equal(Object.prototype.hasOwnProperty.call(updated, 'binding_settings_json'), false);
  assert.deepEqual(updated.metadata, before.metadata);
  assert.equal(updated.page_format, before.page_format);
  assert.deepEqual(f.db.prepare('SELECT * FROM note_blocks').all(), blocks);
  assert.deepEqual(f.db.prepare('SELECT * FROM note_block_placements').all(), placements);
  await f.reopen();
  assert.deepEqual((await f.request('GET', `/${noteId}/binding-settings`)).binding_settings, settings);
  assert.equal((await f.request('GET')).binding_settings, undefined);
  assert.equal((await f.request('GET', `?course_id=${courseId}`))[0].binding_settings, undefined);
  assert.deepEqual(JSON.parse((f.db.prepare('SELECT binding_settings_json FROM notes WHERE id = ?').get(noteId) as any)
    .binding_settings_json), settings);
});

test('ordinary note edits retain binding settings and explicit null restores the construction default', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const settings = createDefaultNoteBindingSettings(); settings.enabled = false; settings.dropFolioOnCover = false;
  await f.request('PUT', `/${noteId}/binding-settings`, { binding_settings: settings });
  const renamed = await f.request('PUT', `/${noteId}`, { title: 'Renamed', metadata: { kept: 'metadata' } });
  assert.deepEqual((await f.request('GET', `/${noteId}/binding-settings`)).binding_settings, settings);
  assert.equal(renamed.binding_settings, undefined);
  const reset = await f.request('PUT', `/${noteId}/binding-settings`, { binding_settings: null });
  assert.equal(reset.binding_settings, null); assert.equal(reset.title, 'Renamed');
  assert.equal(reset.metadata.kept, 'metadata');
  assert.equal((f.db.prepare('SELECT binding_settings_json FROM notes WHERE id = ?').get(noteId) as any)
    .binding_settings_json, null);
});

test('manual binding preset persists through the ordinary PUT door, reopens, and remains editable', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const previous = createDefaultNoteBindingSettings();
  previous.coverPage.exportIncluded = false;
  previous.sections.push(createDefaultNoteBindingSection('old-section', 3));
  const previousSnapshot = structuredClone(previous);
  const note = await f.request('GET');
  const preset = createManualBindingPreset(previous, note.title, 'Field notes');
  assert.deepEqual(previous, previousSnapshot);
  assert.deepEqual(preset.coverPage, previous.coverPage);
  assert.deepEqual(preset.cover, previous.cover);
  assert.equal(preset.sections.length, 1);
  assert.equal(preset.sections[0].slots['header-center'].text, note.title);
  assert.equal(preset.sections[0].slots['footer-right'].text, 'Field notes');
  assert.deepEqual(preset.sections[0].pageNumber, {
    enabled: true, startAt: 1, format: 'arabic', prefix: '第 ', suffix: ' 纸', slot: 'footer-center',
  });
  assert.equal(createManualBindingPreset(previous, note.title).sections[0].slots['footer-right'].text, '');

  const applied = await f.request('PUT', `/${noteId}/binding-settings`, { binding_settings: preset });
  assert.deepEqual(applied.binding_settings, preset);
  await f.reopen();
  assert.deepEqual((await f.request('GET', `/${noteId}/binding-settings`)).binding_settings, preset);
  assert.deepEqual(JSON.parse((f.db.prepare('SELECT binding_settings_json FROM notes WHERE id = ?').get(noteId) as any)
    .binding_settings_json), preset);

  const edited = structuredClone(preset);
  edited.sections[0].slots['header-center'].text = 'Edited running title';
  edited.sections[0].slots['footer-right'].text = 'Revised footer';
  edited.sections[0].pageNumber.prefix = 'Page ';
  edited.sections[0].pageNumber.suffix = '';
  assert.deepEqual((await f.request('PUT', `/${noteId}/binding-settings`, { binding_settings: edited })).binding_settings,
    edited);
  await f.reopen();
  assert.deepEqual((await f.request('GET', `/${noteId}/binding-settings`)).binding_settings, edited);
  assert.deepEqual(JSON.parse((f.db.prepare('SELECT binding_settings_json FROM notes WHERE id = ?').get(noteId) as any)
    .binding_settings_json), edited);
});

test('section editing validates first page, increasing boundaries, unique ids, and normal numeric limits', () => {
  for (const mutate of [
    (settings: ReturnType<typeof createDefaultNoteBindingSettings>) => { settings.sections[0].startPage = 2; },
    (settings: ReturnType<typeof createDefaultNoteBindingSettings>) => { settings.sections.push(createDefaultNoteBindingSection('next', 1)); },
    (settings: ReturnType<typeof createDefaultNoteBindingSettings>) => { settings.sections.push(createDefaultNoteBindingSection('default', 2)); },
    (settings: ReturnType<typeof createDefaultNoteBindingSettings>) => { settings.sections[0].pageNumber.startAt = 0; },
    (settings: ReturnType<typeof createDefaultNoteBindingSettings>) => { settings.sections[0].slots['header-left'].style.fontSize = 0; },
  ]) {
    const settings = createDefaultNoteBindingSettings(); mutate(settings);
    assert.equal(noteBindingSettingsSchema.safeParse(settings).success, false);
  }
  const boundary = createDefaultNoteBindingSettings();
  boundary.sections[0].pageNumber.startAt = 999999;
  boundary.sections[0].slots['header-left'].text = '章'.repeat(2000);
  boundary.sections[0].pageNumber.prefix = '前'.repeat(200);
  boundary.sections[0].pageNumber.suffix = '后'.repeat(200);
  boundary.sections[0].slots['header-left'].offsetX = -1000;
  boundary.sections[0].slots['header-left'].offsetY = 1000;
  assert.deepEqual(noteBindingSettingsSchema.parse(boundary), boundary);
});
