import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { Server } from 'node:http';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import { NOTE_BLOCK_TEMPLATES as serverTemplates, inferNoteBlockTemplateMetadata } from '../lib/noteBlockTemplates.js';
import { createNoteBlockSchema, noteBlockTypeSchema } from '../validators/index.js';
import { createClientNoteBlock, discardClientNoteBlockCreate } from '../services/noteBlockLifecycle.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { restoreNoteBlockForCanvasLifecycle } from '../services/canvasObjects.js';
import { finalizeCanvasAssetCleanup, releaseAssetReference, releaseCourseCanvasAssets, releaseNoteCanvasAssets } from '../services/canvasAssets.js';
import { drainManagedFileCleanupJobs } from '../services/managedFileCleanup.js';
import { createBoard } from '../services/boards.js';

async function fixture() {
  // Every database is explicitly in memory; the runner must select an isolated
  // asset root. No app bootstrap, environment loader or user data is used.
  assert.ok(process.env.CANVAS_ASSET_DIR, 'Set CANVAS_ASSET_DIR to an isolated test directory');
  const assetRoot = resolve(process.env.CANVAS_ASSET_DIR!);
  const db = await initDb(':memory:');
  const userId = randomUUID();
  const courseId = randomUUID();
  const noteId = randomUUID();
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(userId, `${userId}@example.invalid`, 'synthetic', 'Media test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Media project');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(noteId, userId, courseId, 'Media note');
  const seedAsset = () => {
    const assetId = randomUUID();
    const storageKey = `${userId}/${assetId}.png`;
    const path = join(assetRoot, storageKey);
    mkdirSync(join(assetRoot, userId), { recursive: true });
    writeFileSync(path, Buffer.from('isolated-media-fixture'));
    db.prepare(`INSERT INTO canvas_assets(id,user_id,course_id,origin_note_id,kind,storage_kind,
      storage_key,filename,mime_type,byte_size,width,height)
      VALUES(?,?,?,?,'image','local_file',?,'fixture.png','image/png',22,800,80)`)
      .run(assetId, userId, courseId, noteId, storageKey);
    return { assetId, path };
  };
  const metadata = (assetId: string) => ({ media: { asset_id: assetId, naturalWidth: 800, naturalHeight: 80, alt: 'Wide image' } });
  const create = (assetId: string, targetNoteId = noteId, targetCourseId = courseId) => {
    const key = randomUUID();
    const result = createClientNoteBlock(db, userId, targetNoteId, targetCourseId, {
      client_create_key: key, block_type: 'media', metadata: metadata(assetId),
    });
    assert.equal(result.status, 'applied');
    if (result.status !== 'applied') throw new Error('Expected created media block');
    return { blockId: String(result.block.id), key, block: result.block };
  };
  return { db, userId, courseId, noteId, assetRoot, seedAsset, metadata, create };
}

test('media template registries and schema agree; an asset identity and positive natural dimensions are required', async () => {
  // Read the live source; a build's cached project-reference declarations are
  // deliberately irrelevant to the registry alignment check.
  const { NOTE_BLOCK_TEMPLATES: sharedTemplates } = await import(new URL('../../../shared/types/index.ts', import.meta.url).href);
  const shared = sharedTemplates.find((entry: { legacy_block_type: string }) => entry.legacy_block_type === 'media');
  const server = serverTemplates.find((entry) => entry.legacy_block_type === 'media');
  assert.deepEqual(shared, server);
  assert.equal(shared?.system_type, 'media');
  assert.equal(noteBlockTypeSchema.parse('media'), 'media');
  assert.equal(inferNoteBlockTemplateMetadata('media').template_id, 'media.image');
  const media = { asset_id: randomUUID(), naturalWidth: 800, naturalHeight: 80 };
  assert.equal(createNoteBlockSchema.safeParse({ block_type: 'media', metadata: { media } }).success, true);
  for (const invalid of [undefined, {}, { naturalWidth: 800, naturalHeight: 80 },
    { ...media, asset_id: 'missing' }, { ...media, naturalWidth: 0 }, { ...media, naturalHeight: -1 }]) {
    assert.equal(createNoteBlockSchema.safeParse({ block_type: 'media', metadata: { media: invalid } }).success, false);
  }
});

