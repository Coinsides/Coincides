import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Database from 'better-sqlite3';

import { runMigrations } from '../src/db/migrate.js';

const TARGET_MIGRATION_ID = '048_v2_operation_batches_created_at_timestamp_fix';
const MIGRATIONS_DIR = fileURLToPath(new URL('../src/db/migrations/', import.meta.url));

function currentMigrationIds(): string[] {
  return [...new Set(readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .map((file) => file.slice(0, file.lastIndexOf('.'))))]
    .sort();
}

function pairOrder(db: Database.Database, firstId: string, secondId: string): string[] {
  return (db.prepare(`
    SELECT id
    FROM operation_batches
    WHERE id IN (?, ?)
    ORDER BY created_at ASC, id ASC
  `).all(firstId, secondId) as Array<{ id: string }>).map((row) => row.id);
}

function auditedUpdateCount(db: Database.Database): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM migration_update_audit').get() as { count: number }).count;
}

test('048 runner normalizes only ISO Z operation batch timestamps and remains idempotent', async () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE operation_batches (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
      CREATE TABLE db_migrations (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TEMP TABLE migration_update_audit (operation_batch_id TEXT NOT NULL);
      CREATE TEMP TRIGGER audit_operation_batch_created_at_updates
      AFTER UPDATE OF created_at ON operation_batches
      BEGIN
        INSERT INTO migration_update_audit (operation_batch_id) VALUES (NEW.id);
      END;
    `);

    const migrationIds = currentMigrationIds();
    assert.equal(migrationIds.includes(TARGET_MIGRATION_ID), true);
    const markApplied = db.prepare('INSERT INTO db_migrations (id, description) VALUES (?, ?)');
    for (const migrationId of migrationIds) {
      if (migrationId !== TARGET_MIGRATION_ID) {
        markApplied.run(migrationId, 'Pre-applied by isolated migration fixture');
      }
    }

    const sqliteRows = Array.from({ length: 102 }, (_, index) => ({
      id: `sqlite-${String(index).padStart(3, '0')}`,
      createdAt: new Date(Date.UTC(2026, 6, 1, 0, 0, index))
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19),
    }));
    const manualId = 'manual-known-later';
    sqliteRows.push({ id: manualId, createdAt: '2026-08-21 17:07:37' });
    const clientId = 'client-known-earlier';
    const isoRows = [
      { id: clientId, createdAt: '2026-08-21T17:05:59.322Z' },
      { id: 'client-second-iso', createdAt: '2026-08-22T10:11:12.456Z' },
    ];
    const insert = db.prepare('INSERT INTO operation_batches (id, created_at) VALUES (?, ?)');
    for (const row of [...sqliteRows, ...isoRows]) insert.run(row.id, row.createdAt);

    assert.equal(sqliteRows.length, 103);
    assert.equal(isoRows.length, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM operation_batches').get() as { count: number }).count, 105);
    assert.deepEqual(pairOrder(db, clientId, manualId), [manualId, clientId]);

    db.prepare('UPDATE operation_batches SET created_at = created_at WHERE id = ?').run(manualId);
    assert.equal(auditedUpdateCount(db), 1);
    db.prepare('DELETE FROM migration_update_audit').run();

    const nonTargetBytesBefore = db.prepare(`
      SELECT id, hex(CAST(created_at AS BLOB)) AS created_at_bytes
      FROM operation_batches
      WHERE created_at NOT LIKE '%T%Z'
      ORDER BY id ASC
    `).all();
    assert.equal(nonTargetBytesBefore.length, 103);

    const firstApplied = await runMigrations(db);
    const firstChanges = auditedUpdateCount(db);
    assert.equal(firstApplied, 1);
    assert.equal(firstChanges, 2);

    const nonTargetBytesAfter = db.prepare(`
      SELECT id, hex(CAST(created_at AS BLOB)) AS created_at_bytes
      FROM operation_batches
      WHERE id NOT IN (?, ?)
      ORDER BY id ASC
    `).all(clientId, 'client-second-iso');
    assert.deepEqual(nonTargetBytesAfter, nonTargetBytesBefore);

    const normalizedRows = db.prepare('SELECT created_at FROM operation_batches').all() as Array<{ created_at: string }>;
    assert.equal(normalizedRows.length, 105);
    for (const row of normalizedRows) {
      assert.match(row.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
    assert.deepEqual(pairOrder(db, clientId, manualId), [clientId, manualId]);

    const updatesBeforeNormalRerun = auditedUpdateCount(db);
    const normalSecondApplied = await runMigrations(db);
    assert.equal(normalSecondApplied, 0);
    assert.equal(auditedUpdateCount(db), updatesBeforeNormalRerun);

    db.prepare('DELETE FROM db_migrations WHERE id = ?').run(TARGET_MIGRATION_ID);
    db.prepare('DELETE FROM migration_update_audit').run();
    const rearmedSecondApplied = await runMigrations(db);
    const secondChanges = auditedUpdateCount(db);
    assert.equal(rearmedSecondApplied, 1);
    assert.equal(secondChanges, 0);
  } finally {
    db.close();
  }
});
