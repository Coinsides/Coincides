/**
 * Migration 001: Baseline
 * 
 * This migration marks the baseline state of v1.0.
 * All the ad-hoc ALTER TABLE statements from init.ts are consolidated here
 * as documentation. They've already been applied to existing databases,
 * so the actual SQL is guarded with try-catch.
 * 
 * For NEW databases (fresh install), these columns already exist in schema.sql,
 * so the ALTERs will harmlessly fail and be caught.
 * 
 * For EXISTING databases (upgrade from v1.0), these columns were already
 * added by the old init.ts code, so they'll also harmlessly fail.
 * 
 * The purpose of this migration is to establish a clean baseline —
 * all future schema changes go through proper migrations.
 */

import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string): void {
  try {
    db.exec(sql);
  } catch {
    // Column/table already exists — expected for existing databases
  }
}

export default {
  id: '001_baseline',
  description: 'Establish migration baseline for v1.0 schema',
  up(db: Database.Database): void {
    // These columns were added ad-hoc in init.ts during v1.0 development.
    // Consolidating them here for documentation. All are idempotent.
    safeAlter(db, 'ALTER TABLE tasks ADD COLUMN is_prerequisite INTEGER NOT NULL DEFAULT 0;');
    safeAlter(db, 'ALTER TABLE courses ADD COLUMN description TEXT;');
    safeAlter(db, 'ALTER TABLE cards ADD COLUMN section_id TEXT REFERENCES card_sections(id) ON DELETE SET NULL;');
    safeAlter(db, 'ALTER TABLE cards ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;');
    safeAlter(db, 'ALTER TABLE tags ADD COLUMN tag_group_id TEXT REFERENCES tag_groups(id) ON DELETE CASCADE;');
    safeAlter(db, 'ALTER TABLE documents ADD COLUMN document_type TEXT;');
    safeAlter(db, 'ALTER TABLE documents ADD COLUMN chunk_count INTEGER DEFAULT 0;');
    safeAlter(db, 'ALTER TABLE documents ADD COLUMN error_message TEXT;');
  },
};
