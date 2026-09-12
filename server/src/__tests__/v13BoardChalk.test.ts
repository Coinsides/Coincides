import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import test from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import migration060 from '../db/migrations/060_v13_board_chalk_items.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardRouter } from '../routes/boards.js';
import { createItemRouter } from '../routes/items.js';
import { getItemOutputSchema, listItemsOutputSchema } from '../toolFace/registry.js';
import { createItemSchema } from '../validators/index.js';
import { BOARD_STICKY_TEXT_LIMIT, boardStickyDataSchema } from '../validators/boards.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const userId = 'synthetic-chalk-user';
const projectId = '90000000-0000-4000-8000-000000000001';
const noteId = '90000000-0000-4000-8000-000000000002';

function seed(db: Database.Database): void {
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'synthetic', 'Synthetic')")
    .run(userId, 'board-chalk@example.invalid');
  db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
    .run(projectId, userId, 'Weak project tag');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
    .run(noteId, userId, projectId, 'Existing note');
}

async function withApi(run: (db: Database.Database, request: (
  method: string, path: string, body?: unknown, status?: number,
) => Promise<any>) => Promise<void>): Promise<void> {
  const db = await createV13BoardsFixture();
  let server: Server | undefined;
  try {
    seed(db);
    const app = express();
    app.use(express.json());
    // Domain contract only: injected identity, disposable memory DB, no startup or credentials.
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
    await run(db, async (method, path, body, status = 200) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      const result = await response.json();
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
      return result;
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    db.close();
  }
}

test('060 upgrades actual pre-chalk schema without changing existing visuals or Items and can repeat', async (t) => {
  const db = await createV13BoardsFixture({ beforeChalkMigration: true });
  const fresh = await createV13BoardsFixture({ beforeLayersMigration: true });
  t.after(() => { db.close(); fresh.close(); });
  seed(db);
  db.prepare(`INSERT INTO purposes (id, user_id, title, created_at, updated_at)
    VALUES ('soul', ?, 'Question', 'before', 'before')`).run(userId);
  db.prepare(`INSERT INTO boards (id, user_id, title, soul_id, created_at, updated_at)
    VALUES ('board', ?, 'Birth board', 'soul', 'before', 'before')`).run(userId);
  db.prepare(`INSERT INTO items (id, user_id, plain_text, origin_note_id, origin_course_id)
    VALUES ('old-item', ?, 'Existing body', ?, ?)`).run(userId, noteId, projectId);
  db.exec(`INSERT INTO board_visuals
    (id, board_id, visual_kind, x, y, w, h, scale, rotation, z_index, pinned, data, metadata, created_at, updated_at)
    VALUES ('stroke', 'board', 'freehand', -15.5, 20, 120, 75, 1.5, 37, 8, 1,
      '{"path":"M0,0 L1,1","extension":{"kept":true}}', '{"kept":"verbatim"}', 'before', 'before')`);
  const visualsBefore = db.prepare('SELECT * FROM board_visuals').all();
  const itemBefore = db.prepare('SELECT * FROM items').get() as Record<string, unknown>;
  db.transaction(() => migration060.up(db))();
  assert.deepEqual(db.prepare('SELECT * FROM board_visuals').all(), visualsBefore);
  assert.deepEqual(db.prepare('SELECT * FROM items').get(), { ...itemBefore, origin_board_id: null });
  for (const table of ['items', 'board_visuals']) {
    const columns = (connection: Database.Database) => (connection.pragma(`table_info(${table})`) as Array<{ cid: number; name: string }>)
      .map(({ cid: _cid, ...column }) => column).sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(columns(db), columns(fresh));
  }
  const boardFk = (db.pragma('foreign_key_list(items)') as Array<{ from: string; table: string; on_delete: string }>)
    .find((key) => key.from === 'origin_board_id');
  assert.equal(boardFk?.table, 'boards');
  assert.equal(boardFk?.on_delete, 'SET NULL');
  db.prepare(`INSERT INTO items (id, user_id, plain_text, origin_board_id)
    VALUES ('board-item', ?, 'Board body', 'board')`).run(userId);
  assert.throws(() => db.prepare("UPDATE items SET origin_note_id = ? WHERE id = 'board-item'").run(noteId), /CHECK constraint failed/);
  assert.throws(() => db.prepare("UPDATE items SET origin_course_id = ? WHERE id = 'board-item'").run(projectId), /CHECK constraint failed/);
  db.transaction(() => migration060.up(db))();
  assert.deepEqual(db.prepare('SELECT * FROM board_visuals').all(), visualsBefore);
  db.exec("DELETE FROM boards WHERE id = 'board'");
  assert.deepEqual(db.prepare("SELECT plain_text, origin_board_id FROM items WHERE id = 'board-item'").get(),
    { plain_text: 'Board body', origin_board_id: null });
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('chalk text limit and Item birth-place validation enforce the decided domain shape', () => {
  const shared = readFileSync(new URL('../../../shared/types/boardSticky.ts', import.meta.url), 'utf8');
  assert.match(shared, new RegExp(`BOARD_STICKY_TEXT_LIMIT\\s*=\\s*${BOARD_STICKY_TEXT_LIMIT}\\b`));
  assert.equal(boardStickyDataSchema.safeParse({ text: '字'.repeat(280) }).success, true);
  const tooLong = boardStickyDataSchema.safeParse({ text: '字'.repeat(281) });
  assert.equal(tooLong.success, false);
  if (!tooLong.success) assert.match(tooLong.error.issues[0].message, /280 characters/);
  assert.equal(boardStickyDataSchema.safeParse({ text: 'Plain text', font_size: 24 }).success, false);
  const boardId = '90000000-0000-4000-8000-000000000003';
  assert.equal(createItemSchema.safeParse({ plain_text: 'Body', origin_board_id: boardId }).success, true);
  assert.equal(createItemSchema.safeParse({ plain_text: 'Body', origin_board_id: boardId, origin_note_id: noteId }).success, false);
  assert.equal(createItemSchema.safeParse({ plain_text: 'Body', origin_board_id: boardId, origin_course_id: projectId }).success, false);
});

test('chalk HTTP lifecycle persists edits, casts in place with mounted receipt and keeps Item body after birth-board deletion', async () => {
  await withApi(async (db, request) => {
    const { board } = await request('POST', '/api/boards', {
      title: 'Birth board', project_id: projectId, purpose: { title: 'Why?' },
    }, 201);
    const path = `/api/boards/${board.id}`;
    const { visual } = await request('POST', `${path}/visuals`, {
      visual_kind: 'sticky', x: 31, y: 47, w: 230, h: 132, scale: 1.25, z_index: 17,
      data: { text: 'First chalk' },
    }, 201);
    assert.equal((await request('GET', path)).visuals[0].data.text, 'First chalk');
    const editedText = 'Edited chalk\nkeeps <b>literal</b> text';
    await request('PATCH', `${path}/visuals/${visual.id}`, {
      x: -123.5, y: 88, pinned: true, data: { text: editedText },
    });
    const reopened = (await request('GET', path)).visuals[0];
    assert.equal(reopened.data.text, editedText);
    assert.equal(reopened.x, -123.5);
    assert.equal(reopened.y, 88);
    assert.equal(reopened.pinned, true);
    const { visual: discarded } = await request('POST', `${path}/visuals`, {
      visual_kind: 'sticky', data: { text: 'Discard me' },
    }, 201);
    await request('DELETE', `${path}/visuals/${discarded.id}`);
    assert.deepEqual((await request('GET', path)).visuals.map((entry: any) => entry.id), [visual.id]);
    const anchorsBefore = db.prepare('SELECT * FROM item_anchors').all();
    const cast = await request('POST', `${path}/visuals/${visual.id}/cast`, {}, 201);
    assert.equal(cast.removed_visual_id, visual.id);
    assert.equal(cast.item.origin_board_id, board.id);
    assert.equal(cast.item.origin_board_title, 'Birth board');
    assert.equal(cast.item.origin_note_id, null);
    assert.equal(cast.item.origin_course_id, null);
    assert.equal(cast.item.plain_text, editedText);
    assert.equal(cast.item.body_json.text_flow.units[0].text, editedText);
    assert.deepEqual(getItemOutputSchema.parse(cast.item), cast.item);
    for (const key of ['x', 'y', 'w', 'h', 'scale', 'z_index', 'pinned']) {
      assert.equal(cast.member[key], reopened[key], `cast preserves ${key}`);
    }
    assert.equal(cast.member.reference.origin_board_title, 'Birth board');
    assert.equal(cast.member.reference.note_id, null);
    const afterCast = await request('GET', path);
    assert.deepEqual(afterCast.visuals, []);
    assert.equal(afterCast.members.length, 1);
    assert.equal(afterCast.members[0].member_id, cast.item.id);
    const listed = listItemsOutputSchema.parse(await request('GET', '/api/items')).find((entry) => entry.id === cast.item.id)!;
    assert.equal(listed.origin_board_id, board.id);
    assert.equal(listed.origin_board_title, 'Birth board');
    assert.equal(listed.plain_text, editedText);
    assert.deepEqual(db.prepare('SELECT * FROM item_anchors').all(), anchorsBefore);
    assert.deepEqual(db.prepare('SELECT * FROM purpose_members').all(), []);
    const receipt = db.prepare("SELECT verb, channel, objects FROM events WHERE verb = 'mounted'").get() as {
      verb: string; channel: string; objects: string;
    };
    assert.equal(receipt.channel, 'POST /api/boards/:boardId/visuals/:visualId/cast');
    assert.deepEqual(JSON.parse(receipt.objects), [
      { kind: 'board', id: board.id }, { kind: 'board_member', id: cast.member.id }, { kind: 'item', id: cast.item.id },
    ]);
    await request('PATCH', path, { title: 'Renamed birth board' });
    const summary = (await request('POST', '/api/items/summaries', { item_ids: [cast.item.id] }))[0];
    assert.equal(summary.origin_board_title, 'Renamed birth board');
    const inspector = await request('GET', `/api/items/${cast.item.id}`);
    assert.equal(inspector.origin_board_title, 'Renamed birth board');
    const snapshotBefore = db.prepare('SELECT * FROM item_snapshots WHERE item_id = ?').all(cast.item.id);
    await request('DELETE', path);
    const afterDelete = await request('GET', `/api/items/${cast.item.id}`);
    assert.equal(afterDelete.origin_board_id, null);
    assert.equal(afterDelete.origin_board_title, null);
    assert.deepEqual(getItemOutputSchema.parse(afterDelete), afterDelete);
    assert.equal(afterDelete.plain_text, editedText);
    assert.deepEqual(afterDelete.body_json, inspector.body_json);
    assert.deepEqual(db.prepare('SELECT * FROM item_snapshots WHERE item_id = ?').all(cast.item.id), snapshotBefore);
    const deletedSummary = (await request('POST', '/api/items/summaries', { item_ids: [cast.item.id] }))[0];
    assert.equal(deletedSummary.origin_board_id, null);
    assert.equal(deletedSummary.origin_board_title, null);
    assert.equal(deletedSummary.summary, 'Edited chalk keeps <b>literal</b> text');
    assert.equal((await request('GET', '/api/items')).some((entry: any) => entry.id === cast.item.id), true);
    assert.deepEqual((db.prepare('SELECT verb FROM events ORDER BY seq').all() as Array<{ verb: string }>)
      .map((event) => event.verb), ['purpose_created', 'board_created', 'mounted', 'board_deleted']);
    console.log('V13_BOARD_CHALK_PASS db=:memory: reopen=PASS edit_move_pin_delete=PASS cast_position_z=PASS items_origin=PASS summary_inspector_origin=PASS delete_board_preserves_body=PASS');
  });
});

test('chalk cast reports body rejection and rolls Item, mount and chalk back when receipt storage fails', async () => {
  await withApi(async (db, request) => {
    const { board } = await request('POST', '/api/boards', { title: 'Rollback board', purpose: { title: 'Why?' } }, 201);
    const path = `/api/boards/${board.id}`;
    const { visual: blank } = await request('POST', `${path}/visuals`, {
      visual_kind: 'sticky', data: { text: ' \n\t ' },
    }, 201);
    const rejection = await request('POST', `${path}/visuals/${blank.id}/cast`, {}, 400);
    assert.match(rejection.error, /Item content is required/i);
    assert.equal((await request('GET', path)).visuals[0].id, blank.id);
    const identityOnly = await request('GET', '/api/items');
    assert.deepEqual(identityOnly.map((item: { id: string }) => item.id), [board.identity_item_id]);
    const limit = await request('PATCH', `${path}/visuals/${blank.id}`, { data: { text: 'x'.repeat(281) } }, 400);
    assert.match(limit.error, /280 characters/);
    await request('PATCH', `${path}/visuals/${blank.id}`, { data: { text: 'Ready to cast' } });
    const before = ['items', 'item_snapshots', 'board_members', 'board_visuals', 'events']
      .map((table) => db.prepare(`SELECT * FROM ${table}`).all());
    db.exec(`CREATE TEMP TRIGGER fail_chalk_receipt BEFORE INSERT ON events
      WHEN NEW.verb = 'mounted' BEGIN SELECT RAISE(ABORT, 'synthetic_receipt_failure'); END`);
    const failure = await request('POST', `${path}/visuals/${blank.id}/cast`, {}, 500);
    assert.match(failure.error, /synthetic_receipt_failure/);
    assert.deepEqual(['items', 'item_snapshots', 'board_members', 'board_visuals', 'events']
      .map((table) => db.prepare(`SELECT * FROM ${table}`).all()), before);
    db.exec('DROP TRIGGER fail_chalk_receipt');
    const cast = await request('POST', `${path}/visuals/${blank.id}/cast`, {}, 201);
    assert.deepEqual((await request('GET', '/api/items')).map((item: { id: string }) => item.id).sort(),
      [board.identity_item_id, cast.item.id].sort());
    assert.deepEqual((await request('GET', path)).visuals, []);
  });
});
