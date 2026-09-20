import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import express from 'express';
import type { Server } from 'node:http';
import { closeDb, initDb } from '../db/init.js';
import { createDefaultNoteBindingSettings, getNoteBindingCoverPage, upgradeNoteBindingSettings } from '../../../shared/types/noteBinding.js';
import { isNoteCoverFrame, readNoteCover } from '../../../shared/types/noteCover.js';
import { noteBindingSettingsSchema } from '../validators/noteBinding.js';
import { getNoteBindingSettings, updateNoteBindingSettings } from '../services/noteBinding.js';
import { getNoteCanvasPersistence, savePageFrameCollection, saveBlockCanvasPlacement, saveCanvasObject } from '../services/canvasObjects.js';
import { createClientNoteBlock } from '../services/noteBlockLifecycle.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { releaseAssetReference } from '../services/canvasAssets.js';
import noteRoutes from '../routes/notes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { readNoteBindingView, projectNoteCoverMetadata } from '../services/noteCoverStorage.js';
import { upgradeNoteBindingSettings as upgradeServerBindingSettings } from '../services/noteBindingModel.js';

const userId = 'a3-user';
const courseId = '14000000-0000-4000-8000-000000000091';
const noteId = 'a3-note';
const frame = (id: string, y: number) => ({ id, role: id === 'content' ? 'primary_page_frame' : 'secondary_page_frame',
  x: 80, y, width: 904, height: 1280, pageSize: 'A4', exportable: true,
  contentInset: { top: 96, right: 72, bottom: 96, left: 72 } });
const contentCollection = { pageFrames: [frame('content', 80)], primaryFrameId: 'content', selectedFrameId: 'content',
  pageStacks: [{ id: 'content-stack', frameIds: ['content'], primaryFrameId: 'content' }] };
const coverCollection = { ...contentCollection, pageFrames: [frame('cover', -1240), frame('content', 80)],
  pageStacks: [{ id: 'cover-stack', frameIds: ['cover'], primaryFrameId: 'cover' }, ...contentCollection.pageStacks] };
const local = { x: 12.125, y: 20.375, width: 250.625, height: 90.875, frame_id: 'cover',
  coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside', width_mode: 'manual' };

async function fixture() {
  const directory = mkdtempSync(join(resolve('../.codex-tmp/a3-cover'), 'fixture-'));
  const path = join(directory, 'cover.sqlite');
  let db = await initDb(path);
  db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,?,'fixture','A3')").run(userId, 'a3@example.test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Cover project');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title,description) VALUES(?,?,?,?,?)')
    .run(noteId, userId, courseId, 'Current title', 'Current description');
  db.prepare("INSERT OR REPLACE INTO database_meta(key,value) VALUES('coordinate_contract','v2')").run();
  savePageFrameCollection(db, userId, noteId, contentCollection);
  return { get db() { return db; }, async reopen() { closeDb(); db = await initDb(path); }, close: closeDb };
}

function addCover(db: Awaited<ReturnType<typeof fixture>>['db']) {
  const settings = upgradeNoteBindingSettings(getNoteBindingSettings(db, userId, noteId).binding_settings); settings.coverPage.frameId = 'cover';
  updateNoteBindingSettings(db, userId, noteId, settings, coverCollection);
  return settings;
}

function createBlock(db: Awaited<ReturnType<typeof fixture>>['db'], type: string, key: string, content: Record<string, unknown>) {
  const result = createClientNoteBlock(db, userId, noteId, courseId, {
    client_create_key: key, block_type: type, content_json: content,
  });
  assert.equal(result.status, 'applied');
  if (result.status !== 'applied') throw new Error('Expected a created block');
  return result;
}

