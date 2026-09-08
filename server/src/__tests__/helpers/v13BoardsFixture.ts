import { readFileSync, readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

interface FixtureOptions {
  beforeBoardsMigration?: boolean;
}

/** Real schema/migrations in a disposable connection, without app startup or seed. */
export async function createV13BoardsFixture(options: FixtureOptions = {}): Promise<Database.Database> {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    let schema = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8');
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
