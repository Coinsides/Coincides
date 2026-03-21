import type Database from 'better-sqlite3';

export default {
  id: '011_task_cards',
  description: 'Create task_cards M:N association table for Task-Card linkage',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_cards (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        checklist_index INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(task_id, card_id, checklist_index)
      );

      CREATE INDEX IF NOT EXISTS idx_task_cards_task ON task_cards(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_cards_card ON task_cards(card_id);
    `);
  },
};