test('A3 v2 upgrades A2 settings without changing sections and uses the card viewport vocabulary', () => {
  const defaults = createDefaultNoteBindingSettings();
  assert.deepEqual(upgradeServerBindingSettings(null), defaults);
  const legacy = { version: 1 as const, enabled: defaults.enabled, dropFolioOnCover: defaults.dropFolioOnCover, sections: defaults.sections };
  assert.deepEqual(noteBindingSettingsSchema.parse(legacy), legacy);
  const upgraded = upgradeNoteBindingSettings(legacy);
  assert.equal(upgraded.version, 2); assert.deepEqual(upgraded.sections, legacy.sections);
  assert.deepEqual(getNoteBindingCoverPage(legacy), { frameId: null, exportIncluded: true });
  upgraded.cover = { assetId: 'asset', page: { crop: { x: 12.125, y: 20.5, width: 50, height: 70 }, zoom: 2 } };
  assert.ok(isNoteCoverFrame(upgraded.cover.page));
  assert.deepEqual(noteBindingSettingsSchema.parse(upgraded), upgraded);
  assert.equal('cover' in legacy, false);
});

test('A3 cover lifecycle persists a real leading page and transfers text, projections and ink without coordinate loss', async (t) => {
  const f = await fixture(); t.after(f.close);
  const settings = addCover(f.db);
  const ordinary = createBlock(f.db, 'paragraph', 'cover-text', { body: 'Cover words' });
  const reference = createBlock(f.db, 'note_ref', 'cover-title', { field: 'title' });
  for (const block of [ordinary.block, reference.block]) saveBlockCanvasPlacement(f.db, userId, noteId,
    String(block.placement_id), { block_id: String(block.id), layout: local });
  saveCanvasObject(f.db, userId, noteId, 'a3-ink', { kind: 'freehand',
    data: { points: [{ x: 0, y: 0 }, { x: 10.5, y: 12.5 }] }, placement: { ...local, placement_id: 'a3-ink-place' } });
  const before = f.db.prepare("SELECT id,x,y,width,height,metadata FROM canvas_placements WHERE frame_id='cover'").all() as any[];
  const blockTruth = f.db.prepare('SELECT * FROM note_blocks ORDER BY id').all();
  const inkTruth = f.db.prepare("SELECT metadata FROM canvas_objects WHERE id='a3-ink'").get();
  await f.reopen();
  assert.deepEqual(getNoteBindingSettings(f.db, userId, noteId).binding_settings, settings);
  assert.deepEqual(getNoteCanvasPersistence(f.db, userId, noteId).pageFrameCollection?.pageFrames.map((entry) => entry.id), ['cover', 'content']);
  settings.coverPage.frameId = null;
  updateNoteBindingSettings(f.db, userId, noteId, settings, contentCollection);
  const residentIds = [ordinary.block.placement_id, reference.block.placement_id, 'a3-ink-place'];
  for (const row of before.filter((entry) => residentIds.includes(entry.id))) {
    const after = f.db.prepare('SELECT id,x,y,width,height,metadata,frame_id FROM canvas_placements WHERE id=?').get(row.id) as any;
    assert.ok(after);
    assert.deepEqual(after, { ...row, frame_id: 'content' });
  }
  assert.deepEqual(f.db.prepare('SELECT * FROM note_blocks ORDER BY id').all(), blockTruth);
  assert.deepEqual(f.db.prepare("SELECT metadata FROM canvas_objects WHERE id='a3-ink'").get(), inkTruth);
  assert.equal(getNoteCanvasPersistence(f.db, userId, noteId).pageFrameCollection?.pageFrames.length, 1);
});

test('A3 note identity blocks reserve one projection per cover field and deletion retains note truth', async (t) => {
  const f = await fixture(); t.after(f.close); addCover(f.db);
  const first = createBlock(f.db, 'note_ref', 'title-one', { field: 'title' });
  const repeated = createBlock(f.db, 'note_ref', 'title-two', { field: 'title' });
  const description = createBlock(f.db, 'note_ref', 'description', { field: 'description' });
  assert.equal(repeated.created, false); assert.equal(repeated.block.id, first.block.id);
  assert.notEqual(first.block.id, description.block.id);
  f.db.prepare('UPDATE notes SET title=?,description=? WHERE id=?').run('Renamed title', 'Revised description', noteId);
  const stored = f.db.prepare('SELECT content_json,plain_text,title,metadata FROM note_blocks WHERE id=?').get(first.block.id) as any;
  assert.deepEqual(JSON.parse(stored.content_json), { field: 'title' }); assert.equal(stored.plain_text, null); assert.equal(stored.title, null);
  assert.deepEqual(JSON.parse(stored.metadata), {});
  updateNoteBlockContent(f.db, userId, String(first.block.id), { status: 'trashed' });
  assert.deepEqual(f.db.prepare('SELECT title,description FROM notes WHERE id=?').get(noteId),
    { title: 'Renamed title', description: 'Revised description' });
});

