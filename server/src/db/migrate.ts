/**
 * Coincides — Database Migration Runner
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
 * Each migration exports: { id: string, description: string, up: (db) => void }
 */

import type Database from 'better-sqlite3';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
  id: string;
  description: string;
  up: (db: Database.Database) => void;
}

/**
 * Ensure the migrations tracking table exists.
 */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Get the set of already-applied migration IDs.
 */
function getAppliedMigrations(db: Database.Database): Set<string> {
  const rows = db.prepare('SELECT id FROM db_migrations').all() as { id: string }[];
  return new Set(rows.map(r => r.id));
}

/**
 * Dynamically load all migration modules from the migrations/ directory.
 * Returns them sorted by filename (which determines execution order).
 */
async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = join(__dirname, 'migrations');
  
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort(); // Lexicographic sort ensures 001 < 002 < 003
  } catch (err) {
    console.warn('migrations/ directory not found, skipping:', err);
    return [];
  }

  const migrations: Migration[] = [];
  for (const file of files) {
    const filePath = join(migrationsDir, file);
    // Dynamic import for ESM compatibility
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
 * Run all pending migrations in order.
 * Each migration runs inside a transaction for atomicity.
 * 
 * @returns Number of migrations applied
 */
export async function runMigrations(db: Database.Database): Promise<number> {
  ensureMigrationsTable(db);
  
  const applied = getAppliedMigrations(db);
  const allMigrations = await loadMigrations();
  
  const pending = allMigrations.filter(m => !applied.has(m.id));
  
  if (pending.length === 0) {
    return 0;
  }

  console.log(`\n📦 Running ${pending.length} pending migration(s)...`);

  let count = 0;
  for (const migration of pending) {
    try {
      // Run each migration in a transaction
      db.transaction(() => {
        migration.up(db);
        db.prepare(
          'INSERT INTO db_migrations (id, description) VALUES (?, ?)'
        ).run(migration.id, migration.description);
      })();

      console.log(`  ✅ ${migration.id}: ${migration.description}`);
      count++;
    } catch (err) {
      console.error(`  ❌ Migration ${migration.id} failed:`, err);
      throw new Error(
        `Migration ${migration.id} ("${migration.description}") failed. ` +
        `Database may be in an inconsistent state. ` +
        `Fix the migration and restart the server.`
      );
    }
  }

  console.log(`📦 Migrations complete (${count} applied).\n`);
  return count;
}
