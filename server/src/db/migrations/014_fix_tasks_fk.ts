import type Database from 'better-sqlite3';

export default {
  id: '014_fix_tasks_fk',
  description: 'Fix tasks.time_block_id FK pointing to dropped time_blocks_old table after migration 013 rename',
  up(db: Database.Database): void {
    // After migration 013, SQLite renamed the FK reference from time_blocks → time_blocks_old.
    // Since time_blocks_old was dropped, any FK-checked operation on tasks fails.
    // Fix: Rebuild tasks table with correct FK references.
    //
    // We must disable FK checks during rebuild to avoid constraint errors.

    db.pragma('foreign_keys = OFF');

    try {
      // Get all columns from the current tasks table
      const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
      const colNames = columns.map(c => c.name).join(', ');

      db.exec(`
        CREATE TABLE tasks_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
          recurring_group_id TEXT REFERENCES recurring_task_groups(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL,
          start_time TEXT,
          end_time TEXT,
          priority TEXT NOT NULL DEFAULT 'must',
          status TEXT NOT NULL DEFAULT 'pending',
          completed_at TEXT,
          order_index INTEGER NOT NULL DEFAULT 0,
          is_prerequisite INTEGER NOT NULL DEFAULT 0,
          serves_must TEXT,
          checklist TEXT,
          time_block_id TEXT REFERENCES time_blocks(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // Copy all data (only columns that exist in both tables)
      db.exec(`INSERT INTO tasks_new (${colNames}) SELECT ${colNames} FROM tasks`);

      // Drop old indexes
      db.exec(`DROP INDEX IF EXISTS idx_tasks_user_date`);
      db.exec(`DROP INDEX IF EXISTS idx_tasks_user_course_date`);
      db.exec(`DROP INDEX IF EXISTS idx_tasks_time_block`);

      // Swap tables
      db.exec(`DROP TABLE tasks`);
      db.exec(`ALTER TABLE tasks_new RENAME TO tasks`);

      // Recreate indexes
      db.exec(`CREATE INDEX idx_tasks_user_date ON tasks(user_id, date)`);
      db.exec(`CREATE INDEX idx_tasks_user_course_date ON tasks(user_id, course_id, date)`);
      db.exec(`CREATE INDEX idx_tasks_time_block ON tasks(time_block_id)`);
    } finally {
      db.pragma('foreign_keys = ON');
    }
  },
};
