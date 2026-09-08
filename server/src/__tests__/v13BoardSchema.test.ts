import assert from 'node:assert/strict';
import test from 'node:test';
import type Database from 'better-sqlite3';
import migration057 from '../db/migrations/057_v13_boards.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const TABLES = ['boards', 'board_members', 'board_edges', 'board_visuals', 'purposes', 'purpose_members'];

function schemaShape(db: Database.Database) {
  const placeholders = TABLES.map(() => '?').join(',');
  return (db.prepare(`
    SELECT type, name, tbl_name, sql FROM sqlite_master
    WHERE tbl_name IN (${placeholders}) ORDER BY name
  `).all(...TABLES) as Array<{ sql: string | null }>).map((row) => ({
    ...row, sql: row.sql?.replace(/\s+/g, ' ').trim() ?? null,
  }));
}

function seedOwner(db: Database.Database): void {
  db.exec(`
    INSERT INTO users (id, email, password_hash, name)
      VALUES ('u', 'synthetic-board@example.invalid', 'not-a-credential', 'Synthetic');
    INSERT INTO courses (id, user_id, name) VALUES ('project', 'u', 'Synthetic');
    INSERT INTO notes (id, user_id, course_id, title) VALUES ('note', 'u', 'project', 'Synthetic note');
  `);
}

function soul(db: Database.Database, id: string): void {
  db.prepare(`INSERT INTO purposes (id, user_id, title, created_at, updated_at)
    VALUES (?, 'u', 'Synthetic purpose', '2026-09-08', '2026-09-08')`).run(id);
}

function board(db: Database.Database, id: string, soulId: string | null, projectId: string | null = null): void {
  db.prepare(`INSERT INTO boards (id, user_id, title, soul_id, project_id, created_at, updated_at)
    VALUES (?, 'u', 'Synthetic board', ?, ?, '2026-09-08', '2026-09-08')`).run(id, soulId, projectId);
}

test('057 fresh and actual pre-057 upgrade converge, retaining historical souls, membership and birth receipts', async (t) => {
  const fresh = await createV13BoardsFixture();
  t.after(() => fresh.close());
  const upgrade = await createV13BoardsFixture({ beforeBoardsMigration: true });
  t.after(() => upgrade.close());
  seedOwner(upgrade);
  upgrade.exec(`
    INSERT INTO purposes (id, user_id, course_id, note_id, title, is_note_default, created_at, updated_at)
      VALUES ('legacy-soul', 'u', 'project', 'note', 'Keep this existing soul', 1, 'before', 'before');
    INSERT INTO purpose_members (id, user_id, purpose_id, member_kind, member_id, created_at, updated_at)
      VALUES ('legacy-membership', 'u', 'legacy-soul', 'item', 'item-a', 'before', 'before');
    INSERT INTO items (id, user_id, plain_text) VALUES ('item-a', 'u', 'A'), ('item-b', 'u', 'B');
    INSERT INTO item_snapshots (id, item_id, user_id, content, content_hash)
      VALUES ('snapshot-a', 'item-a', 'u', 'A', 'a'), ('snapshot-b', 'item-b', 'u', 'B', 'b');
    INSERT INTO relations (id, user_id, from_item_id, to_item_id, relation_type,
      from_snapshot_id, to_snapshot_id, origin_purpose_id, affirmed_at)
      VALUES ('birth-receipt', 'u', 'item-a', 'item-b', 'supports',
        'snapshot-a', 'snapshot-b', 'legacy-soul', 'before');
  `);
  const retainedTables = ['purposes', 'purpose_members', 'relations'];
  const before = retainedTables.map((table) => upgrade.prepare(`SELECT * FROM ${table}`).all());
  const legacyPurposesSql = upgrade.prepare("SELECT sql FROM sqlite_master WHERE name = 'purposes'").get();
  upgrade.transaction(() => migration057.up(upgrade))();

  assert.deepEqual(schemaShape(fresh), schemaShape(upgrade));
  for (const table of TABLES) {
    assert.deepEqual(fresh.pragma(`table_info(${table})`), upgrade.pragma(`table_info(${table})`));
    assert.deepEqual(fresh.pragma(`foreign_key_list(${table})`), upgrade.pragma(`foreign_key_list(${table})`));
    assert.deepEqual(fresh.pragma(`index_list(${table})`), upgrade.pragma(`index_list(${table})`));
  }
  assert.deepEqual(retainedTables.map((table) => upgrade.prepare(`SELECT * FROM ${table}`).all()), before);
  assert.deepEqual(upgrade.prepare("SELECT sql FROM sqlite_master WHERE name = 'purposes'").get(), legacyPurposesSql);
  assert.equal(upgrade.prepare("SELECT 1 FROM sqlite_master WHERE name = 'idx_purposes_note_default'").get(), undefined);
  assert.deepEqual(upgrade.pragma('foreign_key_check'), []);
  const shape = schemaShape(upgrade);
  upgrade.transaction(() => migration057.up(upgrade))();
  assert.deepEqual(schemaShape(upgrade), shape);
  assert.deepEqual(retainedTables.map((table) => upgrade.prepare(`SELECT * FROM ${table}`).all()), before);
});

