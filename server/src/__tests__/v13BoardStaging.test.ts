import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import migration061 from '../db/migrations/061_v13_board_staging.js';
import { createBoardRouter } from '../routes/boards.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

function seed(db: Database.Database): void {
  db.exec(`
    INSERT INTO users (id, email, password_hash, name) VALUES ('user', 'staging@example.invalid', 'synthetic', 'Synthetic');
    INSERT INTO courses (id, user_id, name) VALUES ('project', 'user', 'Synthetic project');
    INSERT INTO notes (id, user_id, course_id, title) VALUES ('note', 'user', 'project', 'Source note');
    INSERT INTO items (id, user_id, plain_text, origin_note_id) VALUES ('item', 'user', 'Current Item body', 'note');
    INSERT INTO content_groups (id, user_id, course_id, note_id, title)
      VALUES ('group', 'user', 'project', 'note', 'Source group');
  `);
}

test('061 preserves every legacy member and geometry as placed human, matches fresh defaults, and adds no tables', async (t) => {
  const db = await createV13BoardsFixture({ beforeStagingMigration: true });
  const fresh = await createV13BoardsFixture();
  t.after(() => { db.close(); fresh.close(); });
  seed(db);
  db.exec(`
    INSERT INTO purposes (id, user_id, title, created_at, updated_at) VALUES ('soul', 'user', 'Question', 'before', 'before');
    INSERT INTO boards (id, user_id, title, soul_id, created_at, updated_at)
      VALUES ('board', 'user', 'Board', 'soul', 'before', 'before');
  `);
  const insert = db.prepare(`INSERT INTO board_members
    (id, board_id, member_kind, member_id, x, y, w, h, scale, z_index, pinned, metadata, created_at, updated_at)
    VALUES (?, 'board', ?, ?, ?, -31.25, 0, 125.5, 1.25, 7, 1, '{"preserve":true}', 'before', 'before')`);
  for (const [index, kind] of ['item', 'note', 'content_group', 'text_range'].entries()) {
    insert.run(`member-${kind}`, kind, `identity-${kind}`, index * 19.5);
  }
  db.exec(`INSERT INTO board_edges (id, board_id, from_member_id, to_member_id, created_at)
    VALUES ('edge', 'board', 'member-item', 'member-note', 'before')`);
  const before = db.prepare('SELECT * FROM board_members ORDER BY id').all() as Record<string, unknown>[];
  const tables = () => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  const tablesBefore = tables();
  const edgesBefore = db.prepare('SELECT * FROM board_edges').all();
  db.transaction(() => migration061.up(db))();
  assert.deepEqual(db.prepare('SELECT * FROM board_members ORDER BY id').all(),
    before.map((row) => ({ ...row, placed: 1, mounted_actor: 'human' })));
  assert.deepEqual(tables(), tablesBefore);
  assert.deepEqual(db.prepare('SELECT * FROM board_edges').all(), edgesBefore);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  const columns = (connection: Database.Database) => (connection.pragma('table_info(board_members)') as Array<{ cid: number; name: string }>)
    .map(({ cid: _cid, ...column }) => column).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(columns(db), columns(fresh));
  db.transaction(() => migration061.up(db))();
  assert.deepEqual(db.prepare('SELECT * FROM board_members ORDER BY id').all(),
    before.map((row) => ({ ...row, placed: 1, mounted_actor: 'human' })));
});

