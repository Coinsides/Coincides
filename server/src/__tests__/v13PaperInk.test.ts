import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import canvasRouter from '../routes/canvasObjects.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { getNoteCanvasPersistence, saveCanvasObject, savePageFrameCollection } from '../services/canvasObjects.js';
import { saveCanvasObjectSchema } from '../validators/index.js';
import { paperFreehandDataSchema } from '../validators/paperInk.js';

const userId = 'c4-ink-user';
const noteId = 'c4-ink-note';
const data = {
  points: [{ x: 0, y: 0 }, { x: 40, y: 30 }, { x: 80, y: 10 }],
  style: { color: '#1A1A1A', strokeWidth: 2.5 },
};
const placement = {
  placement_id: 'c4-stroke-placement', x: -72, y: -96, width: 80, height: 30,
  frame_id: 'c4-page-two', surface: 'formal_page', boundary_role: 'inside',
  coordinate_space: 'page_frame_local', rotation: 0,
};
const input = { kind: 'freehand', data, placement };

test('C4 freehand validator uses independent points/path/style vocabulary and requires one page', () => {
  assert.deepEqual(paperFreehandDataSchema.parse(data), data);
  assert.deepEqual(paperFreehandDataSchema.parse({ path: 'M0 0L80 30', style: { color: '#0066FF' } }),
    { path: 'M0 0L80 30', style: { color: '#0066FF' } });
  assert.equal(paperFreehandDataSchema.safeParse({ style: {} }).success, false);
  assert.equal(paperFreehandDataSchema.safeParse({ points: [] }).success, false);
  assert.equal(saveCanvasObjectSchema.safeParse(input).success, true);
  assert.equal(saveCanvasObjectSchema.safeParse({ ...input, placement: { ...placement, frame_id: undefined } }).success, false);
  assert.equal(saveCanvasObjectSchema.safeParse({ ...input, placement: { ...placement, coordinate_space: 'canvas_world' } }).success, false);
});

