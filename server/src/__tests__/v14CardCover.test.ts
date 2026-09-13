import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import test, { after } from 'node:test';
import express from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { noteCoverSchema } from '../validators/noteCover.js';
import { createNoteSchema, updateNoteSchema } from '../validators/index.js';

// Select an isolated asset directory before importing the storage service.
// Neither application startup nor an environment-file loader is involved.
const temporaryRoot = resolve(tmpdir());
const directory = mkdtempSync(join(temporaryRoot, 'coincides-card-cover-'));
process.env.CANVAS_ASSET_DIR = join(directory, 'assets');
const { initDb, closeDb } = await import('../db/init.js');
const { default: notesRouter } = await import('../routes/notes.js');
const { default: assetsRouter } = await import('../routes/canvasAssets.js');
const { releaseAssetReference, releaseNoteCanvasAssets, releaseCourseCanvasAssets } = await import('../services/canvasAssets.js');
const userId = 'cover-user';
const courseId = '14000000-0000-4000-8000-000000000001';
const noteId = '14000000-0000-4000-8000-000000000002';
const original = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
let databaseNumber = 0;

after(() => {
  closeDb();
  assert.ok(resolve(directory).startsWith(`${temporaryRoot}${sep}coincides-card-cover-`));
  rmSync(directory, { recursive: true, force: true });
});

