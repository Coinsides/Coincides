/**
 * Migration 004: Add serves_must column to tasks
 * 
 * For recommended/optional tasks, this column annotates which Must task
 * this task serves (e.g., "Learn Green's Theorem"). Used by the Agent
 * when generating study plans and goal breakdowns.
 */

import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try {
    db.exec(sql);
  } catch {
    // Column already exists — safe to ignore
  }
}

export default {
  id: '004_task_serves_must',
  description: 'Add serves_must column to tasks for priority dependency tracking',
  up(db: Database.Database): void {
    safeAlter(db, `ALTER TABLE tasks ADD COLUMN serves_must TEXT`);
  },
};
