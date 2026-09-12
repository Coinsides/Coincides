import assert from 'node:assert/strict';
import test from 'node:test';
import type Database from 'better-sqlite3';
import { initDb } from '../db/init.js';
import { runMigrations } from '../db/migrate.js';
import migration063 from '../db/migrations/063_v13_atomic_text_save_revision.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const retainedTables = [
  'notes', 'note_block_placements', 'annotation_truths', 'annotation_ranges',
  'purposes', 'boards', 'board_members', 'board_text_ranges', 'events',
];

function rows(db: Database.Database, table: string) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
}

type MigrationEntry = { id: string; description: string };

function currentMigrationLedger(db: Database.Database): MigrationEntry[] {
  // initDb's real runner has recorded the complete endpoint. Historical fixture
  // bodies must not be replayed from an empty ledger: old migrations need not be idempotent.
  const ledger = db.prepare('SELECT id, description FROM db_migrations ORDER BY rowid').all() as MigrationEntry[];
  assert.ok(ledger.some((entry) => entry.id === migration063.id));
  return ledger;
}

function seedPriorLedger(db: Database.Database, ledger: MigrationEntry[]): void {
  db.exec(`CREATE TABLE db_migrations (id TEXT PRIMARY KEY, description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  for (const migration of ledger.filter((entry) => entry.id < migration063.id)) {
    db.prepare('INSERT INTO db_migrations (id, description, applied_at) VALUES (?, ?, ?)')
      .run(migration.id, migration.description, 'historical-applied-at');
  }
}

function historicalRowsReader(db: Database.Database, tables: string[]) {
  // Retain every historical column and every row across later additive schema
  // migrations; the complete endpoint schema is checked separately below.
  const selections = tables.map((table) => {
    const columns = (db.pragma(`table_info(${table})`) as Array<{ name: string }>)
      .map(({ name }) => `"${name.replace(/"/g, '""')}"`).join(', ');
    return `SELECT ${columns} FROM ${table} ORDER BY rowid`;
  });
  return () => selections.map((sql) => db.prepare(sql).all());
}

type PragmaRow = Record<string, string | number | null>;