test('media create stores metadata in a NoteBlock, replays its receipt, and discard releases the last asset', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    const block = f.create(asset.assetId);
    assert.equal(JSON.parse(String(block.block.metadata)).system_type, 'media');
    assert.equal(JSON.parse(String(block.block.metadata)).media.asset_id, asset.assetId);
    const repeated = createClientNoteBlock(f.db, f.userId, f.noteId, f.courseId, {
      client_create_key: block.key, block_type: 'media', metadata: f.metadata(asset.assetId),
    });
    assert.equal(repeated.status, 'applied');
    assert.equal(repeated.created, false);
    assert.deepEqual(f.db.prepare('SELECT COUNT(*) AS count FROM image_object_extensions').get(), { count: 0 });
    assert.equal(discardClientNoteBlockCreate(f.db, f.userId, f.noteId, f.courseId, block.key).discarded, true);
    assert.equal(f.db.prepare('SELECT id FROM canvas_assets WHERE id = ?').get(asset.assetId), undefined);
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('media delete keeps another block reference, restores while shared, and releases the final blob', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    const first = f.create(asset.assetId);
    const second = f.create(asset.assetId);
    updateNoteBlockContent(f.db, f.userId, first.blockId, { status: 'trashed' });
    assert.equal(existsSync(asset.path), true);
    assert.equal(restoreNoteBlockForCanvasLifecycle(f.db, f.userId, first.blockId).status, 'active');
    updateNoteBlockContent(f.db, f.userId, first.blockId, { status: 'trashed' });
    updateNoteBlockContent(f.db, f.userId, second.blockId, { status: 'trashed' });
    assert.equal(existsSync(asset.path), false);
    assert.throws(() => restoreNoteBlockForCanvasLifecycle(f.db, f.userId, first.blockId), /Paste the image again/);
    assert.throws(() => updateNoteBlockContent(f.db, f.userId, first.blockId, { status: 'active', title: 'Restore' }), /Paste the image again/);
    assert.deepEqual(f.db.prepare('SELECT status FROM note_blocks WHERE id = ?').get(first.blockId), { status: 'trashed' });
  } finally { closeDb(); }
});

test('replacing media metadata releases the previous asset and malformed changes leave the reference intact', async () => {
  const f = await fixture();
  try {
    const first = f.seedAsset();
    const next = f.seedAsset();
    const block = f.create(first.assetId);
    assert.throws(() => updateNoteBlockContent(f.db, f.userId, block.blockId, { metadata: { media: {} } }), /natural dimensions/);
    assert.equal(existsSync(first.path), true);
    updateNoteBlockContent(f.db, f.userId, block.blockId, { metadata: f.metadata(next.assetId) });
    assert.equal(existsSync(first.path), false);
    assert.equal(existsSync(next.path), true);
    updateNoteBlockContent(f.db, f.userId, block.blockId, { block_type: 'paragraph' });
    assert.equal(existsSync(next.path), false);
  } finally { closeDb(); }
});

