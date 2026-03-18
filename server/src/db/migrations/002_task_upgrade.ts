import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export default {
  id: '002_task_upgrade',
  description: 'Add start_time, end_time, description, checklist to tasks',
  up(db: Database.Database): void {
    safeAlter(db, "ALTER TABLE tasks ADD COLUMN start_time TEXT;");
    safeAlter(db, "ALTER TABLE tasks ADD COLUMN end_time TEXT;");
    safeAlter(db, "ALTER TABLE tasks ADD COLUMN description TEXT;");
    safeAlter(db, "ALTER TABLE tasks ADD COLUMN checklist TEXT;");  // JSON: [{text: string, done: boolean}]
  },
};
