import { readFileSync, readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

interface FixtureOptions {
  beforeBoardsMigration?: boolean;
  beforeChalkMigration?: boolean;
  beforeStagingMigration?: boolean;
  beforeLayersMigration?: boolean;
  beforeTextSaveRevisionMigration?: boolean;
}

/** Real schema/migrations in a disposable connection, without app startup or seed. */
export async function createV13BoardsFixture(options: FixtureOptions = {}): Promise<Database.Database> {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    let schema = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8');
    if (Object.values(options).some(Boolean)) {
      schema = schema.replace(/,\r?\n  text_save_revision INTEGER NOT NULL DEFAULT 0 CHECK \(text_save_revision >= 0\)/, '');
    }
    if (options.beforeBoardsMigration || options.beforeChalkMigration || options.beforeStagingMigration || options.beforeLayersMigration) {
      schema = schema.replace(/-- V13\.4 layers \(migration 062\)\.[\s\S]*?(?=CREATE TABLE IF NOT EXISTS board_members)/, '')
        .replace(/  layer_id TEXT REFERENCES board_layers\(id\) ON DELETE SET NULL,\r?\n/g, '');
    }
    if (options.beforeBoardsMigration || options.beforeChalkMigration || options.beforeStagingMigration) {
      schema = schema.replace(/  placed INTEGER NOT NULL DEFAULT 1 CHECK \(placed IN \(0, 1\)\),\r?\n/, '')
        .replace(/  mounted_actor TEXT NOT NULL DEFAULT 'human',\r?\n/, '');
    }
    if (options.beforeBoardsMigration || options.beforeChalkMigration) {
      // Historical fixtures must not inherit 060's forward FK to boards or new visual kind.
      schema = schema.replace(/  origin_board_id TEXT REFERENCES boards\(id\) ON DELETE SET NULL\r?\n    CHECK \(origin_board_id IS NULL OR \(origin_note_id IS NULL AND origin_course_id IS NULL\)\),\r?\n/, '')
        .replace("'table', 'connector', 'sticky'", "'table', 'connector'");
    }
    if (options.beforeBoardsMigration) {
      const marker = '-- V13.3 library boards (migration 057)';
      const offset = schema.indexOf(marker);
      if (offset < 0) throw new Error('v13_board_base_schema_marker_missing');
      schema = schema.slice(0, offset);
    }
    // Match the base-schema statement splitting used by initDb, without calling it.
    for (const statement of schema.split(';').map((sql) => sql.trim())) {
      if (statement && !statement.startsWith('PRAGMA')) db.exec(`${statement};`);
    }
    sqliteVec.load(db);
    const directory = new URL('../../db/migrations/', import.meta.url);
    const files = readdirSync(directory).filter((file) => file.endsWith('.ts')).sort();
    for (const file of files) {
      if (options.beforeBoardsMigration && file >= '057_') continue;
      if (options.beforeChalkMigration && file >= '060_') continue;
      if (options.beforeStagingMigration && file >= '061_') continue;
      if (options.beforeLayersMigration && file >= '062_') continue;
      if (options.beforeTextSaveRevisionMigration && file >= '063_') continue;
      const { default: migration } = await import(new URL(file, directory).href) as {
        default: { up: (connection: Database.Database) => void };
      };
      db.transaction(() => migration.up(db))();
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