function logicalTableSchema(db: Database.Database, table: string) {
  const compare = (left: unknown, right: unknown) => JSON.stringify(left).localeCompare(JSON.stringify(right));
  // ALTER TABLE appends columns while today's base schema can place them earlier.
  // Normalize only physical column positions; retain each column's complete type,
  // nullability, default and primary-key position, and compare the full column set.
  const columns = (db.pragma(`table_info(${table})`) as PragmaRow[])
    .map(({ cid: _cid, ...column }) => column).sort(compare);
  const foreignKeyGroups = new Map<string | number | null, PragmaRow[]>();
  for (const { id, ...foreignKey } of db.pragma(`foreign_key_list(${table})`) as PragmaRow[]) {
    const group = foreignKeyGroups.get(id) ?? [];
    group.push(foreignKey);
    foreignKeyGroups.set(id, group);
  }
  // FK ids are physical enumeration; keep composite-key grouping and each seq,
  // referenced table/column and update/delete/match action exact.
  const foreignKeys = [...foreignKeyGroups.values()]
    .map((group) => group.sort((left, right) => Number(left.seq) - Number(right.seq))).sort(compare);
  const indexes = (db.pragma(`index_list(${table})`) as PragmaRow[]).map(({ seq: _seq, ...index }) => {
    const name = String(index.name).replace(/"/g, '""');
    const indexColumns = (db.pragma(`index_xinfo("${name}")`) as PragmaRow[]).map(({ cid, ...column }) => ({
      ...column,
      // Positive cids refer to the named column. Negative sentinels distinguish
      // rowid and expressions; retain them, and retain seqno/order/collation/key.
      cid: Number(cid) >= 0 ? 'named-column' : cid,
    }));
    return { ...index, columns: indexColumns };
  }).sort(compare);
  return { columns, foreignKeys, indexes };
}

function seedHistory(db: Database.Database): void {
  db.exec(`
    INSERT INTO users (id, email, password_hash, name)
      VALUES ('u', 'atomic-migration@example.invalid', 'synthetic', 'Synthetic');
    INSERT INTO courses (id, user_id, name) VALUES ('course', 'u', 'Synthetic course');
    INSERT INTO notes (id, user_id, course_id, title, metadata, created_at, updated_at)
      VALUES ('note', 'u', 'course', 'Historical note', '{"keep": [3, 2, 1]}', 'before-created', 'before-updated');
    INSERT INTO note_blocks (id, user_id, course_id, block_type, title, content_json,
      plain_text, metadata, created_at, updated_at)
      VALUES ('block', 'u', 'course', 'text', 'Historical title', '{ "text": "first body" }',
        'first body', '{ "legacy": [null, {"keep":true}] }', 'block-created', 'block-updated'),
        ('other-block', 'u', 'course', 'text', NULL, '{"text":"second body"}',
        'second body', '{}', 'other-created', 'other-updated');
    INSERT INTO note_block_placements (id, note_id, block_id, order_index, display_overrides_json)
      VALUES ('placement', 'note', 'block', 0, '{"x":1.25}'),
        ('other-placement', 'note', 'other-block', 1, '{"x":-3.5}');
    INSERT INTO annotation_truths (id, user_id, course_id, note_id, canvas_id, raw_label,
      parent_annotation_id, child_annotation_ids_json, metadata, created_at, updated_at)
      VALUES ('annotation', 'u', 'course', 'note', 'note', 'Keep this label',
        NULL, '["child"]', '{"keep":"truth"}', 'truth-created', 'truth-updated'),
        ('child', 'u', 'course', 'note', 'note', 'Keep the child',
        'annotation', '[]', '{}', 'child-created', 'child-updated');
    INSERT INTO annotation_ranges (id, user_id, annotation_id, course_id, note_id, target_kind,
      block_id, text_flow_id, text_unit_id, start_offset, end_offset, range_text_cache,
      order_index, metadata, created_at, updated_at)
      VALUES ('range', 'u', 'annotation', 'course', 'note', 'text_span', 'block',
        'textflow-block', 'unit', 0, 5, 'first', 0, '{"keep":"range"}', 'range-created', 'range-updated'),
        ('other-range', 'u', 'annotation', 'course', 'note', 'text_span', 'other-block',
        'textflow-other-block', 'unit-other', 0, 6, 'second', 1, '{}', 'other-range-created', 'other-range-updated');
    INSERT INTO purposes (id, user_id, title, created_at, updated_at)
      VALUES ('soul', 'u', 'Historical soul', 'soul-created', 'soul-updated');
    INSERT INTO boards (id, user_id, title, soul_id, project_id, created_at, updated_at)
      VALUES ('board', 'u', 'Historical board', 'soul', 'course', 'board-created', 'board-updated');
    INSERT INTO board_text_ranges (id, user_id, board_id, note_id, block_id, text_flow_id,
      text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets, at, created_at, updated_at)
      VALUES ('board-range', 'u', 'board', 'note', 'block', 'textflow-block', 'unit',
        0, 5, 'first', 'drifted', '{"start_offset":0,"end_offset":5}',
        'selected-at', 'board-range-created', 'board-range-updated');
    INSERT INTO board_members (id, board_id, member_kind, member_id, created_at, updated_at)
      VALUES ('member', 'board', 'text_range', 'board-range', 'member-created', 'member-updated');
    INSERT INTO events (user_id, actor_kind, channel, verb, objects, summary, meta)
      VALUES ('u', 'human', 'ui', 'mounted', '["board-range"]', 'Historical receipt', '{"keep":true}');
  `);
}

test('063 fresh and pre-063 upgrade converge without changing historical text, annotations, ranges or receipts', async (t) => {
  const startup = await initDb(':memory:');
  t.after(() => startup.close());
  const currentLedger = currentMigrationLedger(startup);
  // Compare an empty database and one containing history through the same
  // pre-063 schema and full runner. Today's base schema may backfill columns
  // at different physical positions; keep every PRAGMA field, including cid, exact.
  const fresh = await createV13BoardsFixture({ beforeTextSaveRevisionMigration: true });
  t.after(() => fresh.close());
  seedPriorLedger(fresh, currentLedger);
  assert.equal(await runMigrations(fresh), currentLedger.filter((entry) => entry.id >= migration063.id).length);
  const upgrade = await createV13BoardsFixture({ beforeTextSaveRevisionMigration: true });
  t.after(() => upgrade.close());
  seedHistory(upgrade);
  const beforeBlocks = rows(upgrade, 'note_blocks');
  const before = retainedTables.map((table) => rows(upgrade, table));
  assert.equal((upgrade.pragma('table_info(note_blocks)') as Array<{ name: string }>)
    .some((column) => column.name === 'text_save_revision'), false);

  upgrade.transaction(() => migration063.up(upgrade))();

  assert.deepEqual(rows(upgrade, 'note_blocks'), beforeBlocks.map((row) => ({
    ...(row as Record<string, unknown>), text_save_revision: 0,
  })));
  assert.deepEqual(retainedTables.map((table) => rows(upgrade, table)), before);
  assert.deepEqual(upgrade.pragma('foreign_key_check'), []);

  upgrade.prepare("UPDATE note_blocks SET text_save_revision = 7 WHERE id = 'block'").run();
  const afterFirstSave = rows(upgrade, 'note_blocks');
  upgrade.transaction(() => migration063.up(upgrade))();
  assert.deepEqual(rows(upgrade, 'note_blocks'), afterFirstSave);
  assert.deepEqual(retainedTables.map((table) => rows(upgrade, table)), before);

  // Keep 063's exact no-change assertions above before later migrations add
  // their own fields (065's board identity, for example), then reach today's endpoint.
  const readHistory = historicalRowsReader(upgrade, ['note_blocks', ...retainedTables]);
  const history = readHistory();
  seedPriorLedger(upgrade, currentLedger);
  assert.equal(await runMigrations(upgrade), currentLedger.filter((entry) => entry.id >= migration063.id).length);
  for (const table of ['note_blocks', ...retainedTables]) {
    assert.deepEqual(upgrade.pragma(`table_info(${table})`), fresh.pragma(`table_info(${table})`));
    assert.deepEqual(upgrade.pragma(`foreign_key_list(${table})`), fresh.pragma(`foreign_key_list(${table})`));
    assert.deepEqual(upgrade.pragma(`index_list(${table})`), fresh.pragma(`index_list(${table})`));
    // Also compare the independent, real startup schema; the two historical
    // fixtures above must not become the only schema oracle for one another.
    assert.deepEqual(logicalTableSchema(upgrade, table), logicalTableSchema(startup, table));
  }
  assert.deepEqual(readHistory(), history);
  assert.deepEqual(upgrade.pragma('foreign_key_check'), []);
});

test('063 is recorded by the real migration runner exactly once and preserves prior ledger entries', async (t) => {
  const fresh = await initDb(':memory:');
  t.after(() => fresh.close());
  const currentLedger = currentMigrationLedger(fresh);
  const pendingLedger = currentLedger.filter((entry) => entry.id >= migration063.id);
  const db = await createV13BoardsFixture({ beforeTextSaveRevisionMigration: true });
  t.after(() => db.close());
  seedHistory(db);
  seedPriorLedger(db, currentLedger);
  const priorLedger = rows(db, 'db_migrations');
  const readHistory = historicalRowsReader(db, retainedTables);
  const history = readHistory();

  assert.equal(await runMigrations(db), pendingLedger.length);
  assert.deepEqual(rows(db, 'db_migrations').slice(0, priorLedger.length), priorLedger);
  assert.deepEqual(db.prepare('SELECT id, description FROM db_migrations ORDER BY rowid').all(), currentLedger);
  const newEntry = db.prepare('SELECT id, description FROM db_migrations WHERE id = ?').get(migration063.id);
  assert.deepEqual(newEntry, { id: migration063.id, description: migration063.description });
  const currentRows = ['note_blocks', ...retainedTables, 'db_migrations'].map((table) => rows(db, table));
  assert.equal(await runMigrations(db), 0);
  assert.equal(rows(db, 'db_migrations').length, priorLedger.length + pendingLedger.length);
  assert.deepEqual(['note_blocks', ...retainedTables, 'db_migrations'].map((table) => rows(db, table)), currentRows);
  assert.deepEqual(readHistory(), history);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});