test('057 enforces a nonempty soul link, one board per soul and weak project ownership', async (t) => {
  const db = await createV13BoardsFixture();
  t.after(() => db.close());
  seedOwner(db);
  soul(db, 'soul');
  assert.throws(() => board(db, 'missing-soul', null), /NOT NULL constraint failed: boards.soul_id/);
  assert.throws(() => board(db, 'unknown-soul', 'missing'), /FOREIGN KEY constraint failed/);
  board(db, 'board', 'soul', 'project');
  assert.throws(() => board(db, 'duplicate-soul', 'soul'), /UNIQUE constraint failed: boards.soul_id/);
  assert.throws(() => db.exec("DELETE FROM purposes WHERE id = 'soul'"), /FOREIGN KEY constraint failed/);
  db.exec("DELETE FROM courses WHERE id = 'project'");
  assert.deepEqual(db.prepare('SELECT soul_id, project_id, viewport FROM boards').get(), {
    soul_id: 'soul', project_id: null, viewport: '{"x":0,"y":0,"zoom":1}',
  });
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM purposes').get() as { n: number }).n, 1);
  db.exec("UPDATE purposes SET status = 'sealed' WHERE id = 'soul'");
  assert.deepEqual(db.prepare('SELECT status FROM purposes').get(), { status: 'sealed' });
});

test('057 keeps exactly four reference kinds, links edges to member instances and owns all five visual kinds', async (t) => {
  const db = await createV13BoardsFixture();
  t.after(() => db.close());
  seedOwner(db);
  soul(db, 'soul');
  soul(db, 'soul-2');
  board(db, 'board', 'soul');
  board(db, 'board-2', 'soul-2');
  const mount = db.prepare(`INSERT INTO board_members (id, board_id, member_kind, member_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'synthetic', 'synthetic')`);
  for (const kind of ['note', 'item', 'content_group', 'text_range']) mount.run(kind, 'board', kind, `${kind}-identity`);
  assert.throws(() => mount.run('shape', 'board', 'shape', 'visual'), /CHECK constraint failed/);
  // Two mounts may refer to one identity. Edges point to their distinct instance IDs.
  mount.run('note-copy', 'board', 'note', 'note-identity');
  mount.run('other-board', 'board-2', 'note', 'note-identity');
  const edge = db.prepare(`INSERT INTO board_edges (id, board_id, from_member_id, to_member_id, created_at)
    VALUES (?, 'board', ?, ?, 'synthetic')`);
  edge.run('edge', 'note', 'content_group');
  assert.throws(() => edge.run('different-board', 'note', 'other-board'), /FOREIGN KEY constraint failed/);
  db.exec("DELETE FROM board_members WHERE id = 'note'");
  assert.deepEqual(db.prepare('SELECT * FROM board_edges').all(), []);
  assert.ok(db.prepare("SELECT id FROM board_members WHERE id = 'note-copy'").get());
  assert.ok(db.prepare("SELECT id FROM notes WHERE id = 'note'").get());

  const data = {
    points: [{ x: -9.5, y: 20, pressure: 0.7 }], path: 'M -9.5 20 L 5 6',
    style: { stroke: '#123456', lineDash: [2, 3], startArrow: 'circle' },
    endpoints: [{ x: 1.25, y: -4 }, { x: 99, y: 18 }],
    extensions: { original: { arbitrary: ['untouched', null, { nested: true }] } },
  };
  const visual = db.prepare(`INSERT INTO board_visuals
    (id, board_id, visual_kind, x, y, w, h, rotation, data, metadata, created_at, updated_at)
    VALUES (?, 'board', ?, -9.5, 20, 83.25, 19, 47.5, ?, ?, 'synthetic', 'synthetic')`);
  for (const kind of ['freehand', 'shape', 'image', 'table', 'connector']) {
    visual.run(kind, kind, JSON.stringify(data), '{"legacyPlacement":{"snapState":"none"}}');
    const row = db.prepare('SELECT x, y, w, h, rotation, data, metadata FROM board_visuals WHERE id = ?').get(kind) as {
      x: number; y: number; w: number; h: number; rotation: number; data: string; metadata: string;
    };
    assert.deepEqual({ ...row, data: JSON.parse(row.data) }, {
      x: -9.5, y: 20, w: 83.25, h: 19, rotation: 47.5, data,
      metadata: '{"legacyPlacement":{"snapState":"none"}}',
    });
  }
  assert.throws(() => visual.run('invalid', 'note', '{}', '{}'), /CHECK constraint failed/);
  const columns = db.pragma('table_info(board_members)') as Array<{ name: string }>;
  assert.equal(columns.some((column) => column.name === 'rotation'), false);
  assert.deepEqual(db.prepare('SELECT * FROM purpose_members').all(), []);
});

