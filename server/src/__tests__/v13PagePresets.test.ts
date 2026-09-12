import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import type Database from 'better-sqlite3';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import noteRoutes from '../routes/notes.js';
import { createBoard } from '../services/boards.js';

const USER = '11111111-1111-4111-8111-111111111111';
const PROJECT = '22222222-2222-4222-8222-222222222222';
const PRESETS = ['a4_portrait', 'letter_portrait', 'screen_note'] as const;
const collection = {
  primaryFrameId: 'page-1', selectedFrameId: 'page-1',
  primaryStackId: 'stack-1', selectedStackId: 'stack-1',
  pageStacks: [{ id: 'stack-1', frameIds: ['page-1'] }],
  pageFrames: [{ id: 'page-1', x: 0, y: 0, width: 800, height: 1100,
    contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true }],
};

interface Fixture {
  db: Database.Database;
  boardId: string;
  request: (method: string, path: string, input?: unknown, status?: number) => Promise<any>;
}

async function withPresets(run: (fixture: Fixture) => Promise<void>) {
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?, 'page-presets@example.test', 'synthetic', 'Page presets')").run(USER);
    db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(PROJECT, USER, 'Page presets');
    const { board } = db.transaction(() => createBoard(db, USER, { title: 'Page presets', purpose: { title: 'Writing' } }))();
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/notes', noteRoutes);
    app.use('/api/boards', createBoardRouter(() => db));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    await run({
      db, boardId: board.id,
      request: async (method, path, input, status = 200) => {
        const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
          method, headers: { 'Content-Type': 'application/json' },
          ...(input === undefined ? {} : { body: JSON.stringify(input) }),
        });
        const body = await response.json() as any;
        assert.equal(response.status, status, JSON.stringify(body));
        return body;
      },
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    closeDb();
  }
}

test('project and board creation persist all three presets in notes.page_format and retain them on reload', async () => {
  await withPresets(async ({ db, boardId, request }) => {
    for (const page_format of PRESETS) {
      for (const entry of ['project', 'board', 'board-inline'] as const) {
        const title = `${entry} ${page_format}`;
        const created = entry === 'project'
          ? await request('POST', '/notes', { course_id: PROJECT, title, page_format }, 201)
          : (await request('POST', `/boards/${boardId}/ceremony-note`, {
            ...(entry === 'board' ? { project_id: PROJECT } : { project: { name: title } }),
            title, page_format, collection,
          }, 201)).note;
        assert.equal(created.page_format, page_format);
        const stored = db.prepare('SELECT page_format, metadata FROM notes WHERE id = ?').get(created.id) as any;
        assert.equal(stored.page_format, page_format);
        assert.deepEqual(JSON.parse(stored.metadata), {});
        const reopened = await request('GET', `/notes/${created.id}`);
        assert.equal(reopened.page_format, page_format);
        assert.equal(reopened.title, title);
      }
    }
  });
});

test('creation-only presets cannot change after creation while note content fields remain editable', async () => {
  await withPresets(async ({ db, request }) => {
    for (const page_format of PRESETS) {
      const note = await request('POST', '/notes', { course_id: PROJECT, title: page_format, page_format }, 201);
      const original = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);
      for (const next of [...PRESETS.filter((preset) => preset !== page_format), 'flow']) {
        const result = await request('PUT', `/notes/${note.id}`, { page_format: next, title: 'Must remain atomic' }, 409);
        assert.equal(result.details.code, 'note_page_preset_immutable');
        assert.deepEqual(db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id), original);
      }
      const renamed = await request('PUT', `/notes/${note.id}`, { title: 'Renamed', page_format });
      assert.equal(renamed.title, 'Renamed');
      assert.equal(renamed.page_format, page_format);
    }
  });
});

test('omitted presets retain legacy flow defaults and existing notes are untouched by new preset creation', async () => {
  await withPresets(async ({ db, boardId, request }) => {
    const legacy = await request('POST', '/notes', { course_id: PROJECT, title: 'Existing flow' }, 201);
    const boardLegacy = (await request('POST', `/boards/${boardId}/ceremony-note`, {
      project_id: PROJECT, title: 'Existing ceremony flow', collection,
    }, 201)).note;
    assert.equal(legacy.page_format, 'flow');
    assert.equal(boardLegacy.page_format, 'flow');
    const original = db.prepare('SELECT * FROM notes WHERE id = ?').get(legacy.id);
    for (const page_format of PRESETS) {
      await request('POST', '/notes', { course_id: PROJECT, title: page_format, page_format }, 201);
      await request('PUT', `/notes/${legacy.id}`, { page_format }, 409);
      assert.deepEqual(db.prepare('SELECT * FROM notes WHERE id = ?').get(legacy.id), original);
    }
    const renamed = await request('PUT', `/notes/${legacy.id}`, { title: 'Renamed existing note' });
    assert.equal(renamed.page_format, 'flow');
    const legacyFormat = await request('PUT', `/notes/${legacy.id}`, { page_format: 'legacy_custom' });
    assert.equal(legacyFormat.page_format, 'legacy_custom');
    assert.equal((await request('GET', `/notes/${boardLegacy.id}`)).page_format, 'flow');
  });
});