test('C4 fixture: paper ink create/read/reopen/erase/restore persists only in canvas_objects; retirement doors remain closed', async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'coincides-paper-ink-'));
  const fixtureDb = join(fixtureRoot, 'synthetic.db');
  let db = await initDb(fixtureDb);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = userId; next(); });
  app.use('/canvas-objects', canvasRouter);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((done) => server.once('listening', done));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/canvas-objects/by-note/${noteId}`;
    db.exec(`INSERT INTO users(id,email,password_hash,name) VALUES('${userId}','c4@example.test','fixture','C4');
      INSERT INTO courses(id,user_id,name) VALUES('c4-ink-course','${userId}','C4');
      INSERT INTO notes(id,user_id,course_id,title) VALUES('${noteId}','${userId}','c4-ink-course','Synthetic paper ink');
      INSERT INTO database_meta(key,value) VALUES('coordinate_contract','v2');`);
    const frames = [
      { id: 'c4-page-one', x: 100, y: 160, width: 794, height: 1123 },
      { id: 'c4-page-two', x: 100, y: 1319, width: 794, height: 1123 },
    ].map((frame) => ({ ...frame, contentInset: { top: 96, right: 72, bottom: 96, left: 72 } }));
    savePageFrameCollection(db, userId, noteId, { pageFrames: frames, primaryFrameId: frames[0].id });
    const put = (body: unknown, id = 'c4-stroke') => fetch(`${url}/objects/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const getInk = () => getNoteCanvasPersistence(db, userId, noteId).canvasObjects.filter((object) => object.kind === 'freehand');
    const createResponse = await put(input);
    assert.equal(createResponse.status, 200);
    const created = await createResponse.json() as any;
    assert.equal(created.canvasObject.kind, 'freehand');
    assert.equal(created.canvasObject.backing, 'none');
    assert.deepEqual(created.canvasObject.metadata.freehand, data);
    assert.equal(created.placements.length, 1);
    assert.equal(created.placement.frame_id, 'c4-page-two');
    assert.equal(created.placement.metadata.layout_policy.coordinate_space, 'page_frame_local');
    const objectRow = db.prepare("SELECT kind,metadata FROM canvas_objects WHERE id='c4-stroke'").get() as any;
    assert.equal(objectRow.kind, 'freehand');
    assert.deepEqual(JSON.parse(objectRow.metadata).freehand, data);
    assert.equal((db.prepare('SELECT count(*) AS count FROM board_visuals').get() as any).count, 0);
    assert.equal((db.prepare("SELECT count(*) AS count FROM content_mounts WHERE object_id='c4-stroke'").get() as any).count, 0);

    closeDb();
    db = await initDb(fixtureDb);
    assert.deepEqual(getInk()[0].metadata.freehand, data);
    const reloaded = await (await fetch(url)).json() as any;
    assert.deepEqual(reloaded.canvasObjects.find((object: any) => object.object_id === 'c4-stroke').metadata.freehand, data);

    // A replacement placement remains one stroke on one page.
    const replaced = await put({ ...input, placement: { ...placement, placement_id: 'c4-replacement-placement' } });
    assert.equal(replaced.status, 200);
    assert.equal((db.prepare("SELECT count(*) AS count FROM canvas_placements WHERE object_id='c4-stroke'").get() as any).count, 1);

    const before = db.prepare('SELECT total_changes() AS count').get();
    for (const fields of [
      { surface: 'canvas_workspace', error: 'canvas_workspace_retired' },
      { boundary_role: 'crossing', error: 'canvas_crossing_retired' },
    ]) {
      const { error, ...change } = fields;
      const retiredInput = { ...input, placement: { ...placement, ...change } };
      const response = await put(retiredInput, 'c4-retired-attempt');
      assert.equal(response.status, 400);
      assert.equal((await response.json() as any).error, error);
      assert.throws(() => saveCanvasObject(db, userId, noteId, 'c4-retired-attempt', retiredInput), { message: error });
      assert.deepEqual(db.prepare('SELECT total_changes() AS count').get(), before);
    }
    for (const change of [{ x: -73 }, { y: -97 }, { x: 715 }, { y: 1000 }]) {
      assert.throws(() => saveCanvasObject(db, userId, noteId, 'c4-outside', {
        ...input, placement: { ...placement, ...change },
      }), /bounds must stay inside its page/);
    }
    assert.throws(() => saveCanvasObject(db, userId, noteId, 'c4-points-outside', {
      ...input, data: { points: [{ x: 81, y: 0 }] },
    }), /points must stay inside its bounds/);
    assert.throws(() => saveCanvasObject(db, userId, noteId, 'c4-missing-page', {
      ...input, placement: { ...placement, frame_id: 'missing-page' },
    }), /page not found/);
    assert.deepEqual(db.prepare('SELECT total_changes() AS count').get(), before);
    db.exec("UPDATE database_meta SET value='v1' WHERE key='coordinate_contract'");
    assert.throws(() => saveCanvasObject(db, userId, noteId, 'c4-v1', input), /coordinate contract v2/);
    db.exec("UPDATE database_meta SET value='v2' WHERE key='coordinate_contract'");

    // Existing page collection saves preserve ink placement and point truth.
    savePageFrameCollection(db, userId, noteId, { pageFrames: [frames[1], frames[0]], primaryFrameId: frames[1].id });
    assert.deepEqual(getInk()[0].metadata.freehand, data);
    assert.equal((db.prepare("SELECT frame_id FROM canvas_placements WHERE object_id='c4-stroke'").get() as any).frame_id, frames[1].id);
    const deleted = await fetch(`${url}/objects/c4-stroke`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json() as any).deleted, true);
    closeDb();
    db = await initDb(fixtureDb);
    assert.equal(getInk().length, 0);
    assert.equal((db.prepare("SELECT count(*) AS count FROM canvas_placements WHERE object_id='c4-stroke'").get() as any).count, 0);
    assert.equal((await put(input)).status, 200);
    assert.deepEqual(getInk()[0].metadata.freehand, data);
    console.log('C4_SERVER_FIXTURE_PASS create_read_reopen=true page_two_unique=true whole_erase_reopen=true restore=true retired_no_writes=true board_rows=0 db=synthetic-temp');
  } finally {
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
    closeDb();
    const resolvedRoot = resolve(fixtureRoot);
    assert.ok(resolvedRoot.startsWith(resolve(tmpdir()) + sep));
    assert.ok(resolvedRoot.split(sep).at(-1)?.startsWith('coincides-paper-ink-'));
    rmSync(resolvedRoot, { recursive: true, force: true });
  }
});
