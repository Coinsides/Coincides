import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import { initDb } from '../db/init.js';
import migration054 from '../db/migrations/054_v13_events_ledger.js';
import migration058 from '../db/migrations/058_v13_board_deleted_event.js';
import { recordEvent } from '../db/recordEvent.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import noteRoutes from '../routes/notes.js';

test('058 preserves historical receipts and sequence when adding board_deleted', () => {
  const db = new Database(':memory:');
  try {
    migration054.up(db);
    db.transaction(() => recordEvent(db, {
      user_id: 'synthetic-user', actor_kind: 'human', channel: 'POST /api/boards',
      verb: 'board_created', objects: [{ kind: 'board', id: 'historical-board' }],
      summary: '  Historical quote.\n原话  ', meta: { title: 'Original title', marker: ['retain', 42] },
    }))();
    const before = db.prepare('SELECT * FROM events ORDER BY seq').all();
    const indexesBefore = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'events' ORDER BY name").all();
    const triggersBefore = db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'events' ORDER BY name").all();
    db.prepare("UPDATE sqlite_sequence SET seq = 40 WHERE name = 'events'").run();
    db.transaction(() => migration058.up(db))();
    assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), before);
    assert.deepEqual(db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'events' ORDER BY name").all(), indexesBefore);
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'events' ORDER BY name").all(), triggersBefore);
    const seq = db.transaction(() => recordEvent(db, {
      user_id: 'synthetic-user', actor_kind: 'human', channel: 'DELETE /api/boards/:boardId',
      verb: 'board_deleted', objects: [{ kind: 'board', id: 'historical-board' }],
      summary: 'Board "Original title" deleted: 0 members, 0 edges, 0 visuals',
      meta: { title: 'Original title', member_count: 0, edge_count: 0, visual_count: 0 },
    }))();
    assert.equal(seq, 41);
    const upgraded = db.prepare('SELECT * FROM events ORDER BY seq').all();
    db.transaction(() => migration058.up(db))();
    assert.deepEqual(db.prepare('SELECT * FROM events ORDER BY seq').all(), upgraded);
  } finally {
    db.close();
  }
});

