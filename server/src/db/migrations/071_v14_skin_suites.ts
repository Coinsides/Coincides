import type Database from 'better-sqlite3';

export default {
  id: '071_v14_skin_suites',
  description: 'Add complete user appearance suites; factory presets remain code constants',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS skin_suites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 64),
        tokens_json TEXT NOT NULL,
        components_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_skin_suites_user_created ON skin_suites(user_id, created_at, id);
    `);
  },
};
