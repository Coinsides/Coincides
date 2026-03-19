import type Database from 'better-sqlite3';

export default {
  id: '007_time_blocks',
  description: 'Add time_blocks and time_block_overrides tables for weekly template system',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS time_blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_time_blocks_user ON time_blocks(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_blocks_user_day ON time_blocks(user_id, day_of_week);
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS time_block_overrides (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        time_block_id TEXT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
        override_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tbo_user_date ON time_block_overrides(user_id, override_date);
    `);
  },
};
