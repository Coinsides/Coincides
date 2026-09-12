import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import test from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import { closeDb, initDb } from '../db/init.js';
import migration from '../db/migrations/067_v13_paper_skin.js';
import boardMigration from '../db/migrations/068_v13_board_skin.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import coursesRoutes from '../routes/courses.js';
import notesRoutes from '../routes/notes.js';
import settingsRoutes from '../routes/settings.js';
import { createBoardRouter } from '../routes/boards.js';
import { parseStoredSkin } from '../services/skin.js';

const userId = 'b1000000-0000-4000-8000-000000000001';
const presets = ['default', 'quiet-ink', 'warm-paper', 'workbench'] as const;

async function fixture() {
  const temporaryRoot = resolve(tmpdir());
  const directory = mkdtempSync(join(temporaryRoot, 'coincides-b1a-skin-'));
  const dbPath = join(directory, 'skin.sqlite');
  let db = await initDb(dbPath);
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','B1a',?)")
    .run(userId, 'b1a@example.invalid', JSON.stringify({ language: 'zh', daily_status_enabled: false }));
  const app = express();
  app.use(express.json());
  // Exercise the existing human routes after authentication, using synthetic data only.
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/settings', settingsRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/boards', createBoardRouter(() => db));
  app.use(errorHandler);
  const server = await new Promise<Server>((resolveServer) => {
    const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    get db() { return db; },
    async reopen() { closeDb(); db = await initDb(dbPath); },
    async request(method: string, path: string, body?: unknown, status = 200) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
        method,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    },
    async close() {
      await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
      closeDb();
      assert.ok(resolve(directory).startsWith(`${temporaryRoot}${sep}coincides-b1a-skin-`));
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test('B1e board tokens and all five component overrides persist at every mount and leave geometry/content intact', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const project = await f.request('POST', 'courses', { name: 'Board skins' }, 201);
  const note = await f.request('POST', 'notes', { course_id: project.id, title: 'Paper title', metadata: { typography: { font: 'system', size: 16 } } }, 201);
  const { board } = await f.request('POST', 'boards', { title: 'Board skin', project_id: project.id, purpose: { title: 'Compare skins' } }, 201);
  const before = await f.request('GET', `boards/${board.id}`);
  assert.equal(board.skin, null);
  for (const preset of presets) {
    const skin = { preset, overrides: { 'board-desk': '#112233', card: '#eeeeee', edge: '#8899aa', chalk: '#ddeeff' },
      components: { titleFont: 'serif', labelFont: 'mono', menuDensity: 'compact', handleStyle: 'rivet', headerRule: preset === 'quiet-ink' ? 'visible' : 'hidden' } };
    await f.request('PUT', 'settings', { settings: { skin } });
    await f.request('PUT', `courses/${project.id}`, { skin });
    await f.request('PUT', `notes/${note.id}`, { skin });
    assert.deepEqual((await f.request('PATCH', `boards/${board.id}`, { skin })).board.skin, skin);
    await f.reopen();
    assert.deepEqual((await f.request('GET', 'settings')).skin, skin);
    assert.deepEqual((await f.request('GET', `courses/${project.id}/summary`)).course.skin, skin);
    assert.deepEqual((await f.request('GET', `notes/${note.id}`)).metadata.skin, skin);
    const after = await f.request('GET', `boards/${board.id}`);
    assert.deepEqual(after.board.skin, skin);
    assert.deepEqual(after.board.viewport, before.board.viewport);
    assert.equal(after.board.identity_description, before.board.identity_description);
    for (const key of ['members', 'edges', 'visuals', 'layers']) assert.deepEqual(after[key], before[key]);
    await f.request('PATCH', `boards/${board.id}`, { viewport: { x: 10, y: 20, zoom: 2 } });
    assert.deepEqual((await f.request('GET', `boards/${board.id}`)).board.skin, skin);
    await f.request('PATCH', `boards/${board.id}`, { viewport: before.board.viewport });
  }
  assert.equal((await f.request('PATCH', `boards/${board.id}`, { skin: null })).board.skin, null);
  await f.reopen();
  assert.equal((await f.request('GET', `boards/${board.id}`)).board.skin, null);
  assert.deepEqual((await f.request('GET', `notes/${note.id}`)).metadata.typography, { font: 'system', size: 16 });
});

test('B1a existing settings, project and note routes persist four preset selections across a database reopen', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const project = await f.request('POST', 'courses', { name: 'Paper skins' }, 201);
  const note = await f.request('POST', 'notes', {
    course_id: project.id, title: 'Synthetic paper', metadata: { typography: { font: 'system', size: 16 } },
  }, 201);
  assert.equal(project.skin, null);
  assert.equal(note.metadata.skin, undefined);
  for (const preset of presets) {
    const skin = { preset };
    assert.deepEqual((await f.request('PUT', 'settings', { settings: { skin } })).skin, skin);
    assert.deepEqual((await f.request('PUT', `courses/${project.id}`, { skin })).skin, skin);
    assert.deepEqual((await f.request('PUT', `notes/${note.id}`, { skin })).metadata.skin, skin);
    await f.reopen();
    assert.deepEqual((await f.request('GET', 'settings')).skin, skin);
    assert.deepEqual((await f.request('GET', 'courses'))[0].skin, skin);
    assert.deepEqual((await f.request('GET', `courses/${project.id}/summary`)).course.skin, skin);
    const readNote = await f.request('GET', `notes/${note.id}`);
    assert.deepEqual(readNote.metadata.skin, skin);
    assert.deepEqual(readNote.metadata.typography, { font: 'system', size: 16 });
    assert.equal(Object.prototype.hasOwnProperty.call(readNote, 'skin'), false);
    assert.deepEqual((await f.request('GET', `notes?course_id=${project.id}`))[0].metadata.skin, skin);
  }
  const settings = await f.request('GET', 'settings');
  assert.equal(settings.language, 'zh');
  assert.equal(settings.daily_status_enabled, false);
});