async function fixture() {
  const dbPath = join(directory, `cover-${++databaseNumber}.sqlite`);
  let db = await initDb(dbPath);
  db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,?,'synthetic','Cover')")
    .run(userId, 'cover@example.test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Synthetic cover project');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title,metadata) VALUES(?,?,?,?,?)')
    .run(noteId, userId, courseId, 'Synthetic cover note', JSON.stringify({
      typography: { fontFamily: 'serif' }, binding: { header: { title: 'Retain header' } },
    }));
  const app = express();
  app.use(express.json());
  // Exercise only the post-auth product routes with an explicitly synthetic user.
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/notes', notesRouter);
  app.use('/api/canvas-assets', assetsRouter);
  app.use(errorHandler);
  const server = await new Promise<Server>((resolveServer) => {
    const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/api`;
  return {
    get db() { return db; },
    async request(method: string, path: string, body?: unknown, status = 200) {
      const response = await fetch(`${url}/${path}`, { method,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    },
    async upload(source?: string) {
      const form = new FormData();
      form.set('file', new Blob([original], { type: 'image/png' }), 'Original cover.png');
      form.set('note_id', noteId);
      form.set('width', '1'); form.set('height', '1');
      if (source) form.set('source', source);
      const response = await fetch(`${url}/canvas-assets/images`, { method: 'POST', body: form });
      const result = await response.json() as any;
      assert.equal(response.status, 201, JSON.stringify(result));
      return result;
    },
    async blob(assetId: string) {
      const response = await fetch(`${url}/canvas-assets/${assetId}/blob`);
      assert.equal(response.status, 200);
      return Buffer.from(await response.arrayBuffer());
    },
    async reopen() { closeDb(); db = await initDb(dbPath); },
    async close() {
      await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
      closeDb();
    },
  };
}

function coverFor(assetId: string) {
  return { assetId, card: { crop: { x: 12.125, y: 23.75, width: 64.0625, height: 32.03125 }, zoom: 1.5609756097560976 } };
}

test('card cover uploads through the existing route and exactly replays crop percentages after reopen and list reads', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const asset = await f.upload('note_cover_upload');
  assert.equal(asset.metadata.source, 'note_cover_upload');
  assert.deepEqual(await f.blob(asset.asset_id), original);
  const cover = coverFor(asset.asset_id);
  const before = await f.request('GET', `notes/${noteId}`);
  const metadata = { ...before.metadata, binding: { ...before.metadata.binding, cover } };
  assert.deepEqual((await f.request('PUT', `notes/${noteId}`, { metadata })).metadata, metadata);
  await f.reopen();
  const read = await f.request('GET', `notes/${noteId}`);
  assert.equal(JSON.stringify(read.metadata.binding.cover), JSON.stringify(cover));
  assert.deepEqual((await f.request('GET', `notes?course_id=${courseId}`))[0].metadata, metadata);
  assert.deepEqual(await f.blob(asset.asset_id), original);
  assert.deepEqual(readFileSync(join(process.env.CANVAS_ASSET_DIR!, asset.storage_key)), original);
});

test('reframing, replacing and Remove change only the binding slot while preserving both original assets', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const first = await f.upload('note_cover_upload');
  const second = await f.upload('note_cover_upload');
  const legacy = await f.upload();
  assert.equal(legacy.metadata.source, 'canvas_image_upload');
  const originalRows = f.db.prepare('SELECT * FROM canvas_assets ORDER BY id').all();
  const firstCover = coverFor(first.asset_id);
  await f.request('PUT', `notes/${noteId}`, { metadata: { binding: { cover: firstCover } } });
  const reframed = { ...firstCover, card: { crop: { x: 25, y: 25, width: 50, height: 25 }, zoom: 2 } };
  await f.request('PUT', `notes/${noteId}`, { metadata: { binding: { cover: reframed } } });
  assert.deepEqual((await f.request('GET', `notes/${noteId}`)).metadata.binding.cover, reframed);
  await f.request('PUT', `notes/${noteId}`, { metadata: { binding: { cover: coverFor(second.asset_id) } } });
  // Ordinary metadata callers omit binding; they must retain the current cover.
  const otherWrite = await f.request('PUT', `notes/${noteId}`, { metadata: { typography: { fontFamily: 'mono' } } });
  assert.equal(otherWrite.metadata.binding.cover.assetId, second.asset_id);
  assert.deepEqual(otherWrite.metadata.binding.header, { title: 'Retain header' });
  const removed = await f.request('PUT', `notes/${noteId}`, {
    metadata: { ...otherWrite.metadata, binding: { cover: null } },
  });
  assert.equal(removed.metadata.binding.cover, null);
  assert.deepEqual(removed.metadata.binding.header, { title: 'Retain header' });
  assert.deepEqual(removed.metadata.typography, { fontFamily: 'mono' });
  await f.reopen();
  assert.equal((await f.request('GET', `notes/${noteId}`)).metadata.binding.cover, null);
  assert.deepEqual(f.db.prepare('SELECT * FROM canvas_assets ORDER BY id').all(), originalRows);
  for (const asset of [first, second]) assert.deepEqual(await f.blob(asset.asset_id), original);
});

test('cover metadata validates percentage geometry at create and update without rounding saved parameters', () => {
  const cover = coverFor('synthetic-asset');
  const metadata = { binding: { cover, header: { title: 'Sibling' } }, typography: { fontFamily: 'serif' } };
  assert.deepEqual(createNoteSchema.parse({ course_id: courseId, title: 'Geometry', metadata }).metadata, metadata);
  assert.deepEqual(updateNoteSchema.parse({ metadata }).metadata, metadata);
  assert.deepEqual(updateNoteSchema.parse({ metadata: { binding: { cover: null } } }).metadata, { binding: { cover: null } });
  for (const card of [
    { ...cover.card, zoom: 0.9 },
    { ...cover.card, zoom: Number.NaN },
    { ...cover.card, crop: { ...cover.card.crop, width: 0 } },
    { ...cover.card, crop: { ...cover.card.crop, x: -1 } },
    { ...cover.card, crop: { ...cover.card.crop, x: 80 } },
    { ...cover.card, crop: { ...cover.card.crop, y: 90 } },
  ]) {
    assert.equal(noteCoverSchema.safeParse({ ...cover, card }).success, false);
    assert.equal(updateNoteSchema.safeParse({ metadata: { binding: { cover: { ...cover, card } } } }).success, false);
  }
});

test('existing asset release retains a cover reference and still cleans up a deleted Note or Project', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const asset = await f.upload('note_cover_upload');
  await f.request('PUT', `notes/${noteId}`, { metadata: { binding: { cover: coverFor(asset.asset_id) } } });
  assert.deepEqual(releaseAssetReference(f.db, userId, asset.asset_id, ''), {
    asset_id: asset.asset_id, released: false, remaining_references: 1, cleanup_task: null,
  });
  assert.deepEqual(await f.blob(asset.asset_id), original);
  const secondNoteId = 'shared-cover-note';
  f.db.prepare('INSERT INTO notes(id,user_id,course_id,title,metadata) VALUES(?,?,?,?,?)')
    .run(secondNoteId, userId, courseId, 'Shared cover', JSON.stringify({ binding: { cover: coverFor(asset.asset_id) } }));
  assert.equal(releaseNoteCanvasAssets(f.db, userId, noteId).length, 0);
  assert.deepEqual(await f.blob(asset.asset_id), original);
  const noteTasks = releaseNoteCanvasAssets(f.db, userId, secondNoteId);
  assert.equal(noteTasks.length, 1);
  assert.equal(f.db.prepare('SELECT id FROM canvas_assets WHERE id = ?').get(asset.asset_id), undefined);
  const next = await f.upload('note_cover_upload');
  await f.request('PUT', `notes/${noteId}`, { metadata: { binding: { cover: coverFor(next.asset_id) } } });
  const courseResult = releaseCourseCanvasAssets(f.db, userId, courseId);
  assert.equal(courseResult.released, 1);
  assert.equal(courseResult.cleanup_tasks.length, 1);
});
