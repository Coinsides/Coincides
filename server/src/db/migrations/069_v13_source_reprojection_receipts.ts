import type Database from 'better-sqlite3';

export default {
  id: '069_v13_source_reprojection_receipts',
  description: 'Retain append-only user-work and annotation receipts for Source replacement',
  up(db: Database.Database): void {
    // Historical identifiers deliberately have no live FK: replacing the note,
    // or later removing the Source, must not erase or rewrite this receipt.
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_reprojection_receipts (
        id TEXT PRIMARY KEY,
        source_record_id TEXT NOT NULL,
        old_note_id TEXT NOT NULL,
        user_work_json TEXT NOT NULL CHECK (json_valid(user_work_json)),
        annotation_snapshot_json TEXT NOT NULL CHECK (json_valid(annotation_snapshot_json)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_source_reprojection_receipts_source
        ON source_reprojection_receipts(source_record_id, created_at);
      CREATE TRIGGER IF NOT EXISTS source_reprojection_receipts_no_update
      BEFORE UPDATE ON source_reprojection_receipts BEGIN
        SELECT RAISE(ABORT, 'source_reprojection_receipt_is_append_only');
      END;
      CREATE TRIGGER IF NOT EXISTS source_reprojection_receipts_no_delete
      BEFORE DELETE ON source_reprojection_receipts BEGIN
        SELECT RAISE(ABORT, 'source_reprojection_receipt_is_append_only');
      END;
    `);
  },
};