test('A3 rebuilding a cover creates fresh identity projections while preserving transferred and tray projections', async (t) => {
  const f = await fixture(); t.after(f.close);
  const settings = addCover(f.db);
  const oldTitle = createBlock(f.db, 'note_ref', 'old-title', { field: 'title' }).block;
  const pendingDescription = createBlock(f.db, 'note_ref', 'old-description', { field: 'description' }).block;
  saveBlockCanvasPlacement(f.db, userId, noteId, String(oldTitle.placement_id), { block_id: String(oldTitle.id), layout: local });
  settings.coverPage.frameId = null;
  updateNoteBindingSettings(f.db, userId, noteId, settings, contentCollection);
  assert.equal((f.db.prepare('SELECT frame_id FROM canvas_placements WHERE id=?').get(oldTitle.placement_id) as any).frame_id, 'content');
  assert.equal(JSON.parse((f.db.prepare('SELECT display_overrides_json FROM note_block_placements WHERE id=?')
    .get(pendingDescription.placement_id) as any).display_overrides_json).note_ref_pending_frame_id, 'content');

  // Reusing the same ordinary page-frame ID must not revive the retired reservation.
  addCover(f.db);
  const newTitle = createBlock(f.db, 'note_ref', 'new-title', { field: 'title' }).block;
  const newDescription = createBlock(f.db, 'note_ref', 'new-description', { field: 'description' }).block;
  assert.notEqual(newTitle.id, oldTitle.id); assert.notEqual(newDescription.id, pendingDescription.id);
  assert.equal(createBlock(f.db, 'note_ref', 'repeat-title', { field: 'title' }).block.id, newTitle.id);
  for (const block of [newTitle, newDescription]) saveBlockCanvasPlacement(f.db, userId, noteId,
    String(block.placement_id), { block_id: String(block.id), layout: local });
  updateNoteBlockContent(f.db, userId, String(oldTitle.id), { content_json: { field: 'title' } });
  assert.throws(() => saveBlockCanvasPlacement(f.db, userId, noteId, String(oldTitle.placement_id),
    { block_id: String(oldTitle.id), layout: local }), /This cover already has/);
  assert.throws(() => updateNoteBlockContent(f.db, userId, String(newDescription.id),
    { content_json: { field: 'title' } }), /This cover already has/);
  assert.equal((f.db.prepare('SELECT frame_id FROM canvas_placements WHERE id=?').get(oldTitle.placement_id) as any).frame_id, 'content');

  saveBlockCanvasPlacement(f.db, userId, noteId, String(newTitle.placement_id),
    { block_id: String(newTitle.id), layout: { ...local, surface: 'tray', boundary_role: 'tray' } });
  const trayReplacement = createBlock(f.db, 'note_ref', 'tray-replacement', { field: 'title' }).block;
  assert.notEqual(trayReplacement.id, newTitle.id);
  saveBlockCanvasPlacement(f.db, userId, noteId, String(trayReplacement.placement_id),
    { block_id: String(trayReplacement.id), layout: local });
  assert.throws(() => saveBlockCanvasPlacement(f.db, userId, noteId, String(newTitle.placement_id),
    { block_id: String(newTitle.id), layout: local }), /This cover already has/);
  for (const block of [oldTitle, pendingDescription, newTitle, newDescription, trayReplacement]) {
    const stored = f.db.prepare('SELECT content_json,plain_text,title FROM note_blocks WHERE id=?').get(block.id) as any;
    assert.deepEqual(Object.keys(JSON.parse(stored.content_json)), ['field']);
    assert.equal(stored.plain_text, null); assert.equal(stored.title, null);
  }
});

