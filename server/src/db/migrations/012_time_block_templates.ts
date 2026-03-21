import type Database from 'better-sqlite3';

export default {
  id: '012_time_block_templates',
  description: 'Create time_block_template_sets and time_block_templates tables for template system',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS time_block_template_sets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tb_template_sets_user ON time_block_template_sets(user_id);
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS time_block_templates (
        id TEXT PRIMARY KEY,
        template_set_id TEXT NOT NULL REFERENCES time_block_template_sets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'study',
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tb_templates_set ON time_block_templates(template_set_id);
      CREATE INDEX IF NOT EXISTS idx_tb_templates_user ON time_block_templates(user_id);
    `);
  },
};
