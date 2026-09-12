import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import type Database from 'better-sqlite3';
import { runMigrations, type Migration } from '../db/migrate.js';
import migration063 from '../db/migrations/063_v13_atomic_text_save_revision.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

const retainedTables = [
  'notes', 'note_block_placements', 'annotation_truths', 'annotation_ranges',
  'purposes', 'boards', 'board_members', 'board_text_ranges', 'events',
];

function rows(db: Database.Database, table: string) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
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
  const fresh = await createV13BoardsFixture();
  t.after(() => fresh.close());
  const upgrade = await createV13BoardsFixture({ beforeTextSaveRevisionMigration: true });
  t.after(() => upgrade.close());
  seedHistory(upgrade);
  const beforeBlocks = rows(upgrade, 'note_blocks');
  const before = retainedTables.map((table) => rows(upgrade, table));
  assert.equal((upgrade.pragma('table_info(note_blocks)') as Array<{ name: string }>)
    .some((column) => column.name === 'text_save_revision'), false);

  upgrade.transaction(() => migration063.up(upgrade))();

  for (const table of ['note_blocks', ...retainedTables]) {
    assert.deepEqual(upgrade.pragma(`table_info(${table})`), fresh.pragma(`table_info(${table})`));
    assert.deepEqual(upgrade.pragma(`foreign_key_list(${table})`), fresh.pragma(`foreign_key_list(${table})`));
    assert.deepEqual(upgrade.pragma(`index_list(${table})`), fresh.pragma(`index_list(${table})`));
  }
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
});

test('063 is recorded by the real migration runner exactly once and preserves prior ledger entries', async (t) => {
  const db = await createV13BoardsFixture({ beforeTextSaveRevisionMigration: true });
  t.after(() => db.close());
  seedHistory(db);
  db.exec(`CREATE TABLE db_migrations (id TEXT PRIMARY KEY, description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const directory = new URL('../db/migrations/', import.meta.url);
  const priorFiles = readdirSync(directory).filter((file) => file.endsWith('.ts') && file < '063_').sort();
  for (const file of priorFiles) {
    const { default: migration } = await import(new URL(file, directory).href) as { default: Migration };
    db.prepare('INSERT INTO db_migrations (id, description, applied_at) VALUES (?, ?, ?)')
      .run(migration.id, migration.description, 'historical-applied-at');
  }
  const priorLedger = rows(db, 'db_migrations');
  const history = retainedTables.map((table) => rows(db, table));

  assert.equal(await runMigrations(db), 1);
  assert.deepEqual(rows(db, 'db_migrations').slice(0, -1), priorLedger);
  const newEntry = db.prepare('SELECT id, description FROM db_migrations WHERE id = ?').get(migration063.id);
  assert.deepEqual(newEntry, { id: migration063.id, description: migration063.description });
  assert.equal(await runMigrations(db), 0);
  assert.equal(rows(db, 'db_migrations').length, priorLedger.length + 1);
  assert.deepEqual(retainedTables.map((table) => rows(db, table)), history);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});