test('057 bans new note/default and membership writes while historical rows remain active and readable', async (t) => {
  const db = await createV13BoardsFixture({ beforeBoardsMigration: true });
  t.after(() => db.close());
  seedOwner(db);
  db.exec(`
    INSERT INTO purposes (id, user_id, note_id, title, is_note_default, created_at, updated_at)
      VALUES ('legacy', 'u', 'note', 'Existing', 1, 'before', 'before');
    INSERT INTO purpose_members (id, user_id, purpose_id, member_kind, member_id, created_at, updated_at)
      VALUES ('legacy-member', 'u', 'legacy', 'content_group', 'old-group', 'before', 'before');
  `);
  db.transaction(() => migration057.up(db))();
  soul(db, 'new-soul');
  assert.throws(() => db.exec(`INSERT INTO purposes (id, user_id, note_id, title, created_at, updated_at)
    VALUES ('new-note', 'u', 'note', 'Rejected', 'now', 'now')`), /note_purpose_writer_retired/);
  assert.throws(() => db.exec(`INSERT INTO purposes
    (id, user_id, note_id, title, is_note_default, created_at, updated_at)
    VALUES ('new-default', 'u', 'note', 'Rejected', 1, 'now', 'now')`), /note_purpose_writer_retired/);
  assert.throws(() => db.exec("UPDATE purposes SET note_id = 'note' WHERE id = 'new-soul'"), /note_purpose_writer_retired/);
  assert.throws(() => db.exec("UPDATE purposes SET is_note_default = 0 WHERE id = 'legacy'"), /note_purpose_writer_retired/);
  // Unchanged legacy fields may accompany other updates without erasing history.
  db.exec("UPDATE purposes SET note_id = note_id, is_note_default = is_note_default WHERE id = 'legacy'");
  assert.deepEqual(db.prepare("SELECT note_id, is_note_default, status FROM purposes WHERE id = 'legacy'").get(), {
    note_id: 'note', is_note_default: 1, status: 'active',
  });
  assert.throws(() => db.exec(`INSERT INTO purpose_members
    (id, user_id, purpose_id, member_kind, member_id, created_at, updated_at)
    VALUES ('new-member', 'u', 'new-soul', 'note', 'note', 'now', 'now')`), /purpose_members_writer_retired/);
  assert.throws(() => db.exec("UPDATE purpose_members SET role = 'new-role' WHERE id = 'legacy-member'"), /purpose_members_writer_retired/);
  board(db, 'legacy-board', 'legacy');
  assert.throws(() => db.exec("DELETE FROM notes WHERE id = 'note'"), /FOREIGN KEY constraint failed/);
  assert.ok(db.prepare("SELECT id FROM purposes WHERE id = 'legacy'").get());
  assert.ok(db.prepare("SELECT id FROM purpose_members WHERE id = 'legacy-member'").get());
});
