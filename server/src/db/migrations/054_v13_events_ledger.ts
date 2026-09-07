import type Database from 'better-sqlite3';

export default {
  id: '054_v13_events_ledger',
  description: 'Add the append-only events ledger for V13 migration receipts',
  up(db: Database.Database): void {
    // Keep the table and indexes in sync with schema.sql. Triggers live here:
    // initDb splits the base schema on semicolons, including trigger bodies.
    // Identity values are historical references, with no cascading foreign keys.
    // Extending the verb vocabulary requires a new migration, not an edit here.
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        user_id TEXT NOT NULL,
        actor_kind TEXT NOT NULL,
        channel TEXT NOT NULL,
        verb TEXT NOT NULL CHECK (verb IN (
          'migrated', 'rolled_back', 'note_created', 'board_created',
          'mounted', 'unmounted', 'purpose_created', 'purpose_amended',
          'purpose_sealed', 'proposal_issued', 'proposal_approved',
          'proposal_rejected', 'published'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events(user_id, ts);
      CREATE INDEX IF NOT EXISTS idx_events_verb ON events(verb);

      CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
      BEGIN
        SELECT RAISE(ABORT, 'events_append_only');
      END;
      CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
      BEGIN
        SELECT RAISE(ABORT, 'events_append_only');
      END;
    `);
  },
};
