import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import type Database from 'better-sqlite3';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createBoard } from '../services/boards.js';
import { getNoteCanvasPersistence } from '../services/canvasObjects.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'ceremony-user';
const PROJECT = '9dbd0c0d-0ad7-4fcb-9827-7f749d562b99';
const collection = {
  primaryFrameId: 'page-frame-1', selectedFrameId: 'page-frame-1',
  primaryStackId: 'stack-1', selectedStackId: 'stack-1',
  pageStacks: [{ id: 'stack-1', frameIds: ['page-frame-1'] }],
  pageFrames: [{ id: 'page-frame-1', x: 0, y: 0, width: 800, height: 1100,
    contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true }],
};
const tables = ['courses', 'notes', 'operation_batches', 'canvas_page_collections', 'canvas_objects',
  'canvas_placements', 'page_frame_extensions', 'events', 'boards', 'board_members'];
function snapshot(db: Database.Database) {
  return Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
}

async function withCeremony(run: (db: Database.Database, post: (input: unknown, status?: number) => Promise<any>) => Promise<void>) {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?, 'ceremony@example.test', 'synthetic', 'Ceremony')").run(USER);
    db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(PROJECT, USER, 'Existing project');
    const { board } = db.transaction(() => createBoard(db, USER, { title: 'Ceremony', purpose: { title: 'Assembly' } }))();
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    await run(db, async (input, status = 201) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/boards/${board.id}/ceremony-note`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      const body = await response.json() as any;
      assert.equal(response.status, status, JSON.stringify(body));
      return body;
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

for (const inline of [false, true]) {
  test(`ceremony ${inline ? 'inline' : 'existing'} project: late frame failure rolls back every row and retry succeeds`, async () => {
    await withCeremony(async (db, post) => {
      const input = { ...(inline ? { project: { name: 'Inline project' } } : { project_id: PROJECT }), title: 'Retry note', collection };
      const before = snapshot(db);
      // Fail after the collection, object and placement inserts have actually run.
      db.exec(`CREATE TRIGGER ceremony_frame_failure BEFORE INSERT ON page_frame_extensions
        BEGIN SELECT RAISE(ABORT, 'Synthetic ceremony frame failure'); END`);
      const failed = await post(input, 500);
      assert.equal(typeof failed.error, 'string');
      assert.ok(failed.error.length > 0);
      assert.deepEqual(snapshot(db), before);
      db.exec('DROP TRIGGER ceremony_frame_failure');
      const result = await post(input);
      assert.equal(result.note.course_id, result.project.id);
      assert.equal(result.project.name, inline ? 'Inline project' : 'Existing project');
      assert.equal(result.note.title, 'Retry note');
      assert.equal(result.note.page_format, 'flow');
      assert.equal(result.collection.pageFrames.length, 1);
      assert.deepEqual(JSON.parse(JSON.stringify(getNoteCanvasPersistence(db, USER, result.note.id).pageFrameCollection)), result.collection);
      const after = snapshot(db);
      for (const table of tables) {
        const added = ['notes', 'operation_batches', 'canvas_page_collections', 'canvas_objects', 'canvas_placements', 'page_frame_extensions'].includes(table)
          || (inline && table === 'courses') ? 1 : 0;
        assert.equal(after[table].length, before[table].length + added, table);
      }
      assert.equal((after.operation_batches[0] as any).label, 'Create note: Retry note');
      assert.equal((after.operation_batches[0] as any).id, result.note.operation_batch_id);
    });
  });
}

test('ceremony creates ten durable notes: five existing projects and five inline projects', async () => {
  await withCeremony(async (db, post) => {
    const noteIds = new Set<string>();
    const projectIds = new Set<string>();
    for (const inline of [false, true]) {
      for (let index = 1; index <= 5; index += 1) {
        const title = `${inline ? 'Inline' : 'Existing'} note ${index}`;
        const result = await post({ ...(inline ? { project: { name: `Inline project ${index}` } } : { project_id: PROJECT }), title, collection });
        noteIds.add(result.note.id); projectIds.add(result.project.id);
        const reopened = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.note.id) as any;
        assert.equal(reopened.title, title);
        assert.equal(reopened.status, 'active');
        assert.equal(reopened.course_id, result.project.id);
        const frames = getNoteCanvasPersistence(db, USER, reopened.id).pageFrameCollection!;
        assert.deepEqual(JSON.parse(JSON.stringify(frames)), result.collection);
        assert.equal(frames.pageFrames[0].id, frames.primaryFrameId);
      }
    }
    assert.equal(noteIds.size, 10);
    assert.equal(projectIds.size, 6);
    const rows = snapshot(db);
    for (const table of ['notes', 'operation_batches', 'canvas_page_collections', 'canvas_objects', 'canvas_placements', 'page_frame_extensions']) {
      assert.equal(rows[table].length, 10, table);
    }
    assert.equal(rows.events.length, 0);
    assert.equal(rows.board_members.length, 0);
  });
});
