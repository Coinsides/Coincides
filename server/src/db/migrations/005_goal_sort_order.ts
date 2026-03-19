import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export default {
  id: '005_goal_sort_order',
  description: 'Add sort_order to goals for drag-and-drop reorder',
  up(db: Database.Database): void {
    safeAlter(db, "ALTER TABLE goals ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
    // Backfill: set sort_order based on created_at for existing goals
    db.exec(`
      UPDATE goals SET sort_order = (
        SELECT COUNT(*) FROM goals g2 
        WHERE g2.user_id = goals.user_id 
        AND g2.parent_id IS goals.parent_id
        AND g2.created_at <= goals.created_at
      ) - 1
    `);
  },
};
