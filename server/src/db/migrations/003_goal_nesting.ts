import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export default {
  id: '003_goal_nesting',
  description: 'Add parent_id to goals for nesting support',
  up(db: Database.Database): void {
    safeAlter(db, "ALTER TABLE goals ADD COLUMN parent_id TEXT REFERENCES goals(id) ON DELETE CASCADE;");
  },
};
