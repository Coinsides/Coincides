import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import migration065 from '../db/migrations/065_v13_board_item_identity.js';
import { AppError } from '../middleware/errorHandler.js';
import { createBoard, deleteBoard, getBoard, listBoards, mountBoardMember, updateBoard } from '../services/boards.js';
import { createItem, getItem, retireItem, updateItem } from '../services/items.js';
import { listItemSummaries } from '../services/itemSummaries.js';
import { createClientNoteBlock } from '../services/noteBlockLifecycle.js';
import { createRelation, getRelation } from '../services/relations.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const USER = 'identity-fixture-owner';
const PROJECT = '71000000-0000-4000-8000-000000000001';
const NOTE = '71000000-0000-4000-8000-000000000002';
const OLD_TIME = '2021-03-04T05:06:07.000Z';

async function fixture(t: TestContext, beforeIdentityMigration = false) {
  const db = await createV13BoardsFixture({ beforeIdentityMigration });
  t.after(() => db.close());
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, 'board-identity@example.invalid', 'synthetic', 'Synthetic')").run(USER);
  db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'Synthetic project')").run(PROJECT, USER);
  db.prepare("INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, 'Synthetic note')").run(NOTE, USER, PROJECT);
  return db;
}

function open(db: Database.Database, title = 'A board') {
  return db.transaction(() => createBoard(db, USER, {
    title, project_id: PROJECT, purpose: { title: `Question for ${title}` },
  }))().board;
}

function identity(db: Database.Database, boardId: string) {
  const row = db.prepare('SELECT item_id FROM boards WHERE id = ?').get(boardId) as { item_id: string | null };
  assert.ok(row.item_id);
  return getItem(db, USER, row.item_id);
}