test('archived blocks and trashed Notes retain media references until their block or container is removed', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    const block = f.create(asset.assetId);
    updateNoteBlockContent(f.db, f.userId, block.blockId, { status: 'archived' });
    f.db.prepare("UPDATE notes SET status = 'trashed' WHERE id = ?").run(f.noteId);
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 1);
    assert.equal(existsSync(asset.path), true);
    const tasks = f.db.transaction(() => releaseNoteCanvasAssets(f.db, f.userId, f.noteId))();
    assert.equal(tasks.length, 1);
    finalizeCanvasAssetCleanup(f.db, tasks);
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('Note cleanup preserves a shared block placement and reclaims an upload that never acquired a block', async () => {
  const f = await fixture();
  try {
    const shared = f.seedAsset();
    const orphan = f.seedAsset();
    const block = f.create(shared.assetId);
    const otherNote = randomUUID();
    f.db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(otherNote, f.userId, f.courseId, 'Other');
    f.db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,0)')
      .run(randomUUID(), otherNote, block.blockId);
    const tasks = f.db.transaction(() => releaseNoteCanvasAssets(f.db, f.userId, f.noteId))();
    finalizeCanvasAssetCleanup(f.db, tasks);
    assert.equal(existsSync(shared.path), true);
    assert.equal(existsSync(orphan.path), false);
    assert.equal(JSON.parse(String(f.db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').pluck().get(block.blockId))).media.asset_id, shared.assetId);
  } finally { closeDb(); }
});

test('Project cleanup counts media references across Projects and rolls back without unlinking blobs', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    f.create(asset.assetId);
    const otherCourse = randomUUID();
    const otherNote = randomUUID();
    f.db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(otherCourse, f.userId, 'Other');
    f.db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(otherNote, f.userId, otherCourse, 'Other');
    const survivor = f.create(asset.assetId, otherNote, otherCourse);
    assert.throws(() => f.db.transaction(() => {
      releaseCourseCanvasAssets(f.db, f.userId, f.courseId);
      throw new Error('rollback fixture');
    })(), /rollback fixture/);
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 2);
    const decision = f.db.transaction(() => releaseCourseCanvasAssets(f.db, f.userId, f.courseId))();
    assert.equal(decision.checked_references, 1);
    assert.equal(decision.cleanup_tasks.length, 0);
    assert.equal(existsSync(asset.path), true);
    updateNoteBlockContent(f.db, f.userId, survivor.blockId, { status: 'trashed' });
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('caller-owned update rollback preserves assets; committed cleanup uses the existing queue', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    const block = f.create(asset.assetId);
    assert.throws(() => f.db.transaction(() => {
      updateNoteBlockContent(f.db, f.userId, block.blockId, { status: 'trashed' });
      assert.equal(existsSync(asset.path), true);
      throw new Error('rollback fixture');
    })(), /rollback fixture/);
    assert.deepEqual(f.db.prepare('SELECT COUNT(*) AS count FROM managed_file_cleanup_jobs').get(), { count: 0 });
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 1);
    f.db.transaction(() => updateNoteBlockContent(f.db, f.userId, block.blockId, { status: 'trashed' }))();
    assert.equal(existsSync(asset.path), true);
    assert.deepEqual(drainManagedFileCleanupJobs(f.db), { completed: 1, pending: 0 });
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('media reclamation includes the existing image-extension and Board visual references', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    const block = f.create(asset.assetId);
    const objectId = randomUUID();
    f.db.prepare(`INSERT INTO canvas_objects(id,user_id,course_id,note_id,canvas_id,kind,backing,object_class)
      VALUES(?,?,?,?,?,'image','asset','media')`).run(objectId, f.userId, f.courseId, f.noteId, f.noteId);
    f.db.prepare(`INSERT INTO image_object_extensions(object_id,user_id,course_id,note_id,canvas_id,asset_id)
      VALUES(?,?,?,?,?,?)`).run(objectId, f.userId, f.courseId, f.noteId, f.noteId, asset.assetId);
    const { board } = f.db.transaction(() => createBoard(f.db, f.userId, { title: 'Media board', purpose: { title: 'Reference' } }))();
    const visualId = randomUUID();
    f.db.prepare(`INSERT INTO board_visuals(id,board_id,visual_kind,data,created_at,updated_at)
      VALUES(?,?,'image',?,datetime('now'),datetime('now'))`).run(visualId, board.id,
      JSON.stringify({ tray_source: { extensions: { image: { asset_id: asset.assetId } } } }));
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 3);
    updateNoteBlockContent(f.db, f.userId, block.blockId, { status: 'trashed' });
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 2);
    f.db.prepare('DELETE FROM image_object_extensions WHERE object_id = ?').run(objectId);
    assert.equal(releaseAssetReference(f.db, f.userId, asset.assetId, '').remaining_references, 1);
    f.db.prepare('DELETE FROM board_visuals WHERE id = ?').run(visualId);
    const decision = releaseAssetReference(f.db, f.userId, asset.assetId, '');
    assert.ok(decision.cleanup_task);
    finalizeCanvasAssetCleanup(f.db, [decision.cleanup_task]);
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('media physical cleanup failure leaves a retryable managed job after the database release', async () => {
  const f = await fixture();
  try {
    const asset = f.seedAsset();
    f.create(asset.assetId);
    const tasks = f.db.transaction(() => releaseCourseCanvasAssets(f.db, f.userId, f.courseId))().cleanup_tasks;
    assert.equal(tasks.length, 1);
    const cleanup = finalizeCanvasAssetCleanup(f.db, tasks, { unlinkFile: () => { throw new Error('Synthetic temporary IO failure'); } });
    assert.equal(cleanup[0].completed, false);
    assert.equal(existsSync(asset.path), true);
    assert.equal(f.db.prepare('SELECT id FROM canvas_assets WHERE id = ?').get(asset.assetId), undefined);
    assert.deepEqual(drainManagedFileCleanupJobs(f.db), { completed: 1, pending: 0 });
    assert.equal(existsSync(asset.path), false);
  } finally { closeDb(); }
});

test('ordinary HTTP media create, reopen and delete use NoteBlock routes and reclaim the blob', async () => {
  const f = await fixture();
  let server: Server | undefined;
  try {
    const asset = f.seedAsset();
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = f.userId; next(); });
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use(errorHandler);
    server = await new Promise<Server>((resolveServer) => {
      const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const request = async (method: string, path: string, body?: unknown) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
        method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      assert.ok(response.ok, `${method} ${path}: ${response.status}`);
      return response.json() as Promise<any>;
    };
    const block = await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'media', metadata: f.metadata(asset.assetId) });
    const reopened = await request('GET', `/notes/${f.noteId}/blocks`);
    assert.equal(reopened[0].id, block.id);
    assert.equal(reopened[0].metadata.media.asset_id, asset.assetId);
    await request('DELETE', `/note-blocks/${block.id}`);
    assert.deepEqual(await request('GET', `/notes/${f.noteId}/blocks`), []);
    assert.equal(existsSync(asset.path), false);
    assert.equal(f.db.prepare('SELECT id FROM canvas_assets WHERE id = ?').get(asset.assetId), undefined);
  } finally {
    if (server) await new Promise<void>((resolveServer, reject) => server!.close((error) => error ? reject(error) : resolveServer()));
    closeDb();
  }
});
