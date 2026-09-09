import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createItemRouter } from '../routes/items.js';
import { listItemSummaries } from '../services/itemSummaries.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

test('Item summaries batch reads current text once per identity without snapshot or anchor tables', (t) => {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE boards (id TEXT PRIMARY KEY, user_id TEXT, title TEXT);
    CREATE TABLE items (id TEXT PRIMARY KEY, user_id TEXT, plain_text TEXT,
    status TEXT, item_type TEXT, topic TEXT, origin_note_id TEXT, origin_course_id TEXT, origin_board_id TEXT)`);
  db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('item', 'user', '  Current\n\tbody  ', 'active', 'claim', 'Topic', 'note', 'project', null);
  const expected = { id: 'item', summary: 'Current body', status: 'active', item_type: 'claim',
    topic: 'Topic', origin_note_id: 'note', origin_course_id: 'project', origin_board_id: null, origin_board_title: null };
  assert.deepEqual(listItemSummaries(db, 'user', ['item', 'item', 'missing']), [expected]);
  assert.deepEqual(listItemSummaries(db, 'user', []), []);
  db.prepare("UPDATE items SET plain_text = ?, status = 'retired' WHERE id = 'item'")
    .run(`  New\n${'text '.repeat(80)}`);
  const current = listItemSummaries(db, 'user', ['item']);
  assert.equal(current[0].summary, `New ${'text '.repeat(80)}`.trim().slice(0, 240));
  assert.equal(current[0].status, 'retired');
});

test('13.4 synthetic HTTP Item floor: mount, reopen current body, retire in place and retain missing cards', async () => {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  const userId = 'synthetic-item-floor-user';
  const projectId = '70000000-0000-4000-8000-000000000001';
  const noteId = '70000000-0000-4000-8000-000000000002';
  try {
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'synthetic', 'Synthetic')")
      .run(userId, 'item-floor@example.invalid');
    db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
      .run(projectId, userId, 'Synthetic project');
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(noteId, userId, projectId, 'Origin note');
    const app = express();
    app.use(express.json());
    // Post-auth contract only: disposable memory DB, no credentials or app startup.
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/boards', createBoardRouter(() => db));
    app.use('/api/items', createItemRouter(() => db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err instanceof AppError ? err.statusCode : 500).json({ error: err.message });
    });
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    assert.notEqual(address.port, 3001);
    assert.notEqual(address.port, 5173);
    const baseUrl = `http://127.0.0.1:${address.port}`;
    async function request(method: string, path: string, body?: unknown, status = 200): Promise<any> {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json();
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    }

    const { board } = await request('POST', '/api/boards', {
      title: 'Item floor', purpose: { title: 'A synthetic question' },
    }, 201);
    const item = await request('POST', '/api/items', {
      plain_text: '  Original\n  body  ', item_type: 'claim', topic: 'A topic', origin_note_id: noteId,
    }, 201);
    const standalone = await request('POST', '/api/items', { plain_text: 'Standalone body' }, 201);
    const path = `/api/boards/${board.id}`;
    const { member } = await request('POST', `${path}/members`, {
      id: 'item-floor-mount', member_kind: 'item', member_id: item.id, x: 25, y: 45, w: 320, h: 200,
    }, 201);
    assert.equal(member.reference.summary, 'Original body');
    assert.equal(member.reference.item_type, 'claim');
    assert.equal(member.reference.topic, 'A topic');
    assert.equal(member.reference.item_status, 'active');
    assert.equal(member.reference.note_id, noteId);
    const { member: standaloneMount } = await request('POST', `${path}/members`, {
      member_kind: 'item', member_id: standalone.id,
    }, 201);
    assert.equal(standaloneMount.reference.note_id, null);
    const membershipBefore = db.prepare('SELECT * FROM board_members WHERE id = ?').get(member.id);
    await request('PUT', `/api/items/${item.id}`, { plain_text: 'Changed\n current body', topic: 'New topic' });
    const reopened = await request('GET', path);
    const current = reopened.members.find((entry: any) => entry.id === member.id);
    assert.equal(current.reference.summary, 'Changed current body');
    assert.equal(current.reference.topic, 'New topic');
    assert.equal(current.reference.note_id, noteId);
    assert.equal(current.x, 25);
    assert.equal(current.y, 45);

    const snapshotsBefore = db.prepare('SELECT * FROM item_snapshots ORDER BY id').all();
    const summaries = await request('POST', '/api/items/summaries', {
      item_ids: [item.id, standalone.id, item.id, 'missing'],
    });
    assert.deepEqual(summaries, [
      { id: item.id, summary: 'Changed current body', status: 'active', item_type: 'claim',
        topic: 'New topic', origin_note_id: noteId, origin_course_id: projectId,
        origin_board_id: null, origin_board_title: null },
      { id: standalone.id, summary: 'Standalone body', status: 'active', item_type: null,
        topic: null, origin_note_id: null, origin_course_id: null, origin_board_id: null, origin_board_title: null },
    ]);
    assert.deepEqual(db.prepare('SELECT * FROM item_snapshots ORDER BY id').all(), snapshotsBefore);
    await request('POST', `/api/items/${item.id}/retire`, {});
    const afterRetire = await request('GET', path);
    assert.equal(afterRetire.members.length, 2);
    const retired = afterRetire.members.find((entry: any) => entry.id === member.id);
    assert.equal(retired.reference.state, 'unavailable');
    assert.equal(retired.reference.reason, 'item_retired');
    assert.equal(retired.reference.item_status, 'retired');
    assert.equal(retired.reference.summary, 'Changed current body');
    assert.deepEqual(db.prepare('SELECT * FROM board_members WHERE id = ?').get(member.id), membershipBefore);
    assert.equal((await request('POST', '/api/items/summaries', { item_ids: [item.id] }))[0].status, 'retired');

    // A missing target must leave its saved projection in this synthetic board.
    db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
    const afterMissing = await request('GET', path);
    assert.equal(afterMissing.members.length, 2);
    const missing = afterMissing.members.find((entry: any) => entry.id === member.id);
    assert.equal(missing.reference.state, 'missing');
    assert.equal(missing.reference.item_status, 'missing');
    assert.equal(missing.reference.reason, 'reference_missing');
    assert.equal(missing.x, 25);
    assert.deepEqual(await request('POST', '/api/items/summaries', { item_ids: [item.id] }), []);
    assert.deepEqual((db.prepare('SELECT verb FROM events ORDER BY seq').all() as { verb: string }[])
      .map((event) => event.verb), ['purpose_created', 'board_created', 'mounted', 'mounted']);
    console.log('V13_ITEM_FLOOR_PASS db=:memory: mount=PASS reopen_current_body=PASS retire_in_place=PASS missing_in_place=PASS summaries=PASS origin_refs=PASS');
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
});