test('A3 cover manual placement accepts text and rejects component residents', async (t) => {
  const f = await fixture(); t.after(f.close); addCover(f.db);
  const text = createBlock(f.db, 'paragraph', 'ordinary', { body: 'Words' }).block;
  const component = createBlock(f.db, 'formula', 'formula', { body: 'x = 1' }).block;
  const code = createBlock(f.db, 'paragraph', 'code', { language: 'javascript', body: 'return 1' }).block;
  assert.throws(() => saveBlockCanvasPlacement(f.db, userId, noteId, String(component.placement_id),
    { block_id: String(component.id), layout: local }), /Cover pages accept/);
  assert.throws(() => saveBlockCanvasPlacement(f.db, userId, noteId, String(code.placement_id),
    { block_id: String(code.id), layout: local }), /Cover pages accept/);
  assert.throws(() => saveBlockCanvasPlacement(f.db, userId, noteId, String(text.placement_id),
    { block_id: String(text.id), layout: { ...local, width_mode: 'auto' } }), /manual placement/);
  saveBlockCanvasPlacement(f.db, userId, noteId, String(text.placement_id), { block_id: String(text.id), layout: local });
  assert.throws(() => updateNoteBlockContent(f.db, userId, String(text.id), { block_type: 'formula' }), /Cover pages accept/);
  assert.equal((f.db.prepare('SELECT block_type FROM note_blocks WHERE id=?').get(text.id) as any).block_type, 'paragraph');
});

test('A3 page frame crop and export choice round-trip independently of the card slot while preserving the shared asset', async (t) => {
  const f = await fixture(); t.after(f.close);
  f.db.prepare(`INSERT INTO canvas_assets(id,user_id,course_id,origin_note_id,kind,storage_kind,storage_key,filename,mime_type,byte_size,width,height,metadata)
    VALUES('a3-image',?,?,?,'image','local_file','synthetic.png','synthetic.png','image/png',1,1000,1400,'{}')`)
    .run(userId, courseId, noteId);
  const card = { assetId: 'a3-image', card: { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 } };
  f.db.prepare('UPDATE notes SET metadata=? WHERE id=?').run(JSON.stringify({ binding: { cover: card } }), noteId);
  const settings = addCover(f.db);
  settings.cover = { assetId: 'a3-image', page: { crop: { x: 10.125, y: 5.5, width: 75, height: 90 }, zoom: 1.3333333333333 } };
  settings.coverPage.exportIncluded = false;
  updateNoteBindingSettings(f.db, userId, noteId, settings);
  await f.reopen();
  assert.deepEqual(getNoteBindingSettings(f.db, userId, noteId).binding_settings, { ...settings, cover: { ...settings.cover, card: card.card } });
  const metadata = JSON.parse((f.db.prepare('SELECT metadata FROM notes WHERE id=?').get(noteId) as any).metadata);
  assert.equal(readNoteCover(metadata), null);
  f.db.prepare("UPDATE notes SET metadata='{}' WHERE id=?").run(noteId);
  const released = releaseAssetReference(f.db, userId, 'a3-image', '');
  assert.equal(released.released, false); assert.equal(released.remaining_references, 1);
  settings.coverPage.frameId = null;
  updateNoteBindingSettings(f.db, userId, noteId, settings, contentCollection);
  assert.ok(f.db.prepare("SELECT id FROM canvas_assets WHERE id='a3-image'").get());
});

