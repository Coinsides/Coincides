/**
 * Coincides — Database Migration Runner (PostgreSQL)
 * 
 * Manages schema evolution through versioned migration files.
 * Each migration runs exactly once, tracked by the db_migrations table.
 * 
 * Usage: Called automatically during initDb() on server startup.
 * 
 * Migration files live in ./migrations/ and are named:
 *   001_description.ts
 *   002_description.ts
 *   ...
 * 
 * Each migration exports: { id: string, description: string, up: (client) => Promise<void> }
 * 
 * NOTE: For the PostgreSQL migration (v1.8), all SQLite migrations (001-014) are
 * already baked into the base schema.sql. New PostgreSQL-only migrations start at 015+.
 */

import pg from 'pg';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool, query } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
  id: string;
  description: string;
  up: (client: pg.PoolClient) => Promise<void>;
}

/**
 * Get the set of already-applied migration IDs.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await query('SELECT id FROM db_migrations');
    return new Set(result.rows.map((r: { id: string }) => r.id));
  } catch {
    // Table might not exist yet (first run handled by schema.sql)
    return new Set();
  }
}

/**
 * Dynamically load all migration modules from the migrations-pg/ directory.
 * Returns them sorted by filename (which determines execution order).
 * 
 * PostgreSQL migrations live in a separate directory from the old SQLite ones.
 */
async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = join(__dirname, 'migrations-pg');
  
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();
  } catch {
    // No migrations-pg/ directory yet — that's fine
    return [];
  }

  const migrations: Migration[] = [];
  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const mod = await import(filePath);
    const migration: Migration = mod.default || mod;
    
    if (!migration.id || !migration.description || !migration.up) {
      console.warn(`⚠ Skipping invalid migration file: ${file} (missing id, description, or up)`);
      continue;
    }
    
    migrations.push(migration);
  }

  return migrations;
}

/**
 * Mark all SQLite migrations (001-014) as applied.
 * This prevents the system from trying to re-run them since their
 * changes are already baked into the PostgreSQL schema.sql.
 */
async function markSqliteMigrationsAsApplied(): Promise<void> {
  const sqliteMigrations = [
    { id: '001_baseline', description: 'Baseline schema (baked into PG schema)' },
    { id: '002_task_upgrade', description: 'Task data model upgrade (baked into PG schema)' },
    { id: '003_goal_nesting', description: 'Goal nesting support (baked into PG schema)' },
    { id: '004_task_serves_must', description: 'Task serves_must field (baked into PG schema)' },
    { id: '005_goal_sort_order', description: 'Goal sort_order field (baked into PG schema)' },
    { id: '006_onboarding', description: 'Onboarding flag (baked into PG schema)' },
    { id: '007_time_blocks', description: 'Time blocks table (baked into PG schema)' },
    { id: '008_goal_dependencies', description: 'Goal dependencies (baked into PG schema)' },
    { id: '009_task_time_block', description: 'Task time_block_id FK (baked into PG schema)' },
    { id: '010_enforce_card_sections', description: 'Enforce card sections (baked into PG schema)' },
    { id: '011_task_cards', description: 'Task-card junction table (baked into PG schema)' },
    { id: '012_time_block_templates', description: 'Time block template system (baked into PG schema)' },
    { id: '013_time_block_instances', description: 'Time block instances (baked into PG schema)' },
    { id: '014_fix_tasks_fk', description: 'Fix tasks FK (baked into PG schema)' },
  ];

  for (const m of sqliteMigrations) {
    await query(
      `INSERT INTO db_migrations (id, description, applied_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.description]
    );
  }
}

/**
 * Run all pending migrations in order.
 * Each migration runs inside a transaction for atomicity.
 * 
 * @returns Number of migrations applied
 */
export async function runMigrations(): Promise<number> {
  // Mark old SQLite migrations as applied (idempotent)
  await markSqliteMigrationsAsApplied();

  const applied = await getAppliedMigrations();
  const allMigrations = await loadMigrations();
  
  const pending = allMigrations.filter(m => !applied.has(m.id));
  
  if (pending.length === 0) {
    return 0;
  }

  console.log(`\n📦 Running ${pending.length} pending migration(s)...`);

  const pool = getPool();
  let count = 0;

  for (const migration of pending) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Run the migration
      await migration.up(client);
      
      // Record it
      await client.query(
        'INSERT INTO db_migrations (id, description) VALUES ($1, $2)',
        [migration.id, migration.description]
      );
      
      await client.query('COMMIT');
      console.log(`  ✅ ${migration.id}: ${migration.description}`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ Migration ${migration.id} failed:`, err);
      throw new Error(
        `Migration ${migration.id} ("${migration.description}") failed. ` +
        `Database may be in an inconsistent state. ` +
        `Fix the migration and restart the server.`
      );
    } finally {
      client.release();
    }
  }

  console.log(`📦 Migrations complete (${count} applied).\n`);
  return count;
}
