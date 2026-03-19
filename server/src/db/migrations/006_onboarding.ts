import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export default {
  id: '006_onboarding',
  description: 'Add onboarding_completed flag to users',
  up(db: Database.Database): void {
    safeAlter(db, "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;");
    // Mark all existing users as onboarding complete so they don't see it
    db.exec("UPDATE users SET onboarding_completed = 1 WHERE onboarding_completed = 0;");
  },
};