test('Staging HTTP lifecycle keeps staged references across reads, places without events, removes once, and counts all members', async (t) => {
  const db = await createV13BoardsFixture();
  t.after(() => db.close());
  seed(db);
  const textFlow = { textflow_version: 1, units: [{ id: 'unit', text: 'before target after',
    writing_role: 'paragraph', indent_level: 0, order_index: 0, metadata: {}, status: 'active' }],
    inline_structures: [], metadata: {} };
  db.prepare(`INSERT INTO note_blocks (id, user_id, course_id, block_type, content_json)
    VALUES ('block', 'user', 'project', 'text', ?)`)
    .run(JSON.stringify({ text_flow: textFlow }));
  db.exec(`INSERT INTO note_block_placements (id, note_id, block_id, order_index)
    VALUES ('placement', 'note', 'block', 0)`);
  const app = express();
  app.use(express.json());
  // Post-auth routes with an injected disposable database; no app startup or env loader.
  app.use((req: AuthRequest, _res, next) => { req.userId = 'user'; next(); });
  app.use('/api/boards', createBoardRouter(() => db));
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error.message });
  });
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    assert.notEqual(address.port, 3001);
    const request = async (method: string, path: string, body?: unknown, expected = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/boards${path}`, {
        method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const value = await response.json() as any;
      assert.equal(response.status, expected, JSON.stringify(value));
      return value;
    };
    const { board } = await request('POST', '', { title: 'Staging board', purpose: { title: 'Question' } }, 201);
    const path = `/${board.id}`;
    const stagedInput = { id: 'staged-item', member_kind: 'item', member_id: 'item', placed: false };
    const { member: staged } = await request('POST', `${path}/members`, stagedInput, 201);
    assert.equal(staged.placed, false);
    assert.equal(staged.mounted_actor, 'human');
    assert.equal(staged.reference.summary, 'Current Item body');
    assert.deepEqual(db.prepare('SELECT placed, mounted_actor FROM board_members WHERE id = ?').get(staged.id),
      { placed: 0, mounted_actor: 'human' });
    const retry = await request('POST', `${path}/members`, { ...stagedInput, placed: true, x: 900 });
    assert.equal(retry.created, false);
    assert.equal(retry.member.placed, false);
    assert.equal(retry.member.x, 0);
    const stagedNote = (await request('POST', `${path}/members`, {
      member_kind: 'note', member_id: 'note', placed: false,
    }, 201)).member;
    const stagedGroup = (await request('POST', `${path}/members`, {
      member_kind: 'content_group', member_id: 'group', placed: false,
    }, 201)).member;
    const selection = { note_id: 'note', block_id: 'block', text_flow_id: 'textflow-block', text_unit_id: 'unit',
      start_offset: 7, end_offset: 13, excerpt: 'target', at: '2026-09-09T12:00:00.000Z' };
    const range = (await request('POST', `${path}/text-ranges`, { text_range: selection, placed: false }, 201)).member;
    assert.equal(range.placed, false);
    assert.equal(range.reference.title, 'Source note');
    assert.equal(range.reference.summary, 'target');
    let reopened = await request('GET', path);
    assert.equal(reopened.members.length, 4);
    assert.ok(reopened.members.every((member: any) => member.placed === false && member.mounted_actor === 'human'));
    assert.equal(reopened.members.find((member: any) => member.id === stagedNote.id).reference.title, 'Source note');
    assert.equal(reopened.members.find((member: any) => member.id === stagedGroup.id).reference.title, 'Source group');
    const ledger = () => db.prepare('SELECT * FROM events ORDER BY seq').all();
    const beforePlace = ledger();
    const geometry = { placed: true, x: -42.5, y: 138, w: 300, h: 180, scale: 1.25, z_index: 8 };
    await request('PATCH', `${path}/members/${staged.id}`, geometry);
    assert.deepEqual(ledger(), beforePlace);
    reopened = await request('GET', path);
    const placed = reopened.members.find((member: any) => member.id === staged.id);
    for (const [key, value] of Object.entries(geometry)) assert.equal(placed[key], value);
    assert.equal(reopened.members.filter((member: any) => !member.placed).length, 3);
    await request('DELETE', `${path}/members/${range.id}`, {});
    assert.equal((await request('GET', path)).members.length, 3);
    assert.equal(db.prepare('SELECT id FROM board_text_ranges WHERE id = ?').get(range.member_id), undefined);
    const afterRemove = ledger();
    assert.equal((await request('DELETE', `${path}/members/${range.id}`, {})).removed, false);
    assert.deepEqual(ledger(), afterRemove);
    assert.equal((afterRemove.at(-1) as { verb: string }).verb, 'unmounted');
    assert.equal((await request('DELETE', path, {})).member_count, 3);
    const deletion = db.prepare("SELECT meta FROM events WHERE verb = 'board_deleted'").get() as { meta: string };
    assert.equal(JSON.parse(deletion.meta).member_count, 3);
    assert.ok(db.prepare("SELECT id FROM items WHERE id = 'item'").get());
    assert.ok(db.prepare("SELECT id FROM notes WHERE id = 'note'").get());
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM events WHERE verb = 'mounted'").get() as { n: number }).n, 4);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
