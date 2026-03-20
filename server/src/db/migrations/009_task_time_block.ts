import type Database from 'better-sqlite3';

export default {
  id: '009_task_time_block',
  description: 'Add time_block_id foreign key to tasks for explicit block association',
  up(db: Database.Database): void {
    // SQLite doesn't support ADD CONSTRAINT with FK enforcement,
    // but we can add the column and index. FK is enforced at app level.
    db.exec(`
      ALTER TABLE tasks ADD COLUMN time_block_id TEXT REFERENCES time_blocks(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_tasks_time_block ON tasks(time_block_id);
    `);
  },
};