test('13.4 wave 1 synthetic HTTP lifecycle smoke', async (t) => {
  // The explicit in-memory path is required for the existing notes singleton.
  // No application startup, env loader, JWT or existing database is used.
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    const userId = 'wave1-user';
    const projectId = 'wave1-project';
    const noteId = 'wave1-note';
    const groupId = 'wave1-group';
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, 'wave1@example.invalid', 'synthetic', 'Wave 1')").run(userId);
    db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)').run(projectId, userId, 'Synthetic project');
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)').run(noteId, userId, projectId, 'Mounted note');
    db.prepare('INSERT INTO content_groups (id, user_id, course_id, note_id, title) VALUES (?, ?, ?, ?, ?)')
      .run(groupId, userId, projectId, noteId, 'Retained knowledge');
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use('/api/notes', noteRoutes);
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error.message });
    });
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const request = async (method: string, path: string, body?: unknown, status = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json() as any;
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    };
    const { board } = await request('POST', '/api/boards', { title: 'Wave 1 board', purpose: { title: 'Retain this soul' } }, 201);
    const path = `/api/boards/${board.id}`;
    const { member: first } = await request('POST', `${path}/members`, { member_kind: 'note', member_id: noteId, x: 20, y: 30, w: 320, h: 160 }, 201);
    const { member: second } = await request('POST', `${path}/members`, { member_kind: 'content_group', member_id: groupId }, 201);
    const { edge } = await request('POST', `${path}/edges`, { from_member_id: first.id, to_member_id: second.id }, 201);
    const strokeData = { points: [{ x: 0, y: 0 }, { x: 30, y: 50 }], style: { color: '#123456' } };
    const { visual: freehand } = await request('POST', `${path}/visuals`, {
      visual_kind: 'freehand', x: 50, y: 60, w: 30, h: 50, data: strokeData,
    }, 201);
    const { visual: shape } = await request('POST', `${path}/visuals`, {
      visual_kind: 'shape', x: 100, y: 120, w: 100, h: 80, data: { shape: 'rectangle' },
    }, 201);
    const eventCount = () => (db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number }).count;
    const beforePolish = eventCount();

    await t.test('A1 rename remains on reopened board', async () => {
      await request('PATCH', path, { title: 'Renamed board' });
      assert.equal((await request('GET', path)).board.title, 'Renamed board');
      assert.equal(eventCount(), beforePolish);
    });

    await t.test('A2 moved freehand and resized shape remain on reopened board', async () => {
      await request('PATCH', `${path}/visuals/${freehand.id}`, { x: 170, y: 210 });
      await request('PATCH', `${path}/visuals/${shape.id}`, { w: 280, h: 190 });
      await request('PATCH', `${path}/visuals/${shape.id}`, { pinned: true });
      const reopened = await request('GET', path);
      const moved = reopened.visuals.find((visual: { id: string }) => visual.id === freehand.id);
      const resized = reopened.visuals.find((visual: { id: string }) => visual.id === shape.id);
      assert.deepEqual([moved.x, moved.y, moved.data], [170, 210, strokeData]);
      assert.deepEqual([resized.w, resized.h, resized.pinned], [280, 190, true]);
      await request('PATCH', `${path}/visuals/${shape.id}`, { pinned: false });
      assert.equal((await request('GET', path)).visuals.find((visual: { id: string }) => visual.id === shape.id).pinned, false);
      assert.equal(eventCount(), beforePolish);
    });

    await t.test('A3 label and one-way edge remain on reopened board', async () => {
      await request('PATCH', `${path}/edges/${edge.id}`, { label: 'explains', style: { direction: 'forward' } });
      const saved = (await request('GET', path)).edges[0];
      assert.equal(saved.label, 'explains');
      assert.deepEqual(saved.style, { direction: 'forward' });
      await request('PATCH', `${path}/edges/${edge.id}`, { label: null });
      assert.equal((await request('GET', path)).edges[0].label, null);
      assert.equal(eventCount(), beforePolish);
    });

    await t.test('A4 delete counts owned rows, retains soul/content and records receipt before reopening same soul', async () => {
      const notesBefore = db.prepare('SELECT * FROM notes').all();
      const groupsBefore = db.prepare('SELECT * FROM content_groups').all();
      const soulBefore = db.prepare('SELECT * FROM purposes WHERE id = ?').get(board.soul_id);
      const preview = await request('GET', path);
      const deleted = await request('DELETE', path);
      assert.equal(deleted.removed, true);
      assert.equal(deleted.board.id, board.id);
      assert.equal(deleted.board.title, 'Renamed board');
      assert.deepEqual([deleted.member_count, deleted.edge_count, deleted.visual_count], [2, 1, 2]);
      assert.deepEqual([deleted.member_count, deleted.edge_count, deleted.visual_count],
        [preview.members.length, preview.edges.length, preview.visuals.length]);
      for (const table of ['board_members', 'board_edges', 'board_visuals']) {
        assert.deepEqual(db.prepare(`SELECT * FROM ${table} WHERE board_id = ?`).all(board.id), []);
      }
      assert.equal(db.prepare('SELECT * FROM boards WHERE id = ?').get(board.id), undefined);
      assert.deepEqual(db.prepare('SELECT * FROM purposes WHERE id = ?').get(board.soul_id), soulBefore);
      assert.deepEqual(db.prepare('SELECT * FROM notes').all(), notesBefore);
      assert.deepEqual(db.prepare('SELECT * FROM content_groups').all(), groupsBefore);
      const receipt = db.prepare("SELECT * FROM events WHERE verb = 'board_deleted'").get() as {
        user_id: string; actor_kind: string; channel: string; objects: string; summary: string; meta: string;
      };
      assert.equal(receipt.user_id, userId);
      assert.equal(receipt.actor_kind, 'human');
      assert.equal(receipt.channel, 'DELETE /api/boards/:boardId');
      assert.deepEqual(JSON.parse(receipt.objects), [{ kind: 'board', id: board.id }]);
      assert.equal(receipt.summary, 'Board "Renamed board" deleted: 2 members, 1 edges, 2 visuals');
      assert.deepEqual(JSON.parse(receipt.meta), { title: 'Renamed board', member_count: 2, edge_count: 1, visual_count: 2 });
      const { board: replacement } = await request('POST', '/api/boards', { title: 'Same soul, new board', soul_id: board.soul_id }, 201);
      assert.notEqual(replacement.id, board.id);
      assert.equal(replacement.soul_id, board.soul_id);
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM purposes').get() as { count: number }).count, 1);
    });

    await t.test('A5 trashed note stays mounted as unavailable and restores to available', async () => {
      const replacement = (await request('GET', '/api/boards')).boards[0];
      const replacementPath = `/api/boards/${replacement.id}`;
      const { member } = await request('POST', `${replacementPath}/members`, {
        member_kind: 'note', member_id: noteId, x: 43, y: 65, w: 320, h: 160,
      }, 201);
      await request('DELETE', `/api/notes/${noteId}`);
      const trashed = (await request('GET', replacementPath)).members;
      assert.equal(trashed.length, 1);
      assert.equal(trashed[0].id, member.id);
      assert.equal(trashed[0].reference.state, 'unavailable');
      assert.equal(trashed[0].reference.reason, 'note_inactive');
      assert.deepEqual([trashed[0].x, trashed[0].y, trashed[0].w, trashed[0].h], [43, 65, 320, 160]);
      assert.equal((await request('GET', `/api/notes?course_id=${projectId}`)).some((note: { id: string }) => note.id === noteId), false);
      assert.equal((await request('GET', `/api/notes?course_id=${projectId}&status=trashed`)).some((note: { id: string }) => note.id === noteId), true);
      await request('POST', `/api/notes/${noteId}/restore`);
      const restored = (await request('GET', replacementPath)).members[0];
      assert.equal(restored.id, member.id);
      assert.equal(restored.reference.state, 'available');
      assert.equal(restored.reference.title, 'Mounted note');
      assert.equal((await request('GET', `/api/notes?course_id=${projectId}`)).some((note: { id: string }) => note.id === noteId), true);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
});