test('B1a each mount persists nine token overrides, and a preset switch replaces the old overrides', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const skin = { preset: 'warm-paper', overrides: {
    desk: '#1D1A17', paper: '#F7F3EA', ink: '#2B2620', 'ink-muted': '#837A6C', accent: '#33604F',
    annotation: '#B8912E', hairline: '#E6DECE', danger: '#A04A38', wall: '#FFFFFF14',
  } };
  const project = await f.request('POST', 'courses', { name: 'With overrides', skin }, 201);
  const note = await f.request('POST', 'notes', { course_id: project.id, title: 'With overrides', skin }, 201);
  await f.request('PUT', 'settings', { settings: { skin } });
  await f.reopen();
  assert.deepEqual((await f.request('GET', 'settings')).skin, skin);
  assert.deepEqual((await f.request('GET', 'courses'))[0].skin, skin);
  assert.deepEqual((await f.request('GET', `notes/${note.id}`)).metadata.skin, skin);
  const replacement = { preset: 'quiet-ink' };
  assert.deepEqual((await f.request('PUT', 'settings', { settings: { skin: replacement } })).skin, replacement);
  assert.deepEqual((await f.request('PUT', `courses/${project.id}`, { skin: replacement })).skin, replacement);
  assert.deepEqual((await f.request('PUT', `notes/${note.id}`, { skin: replacement })).metadata.skin, replacement);
});

test('B1a null clears each mount while unrelated writes retain its chosen skin and document metadata', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const skin = { preset: 'workbench', overrides: { accent: '#E5A33C' } };
  const project = await f.request('POST', 'courses', { name: 'Inherit', skin }, 201);
  const note = await f.request('POST', 'notes', { course_id: project.id, title: 'Inherit', skin }, 201);
  await f.request('PUT', 'settings', { settings: { skin } });
  assert.deepEqual((await f.request('PUT', 'settings', { settings: { language: 'en' } })).skin, skin);
  assert.deepEqual((await f.request('PUT', `courses/${project.id}`, { name: 'Renamed' })).skin, skin);
  const typography = { fontFamily: 'system', fontSize: 18, lineHeight: 1.6 };
  const updated = await f.request('PUT', `notes/${note.id}`, { metadata: { typography }, title: 'Renamed' });
  assert.deepEqual(updated.metadata, { typography, skin });
  const staleSave = await f.request('PUT', `notes/${note.id}`, {
    metadata: { typography, skin: { preset: 'default' } },
  });
  assert.deepEqual(staleSave.metadata, { typography, skin });
  assert.equal((await f.request('PUT', 'settings', { settings: { skin: null } })).skin, null);
  assert.equal((await f.request('PUT', `courses/${project.id}`, { skin: null })).skin, null);
  assert.deepEqual((await f.request('PUT', `notes/${note.id}`, { skin: null })).metadata, { typography, skin: null });
  await f.reopen();
  assert.equal((await f.request('GET', 'settings')).skin, null);
  assert.equal((await f.request('GET', 'courses'))[0].skin, null);
  assert.equal((await f.request('GET', `notes/${note.id}`)).metadata.skin, null);
});

test('B1a project migration is additive and repeatable for an existing project', () => {
  const db = new Database(':memory:');
  try {
    db.exec("CREATE TABLE courses (id TEXT PRIMARY KEY, name TEXT); INSERT INTO courses VALUES ('old', 'Existing project')");
    migration.up(db); migration.up(db);
    assert.deepEqual(db.prepare('SELECT * FROM courses').get(), { id: 'old', name: 'Existing project', skin: null });
    db.prepare('UPDATE courses SET skin = ?').run(JSON.stringify({ preset: 'warm-paper' }));
    migration.up(db);
    assert.deepEqual(parseStoredSkin((db.prepare('SELECT skin FROM courses').get() as { skin: string }).skin), { preset: 'warm-paper' });
  } finally { db.close(); }
});

test('B1b board migration preserves existing rows and repeated runs preserve a stored selection', () => {
  const db = new Database(':memory:');
  try {
    db.exec("CREATE TABLE boards (id TEXT PRIMARY KEY, title TEXT, viewport TEXT); INSERT INTO boards VALUES ('old', 'Existing board', '{\"x\":40}')");
    boardMigration.up(db); boardMigration.up(db);
    assert.deepEqual(db.prepare('SELECT * FROM boards').get(), { id: 'old', title: 'Existing board', viewport: '{"x":40}', skin: null });
    const skin = { preset: 'workbench', components: { handleStyle: 'capsule', headerRule: 'hidden' } };
    db.prepare('UPDATE boards SET skin = ?').run(JSON.stringify(skin));
    boardMigration.up(db);
    assert.deepEqual(parseStoredSkin((db.prepare('SELECT skin FROM boards').get() as { skin: string }).skin), skin);
  } finally { db.close(); }
});
