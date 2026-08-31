import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import migration012 from '../db/migrations/012_time_block_templates.js';
import migration026 from '../db/migrations/026_v2_composition_templates.js';
import migration027 from '../db/migrations/027_v2_domain_packages.js';
import migration028 from '../db/migrations/028_v2_template_migration_proposals.js';
import migration029 from '../db/migrations/029_v2_package_import_export.js';
import migration030 from '../db/migrations/030_v2_domain_refinement_proposals.js';
import migration053 from '../db/migrations/053_v2_template_studio_decommission.js';
import {
  createClientNoteBlock,
  discardClientNoteBlockCreate,
} from '../services/noteBlockLifecycle.js';

const RETIRED_TABLES = [
  'composition_templates',
  'composition_instances',
  'composition_instance_slots',
  'package_manifests',
  'domain_block_sets',
  'domain_block_set_templates',
  'domain_block_set_compositions',
  'template_migration_mappings',
  'template_migration_records',
  'template_migration_record_items',
  'package_exports',
  'package_import_previews',
  'package_import_records',
  'package_import_record_items',
  'domain_refinement_mappings',
  'domain_refinement_records',
  'domain_refinement_record_items',
  'domain_object_classifications',
] as const;

const RUNTIME_TABLES = [
  'template_definitions',
  'study_mode_templates',
  'time_block_templates',
  'time_block_template_sets',
] as const;

const RETIRED_BLOCKERS = [
  'composition',
  'template_migration_history',
  'package_history',
  'domain_refinement_history',
  'domain_classification',
] as const;

const schemaSql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

function tableExists(db: Database.Database, tableName: string): boolean {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName));
}

function assertRetiredTablesAbsent(db: Database.Database, pathName: string): void {
  for (const tableName of RETIRED_TABLES) {
    assert.equal(tableExists(db, tableName), false, `${pathName}: ${tableName} must be absent`);
  }
}

function assertRuntimeTablesPresent(db: Database.Database, pathName: string): void {
  for (const tableName of RUNTIME_TABLES) {
    assert.equal(tableExists(db, tableName), true, `${pathName}: ${tableName} must remain`);
  }
}

test('12.10-b closes Template Studio storage and lifecycle blockers without touching runtime templates', async () => {
  const freshDb = new Database(':memory:');
  const upgradeDb = new Database(':memory:');
  const lifecycleDir = mkdtempSync(join(tmpdir(), 'coincides-template-studio-decommission-'));
  let lifecycleDb: Awaited<ReturnType<typeof initDb>> | null = null;
  try {
    freshDb.pragma('foreign_keys = ON');
    freshDb.exec(schemaSql);
    migration012.up(freshDb);
    assertRetiredTablesAbsent(freshDb, 'fresh schema');
    assertRuntimeTablesPresent(freshDb, 'fresh schema');

    upgradeDb.pragma('foreign_keys = ON');
    upgradeDb.exec(schemaSql);
    migration012.up(upgradeDb);
    for (const migration of [migration026, migration027, migration028, migration029, migration030]) {
      migration.up(upgradeDb);
    }
    for (const tableName of RETIRED_TABLES) {
      assert.equal(tableExists(upgradeDb, tableName), true, `upgrade setup: ${tableName} must exist`);
    }
    migration053.up(upgradeDb);
    assertRetiredTablesAbsent(upgradeDb, 'upgrade migration');
    assertRuntimeTablesPresent(upgradeDb, 'upgrade migration');

    lifecycleDb = await initDb(join(lifecycleDir, 'lifecycle.db'));
    const userId = uuidv4();
    const courseId = uuidv4();
    const noteId = uuidv4();
    lifecycleDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, 'hash', 'Decommission User', datetime('now'))
    `).run(userId, `${userId}@example.com`);
    lifecycleDb.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, 'Decommission Project', datetime('now'), datetime('now'))
    `).run(courseId, userId);
    lifecycleDb.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(noteId, userId, courseId, 'Decommission Note');

    const created = createClientNoteBlock(lifecycleDb, userId, noteId, courseId, {
      client_create_key: 'template-studio-decommission-delete',
      block_type: 'paragraph',
    });
    assert.equal(created.status, 'applied');
    assert.equal(created.created, true);
    const discarded = discardClientNoteBlockCreate(
      lifecycleDb,
      userId,
      noteId,
      courseId,
      'template-studio-decommission-delete',
    );
    assert.equal(discarded.discarded, true);
    const remainingBlocks = lifecycleDb.prepare(
      'SELECT COUNT(*) AS count FROM note_blocks WHERE id = ?',
    ).get(discarded.block_id) as { count: number };
    assert.equal(remainingBlocks.count, 0);

    const lifecycleSource = readFileSync(
      new URL('../services/noteBlockLifecycle.ts', import.meta.url),
      'utf8',
    );
    for (const blocker of RETIRED_BLOCKERS) {
      assert.equal(lifecycleSource.includes(blocker), false, `retired blocker must be absent: ${blocker}`);
    }
  } finally {
    freshDb.close();
    upgradeDb.close();
    if (lifecycleDb) closeDb();
    rmSync(lifecycleDir, { recursive: true, force: true });
  }
});