function count(db: Database.Database, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

function tableRows(db: Database.Database, tables: string[]) {
  return tables.map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
}

function legacyBoard(db: Database.Database, id: string, projectId: string | null = PROJECT) {
  db.prepare(`INSERT INTO purposes (id, user_id, title, created_at, updated_at)
    VALUES (?, ?, 'Historical purpose', ?, ?)`).run(`soul-${id}`, USER, OLD_TIME, OLD_TIME);
  db.prepare(`INSERT INTO boards (id, user_id, title, soul_id, project_id, viewport, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, USER, `Historical ${id}`, `soul-${id}`, projectId,
    '{"x":123,"y":-456,"zoom":2}', OLD_TIME, OLD_TIME);
}

test('065 nullable unique Item bridge and FK converge for fresh and actual pre-065 schemas', async (t) => {
  const fresh = await fixture(t);
  const upgrade = await fixture(t, true);
  // Production startup re-applies base schema BEFORE migrations on existing DBs.
  // This catches accidentally moving the new bridge index into schema.sql.
  const baseSchema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const statement of baseSchema.split(';').map((sql) => sql.trim())) {
    if (statement && !statement.startsWith('PRAGMA')) upgrade.exec(`${statement};`);
  }
  migration065.up(upgrade);
  for (const pragma of ['table_info(boards)', 'foreign_key_list(boards)', 'index_list(boards)']) {
    // ALTER appends the column; SQLite's ordinal IDs are not schema semantics.
    const shape = (db: Database.Database) => (db.pragma(pragma) as Array<Record<string, unknown>>)
      .map(({ cid: _cid, id: _id, seq: _seq, ...entry }) => entry)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    assert.deepEqual(shape(fresh), shape(upgrade));
  }
  const itemColumn = (fresh.pragma('table_info(boards)') as Array<{ name: string; notnull: number }>).find((row) => row.name === 'item_id');
  assert.equal(itemColumn?.notnull, 0);
  const itemFk = (fresh.pragma('foreign_key_list(boards)') as Array<{ from: string; table: string; to: string; on_delete: string }>).find((row) => row.from === 'item_id');
  assert.deepEqual(itemFk && { table: itemFk.table, to: itemFk.to, on_delete: itemFk.on_delete },
    { table: 'items', to: 'id', on_delete: 'NO ACTION' });
  const a = open(fresh, 'First');
  const b = open(fresh, 'Second');
  const item = identity(fresh, a.id);
  assert.throws(() => fresh.prepare('UPDATE boards SET item_id = ? WHERE id = ?').run(item.id, b.id),
    /UNIQUE constraint failed: boards.item_id/);
  assert.throws(() => fresh.prepare('UPDATE boards SET item_id = ? WHERE id = ?').run('missing-item', b.id), /FOREIGN KEY constraint failed/);
  assert.throws(() => fresh.prepare('DELETE FROM items WHERE id = ?').run(item.id), /FOREIGN KEY constraint failed/);
  // More than one legacy NULL is valid until its explicit migration transaction fills it.
  legacyBoard(fresh, 'nullable-a');
  legacyBoard(fresh, 'nullable-b');
  assert.equal((fresh.prepare('SELECT COUNT(*) AS n FROM boards WHERE item_id IS NULL').get() as { n: number }).n, 2);
  assert.deepEqual(fresh.pragma('foreign_key_check'), []);
});

test('createBoard mints an independent Item UUID, honest provenance and initial Snapshot in the caller transaction', async (t) => {
  const db = await fixture(t);
  const before = new Date().toISOString();
  const board = open(db, 'Initial title');
  const item = identity(db, board.id);
  const after = new Date().toISOString();
  assert.notEqual(item.id, board.id);
  assert.match(item.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(item.plain_text, 'Board: Initial title');
  assert.equal(item.status, 'active');
  assert.equal(item.item_type, null);
  assert.equal(item.topic, null);
  assert.equal(item.origin_board_id, null);
  assert.equal(item.origin_note_id, null);
  assert.equal(item.origin_course_id, PROJECT);
  assert.equal(item.created_by, 'system:board-identity');
  assert.ok(item.created_at >= before && item.created_at <= after);
  assert.deepEqual(item.metadata.board_identity, {
    board_id: board.id, minted_by: 'create_board', minted_at: item.created_at,
    title_at_mint: 'Initial title', project_id_at_mint: PROJECT,
  });
  assert.equal(item.current_snapshot.item_id, item.id);
  assert.equal(item.current_snapshot.content, item.plain_text);
  assert.equal(count(db, 'item_snapshots'), 1);
  for (const read of [board, getBoard(db, USER, board.id).board, listBoards(db, USER)[0]]) {
    assert.equal(read.identity_item_id, item.id);
    assert.equal(read.identity_description, item.plain_text);
  }
});

test('ordinary update and retire reject the actual bridge, while editable type/topic/provenance text confers no identity', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const item = identity(db, board.id);
  const before = tableRows(db, ['boards', 'items', 'item_snapshots']);
  const rejected = (error: unknown) => error instanceof AppError && error.statusCode === 409 && /board|板/i.test(error.message);
  for (const patch of [{ plain_text: 'Changed body' }, { item_type: 'claim' }, { topic: 'Other' }, { metadata: {} }]) {
    assert.throws(() => updateItem(db, USER, item.id, patch), rejected);
  }
  assert.throws(() => retireItem(db, USER, item.id, {}), rejected);
  assert.deepEqual(tableRows(db, ['boards', 'items', 'item_snapshots']), before);

  const ordinary = createItem(db, USER, {
    plain_text: 'A regular card about Board identity', item_type: 'board_identity', topic: 'Board',
    created_by: 'system:board-identity', metadata: item.metadata,
  });
  assert.equal(updateItem(db, USER, ordinary.id, { plain_text: 'Still a regular editable card' }).plain_text,
    'Still a regular editable card');
  assert.equal(retireItem(db, USER, ordinary.id, {}).status, 'retired');
  assert.equal(getBoard(db, USER, board.id).board.id, board.id);
});

test('A3 rename leaves identity and judgment snapshots byte-stable; ordinary body edit is a freshness positive control', async (t) => {
  const db = await fixture(t);
  const board = open(db, 'Original board title');
  const item = identity(db, board.id);
  const ordinary = createItem(db, USER, { plain_text: 'Original ordinary body' });
  const relation = createRelation(db, USER, { from_item_id: item.id, to_item_id: ordinary.id, relation_type: 'supports' });
  assert.equal(relation.freshness, 'fresh');
  const itemBefore = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id);
  const snapshotsBefore = tableRows(db, ['item_snapshots', 'relations']);
  const renamed = db.transaction(() => updateBoard(db, USER, board.id,
    { title: 'Entirely different board name', viewport: { x: 99, y: -22, zoom: 1.5 } }))();
  assert.equal(renamed.title, 'Entirely different board name');
  assert.equal(renamed.identity_description, 'Board: Original board title');
  assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id), itemBefore);
  assert.deepEqual(tableRows(db, ['item_snapshots', 'relations']), snapshotsBefore);
  assert.equal(getRelation(db, USER, relation.id).freshness, 'fresh');
  updateItem(db, USER, ordinary.id, { plain_text: 'Revised ordinary body' });
  const changed = getRelation(db, USER, relation.id);
  assert.equal(changed.freshness, 'to_changed');
  assert.equal(changed.from_changed, false);
  assert.equal(changed.to_changed, true);
  assert.equal(changed.from_snapshot_id, relation.from_snapshot_id);
  assert.equal(changed.to_snapshot_id, relation.to_snapshot_id);
  assert.equal(changed.to_snapshot.content, 'Original ordinary body');
  assert.equal(changed.to_item.plain_text, 'Revised ordinary body');
});

test('deleteBoard retires its identity while retaining the soul, referenced Item, Snapshot and Relation history', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const item = identity(db, board.id);
  const ordinary = createItem(db, USER, { plain_text: 'Referenced content survives' });
  const relation = createRelation(db, USER, { from_item_id: item.id, to_item_id: ordinary.id, relation_type: 'supports' });
  db.transaction(() => mountBoardMember(db, USER, board.id, { member_kind: 'item', member_id: ordinary.id }))();
  const snapshotsBefore = tableRows(db, ['item_snapshots']);
  const removed = db.transaction(() => deleteBoard(db, USER, board.id))();
  assert.equal(removed.removed, true);
  assert.equal(removed.member_count, 1);
  assert.equal(db.prepare('SELECT id FROM boards WHERE id = ?').get(board.id), undefined);
  const retired = getItem(db, USER, item.id);
  assert.equal(retired.status, 'retired');
  assert.equal(retired.retired_into_item_id, null);
  assert.equal(retired.plain_text, item.plain_text);
  assert.deepEqual(retired.metadata, item.metadata);
  assert.deepEqual(tableRows(db, ['item_snapshots']), snapshotsBefore);
  assert.ok(db.prepare('SELECT id FROM purposes WHERE id = ?').get(board.soul_id));
  assert.equal(getItem(db, USER, ordinary.id).status, 'active');
  assert.equal(getRelation(db, USER, relation.id).from_item.status, 'retired');
  assert.equal(getRelation(db, USER, relation.id).freshness, 'fresh');
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('createBoard failure at Snapshot or Board insertion rolls back soul, identity and Snapshot together', async (t) => {
  const db = await fixture(t);
  for (const table of ['item_snapshots', 'boards']) {
    const before = tableRows(db, ['purposes', 'boards', 'items', 'item_snapshots']);
    db.exec(`CREATE TEMP TRIGGER fail_identity_create BEFORE INSERT ON ${table}
      BEGIN SELECT RAISE(ABORT, 'synthetic_create_failure'); END`);
    assert.throws(() => open(db, 'Rolled back'), /synthetic_create_failure/);
    assert.deepEqual(tableRows(db, ['purposes', 'boards', 'items', 'item_snapshots']), before);
    db.exec('DROP TRIGGER fail_identity_create');
  }
  assert.ok(open(db, 'Successful retry').identity_item_id);
});

test('deleteBoard failure at identity retirement or Board deletion restores all owned rows and active identity', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const item = identity(db, board.id);
  db.transaction(() => mountBoardMember(db, USER, board.id, { member_kind: 'item', member_id: item.id }))();
  for (const operation of ['UPDATE OF status ON items', 'DELETE ON boards']) {
    const before = tableRows(db, ['purposes', 'boards', 'items', 'item_snapshots', 'board_members']);
    db.exec(`CREATE TEMP TRIGGER fail_identity_delete BEFORE ${operation}
      BEGIN SELECT RAISE(ABORT, 'synthetic_delete_failure'); END`);
    assert.throws(() => db.transaction(() => deleteBoard(db, USER, board.id))(), /synthetic_delete_failure/);
    assert.deepEqual(tableRows(db, ['purposes', 'boards', 'items', 'item_snapshots', 'board_members']), before);
    db.exec('DROP TRIGGER fail_identity_delete');
  }
  assert.equal(identity(db, board.id).status, 'active');
});

test('C1 backfill preserves legacy Board IDs and data, honestly timestamps Items and Snapshots, and reruns without new rows', async (t) => {
  const db = await fixture(t, true);
  legacyBoard(db, 'legacy-a');
  legacyBoard(db, 'legacy-b', null);
  db.prepare(`INSERT INTO board_members (id, board_id, member_kind, member_id, created_at, updated_at)
    VALUES ('old-projection', 'legacy-a', 'note', ?, ?, ?)`).run(NOTE, OLD_TIME, OLD_TIME);
  const beforeBoards = db.prepare('SELECT * FROM boards ORDER BY id').all();
  const beforeReferences = tableRows(db, ['purposes', 'board_members']);
  const beforeTime = new Date().toISOString();
  migration065.up(db);
  const afterTime = new Date().toISOString();
  const afterBoards = db.prepare('SELECT * FROM boards ORDER BY id').all() as Array<Record<string, unknown>>;
  assert.deepEqual(afterBoards.map(({ item_id: _identityId, ...board }) => board), beforeBoards);
  assert.deepEqual(tableRows(db, ['purposes', 'board_members']), beforeReferences);
  assert.equal(new Set(afterBoards.map((board) => board.item_id)).size, 2);
  for (const board of afterBoards) {
    const item = identity(db, String(board.id));
    assert.notEqual(item.id, board.id);
    assert.ok(item.created_at >= beforeTime && item.created_at <= afterTime);
    assert.notEqual(item.created_at, OLD_TIME);
    assert.ok(item.current_snapshot.created_at >= beforeTime && item.current_snapshot.created_at <= afterTime);
    assert.equal(item.current_snapshot.content, `Board: ${board.title}`);
    assert.equal(item.origin_board_id, null);
    assert.equal(item.origin_course_id, board.project_id);
    assert.deepEqual(item.metadata.board_identity, {
      board_id: board.id, minted_by: 'migration_065', minted_at: item.created_at,
      title_at_mint: board.title, project_id_at_mint: board.project_id,
    });
  }
  const after = tableRows(db, ['boards', 'items', 'item_snapshots', 'purposes', 'board_members']);
  migration065.up(db);
  assert.deepEqual(tableRows(db, ['boards', 'items', 'item_snapshots', 'purposes', 'board_members']), after);
  assert.equal(count(db, 'items'), 2);
  assert.equal(count(db, 'item_snapshots'), 2);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('C1 each backfill board is atomic: a later failed bridge leaves no half Item/Snapshot and rerun fills only gaps', async (t) => {
  const db = await fixture(t, true);
  legacyBoard(db, 'legacy-a');
  legacyBoard(db, 'legacy-b');
  db.exec(`CREATE TEMP TRIGGER fail_second_bridge BEFORE UPDATE ON boards
    WHEN NEW.id = 'legacy-b'
    BEGIN SELECT RAISE(ABORT, 'synthetic_backfill_failure'); END`);
  assert.throws(() => migration065.up(db), /synthetic_backfill_failure/);
  const a = identity(db, 'legacy-a');
  assert.deepEqual(db.prepare("SELECT item_id FROM boards WHERE id = 'legacy-b'").get(), { item_id: null });
  assert.equal(count(db, 'items'), 1);
  assert.equal(count(db, 'item_snapshots'), 1);
  db.exec('DROP TRIGGER fail_second_bridge');
  migration065.up(db);
  assert.equal(identity(db, 'legacy-a').id, a.id);
  assert.notEqual(identity(db, 'legacy-b').id, a.id);
  assert.equal(count(db, 'items'), 2);
  assert.equal(count(db, 'item_snapshots'), 2);
  migration065.up(db);
  assert.equal(count(db, 'items'), 2);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});

test('identity Item can be compiled into item_ref and mounted on its own and another Board, with retained retired readbacks', async (t) => {
  const db = await fixture(t);
  const ownBoard = open(db, 'Own board');
  const otherBoard = open(db, 'Other board');
  const item = identity(db, ownBoard.id);
  const itemBefore = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id);
  const block = createClientNoteBlock(db, USER, NOTE, PROJECT, {
    client_create_key: 'identity-item-ref', block_type: 'item_ref', content_json: { item_id: item.id },
  });
  assert.equal(block.status, 'applied');
  if (block.status !== 'applied') return;
  assert.equal(block.block.plain_text, null);
  assert.deepEqual(JSON.parse(block.block.content_json as string), { item_id: item.id });
  for (const board of [ownBoard, otherBoard]) {
    const mounted = db.transaction(() => mountBoardMember(db, USER, board.id,
      { member_kind: 'item', member_id: item.id }))();
    assert.equal(mounted.member.reference.state, 'available');
    assert.equal(mounted.member.reference.summary, item.plain_text);
  }
  assert.deepEqual(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id), itemBefore);
  db.transaction(() => deleteBoard(db, USER, ownBoard.id))();
  assert.equal(getBoard(db, USER, otherBoard.id).members[0].reference.item_status, 'retired');
  assert.equal(listItemSummaries(db, USER, [item.id])[0].status, 'retired');
  assert.deepEqual(JSON.parse((db.prepare('SELECT content_json FROM note_blocks WHERE id = ?')
    .get(block.block.id) as { content_json: string }).content_json), { item_id: item.id });
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});