test('A3 binding route returns the persisted collection and ordinary note edits drive title truth', async (t) => {
  const f = await fixture(); t.after(f.close);
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = userId; next(); }); app.use('/notes', noteRoutes); app.use(errorHandler);
  const server = await new Promise<Server>((done) => { const active = app.listen(0, '127.0.0.1', () => done(active)); });
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const request = async (path: string, body: unknown, method = 'PUT') => {
    const response = await fetch(`http://127.0.0.1:${address.port}/notes/${noteId}${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }); return { status: response.status, data: await response.json() as any };
  };
  const settings = createDefaultNoteBindingSettings(); settings.coverPage.frameId = 'cover';
  const added = await request('/binding-settings', { binding_settings: settings, collection: coverCollection });
  assert.equal(added.status, 200); assert.equal(added.data.canvas_persistence.pageFrameCollection.pageFrames[0].id, 'cover');
  const first = await request('/blocks', { block_type: 'note_ref', content_json: { field: 'title' } }, 'POST');
  const second = await request('/blocks', { block_type: 'note_ref', content_json: { field: 'title' } }, 'POST');
  assert.equal(first.status, 201); assert.equal(second.status, 200); assert.equal(second.data.id, first.data.id);
  assert.equal((await request('', { title: 'Written on cover' })).data.title, 'Written on cover');
  assert.deepEqual(JSON.parse((f.db.prepare('SELECT content_json FROM note_blocks WHERE id=?').get(first.data.id) as any).content_json), { field: 'title' });
  for (const id of ['image-one', 'image-two']) f.db.prepare(`INSERT INTO canvas_assets(id,user_id,course_id,origin_note_id,kind,storage_kind,storage_key,filename,mime_type,byte_size,width,height,metadata)
    VALUES(?,?,?,?,'image','local_file','synthetic.png','synthetic.png','image/png',1,1000,1400,'{}')`).run(id, userId, courseId, noteId);
  const card = { assetId: 'image-one', card: { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 } };
  assert.equal((await request('', { metadata: { binding: { cover: card } } })).status, 200);
  const cardSettings = upgradeNoteBindingSettings(getNoteBindingSettings(f.db, userId, noteId).binding_settings);
  const page = { crop: { x: 10, y: 0, width: 80, height: 100 }, zoom: 1.25 };
  const pageSaved = await request('/binding-settings', { binding_settings: { ...cardSettings, cover: { assetId: card.assetId, page } } });
  assert.equal(pageSaved.status, 200); assert.deepEqual(pageSaved.data.binding_settings.cover, { assetId: card.assetId, card: card.card, page });
  const reframedCard = { crop: { x: 10, y: 30, width: 80, height: 40 }, zoom: 1.25 };
  assert.equal((await request('', { metadata: { binding: { cover: { ...card, card: reframedCard } } } })).status, 200);
  assert.deepEqual(upgradeNoteBindingSettings(getNoteBindingSettings(f.db, userId, noteId).binding_settings).cover?.page, page);
  const pageReplaced = await request('/binding-settings', { binding_settings: {
    ...pageSaved.data.binding_settings, cover: { assetId: 'image-two', page, card: card.card },
  } });
  assert.equal(pageReplaced.status, 200);
  assert.deepEqual(pageReplaced.data.metadata.binding.cover, { assetId: 'image-two', card: reframedCard });
  assert.deepEqual(pageReplaced.data.binding_settings.cover, { assetId: 'image-two', card: reframedCard, page });
  const raw = f.db.prepare('SELECT metadata,binding_settings_json FROM notes WHERE id=?').get(noteId) as any;
  assert.equal(JSON.parse(raw.metadata).binding.cover, null);
  assert.equal(JSON.parse(raw.binding_settings_json).cover.assetId, 'image-two');
  assert.equal((f.db.prepare('SELECT COUNT(*) AS count FROM canvas_assets').get() as any).count, 2);
});

test('A3 legacy card cover is a usable v2 read view and canonical null never revives a legacy image', () => {
  const cover = { assetId: 'legacy-image', card: { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 } };
  const row = { binding_settings_json: null, metadata: JSON.stringify({ binding: { cover }, other: true }) };
  const before = JSON.stringify(row);
  assert.deepEqual(upgradeNoteBindingSettings(readNoteBindingView(row)).cover, cover);
  assert.equal(JSON.stringify(row), before);
  const cleared = { ...row, binding_settings_json: JSON.stringify(createDefaultNoteBindingSettings()) };
  assert.equal(projectNoteCoverMetadata(cleared).other, true);
  assert.equal(readNoteCover(projectNoteCoverMetadata(cleared)), null);
});
