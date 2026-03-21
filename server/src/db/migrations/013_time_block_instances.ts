import type Database from 'better-sqlite3';

export default {
  id: '013_time_block_instances',
  description: 'Convert time_blocks from weekly template to date-based instances; drop time_block_overrides',
  up(db: Database.Database): void {
    // 1. Clear all task time_block_id references (instances will be regenerated)
    db.exec(`UPDATE tasks SET time_block_id = NULL WHERE time_block_id IS NOT NULL`);

    // 2. Drop the overrides table (no longer needed with date-based instances)
    db.exec(`DROP TABLE IF EXISTS time_block_overrides`);

    // 3. Recreate time_blocks as date-based instances
    //    SQLite doesn't support DROP COLUMN or complex ALTER, so we rebuild the table.
    db.exec(`
      -- Rename old table
      ALTER TABLE time_blocks RENAME TO time_blocks_old;

      -- Create new table with date instead of day_of_week
      CREATE TABLE time_blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id TEXT,
        label TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'study',
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_time_blocks_user ON time_blocks(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, date);

      -- Drop old table (data is intentionally NOT migrated — clean slate)
      DROP TABLE time_blocks_old;
    `);
  },
};
