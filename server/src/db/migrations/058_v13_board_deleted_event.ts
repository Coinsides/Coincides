import type Database from 'better-sqlite3';

export default {
  id: '058_v13_board_deleted_event',
  description: 'Allow board_deleted receipts while preserving all existing events',
  up(db: Database.Database): void {
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'events'")
      .get() as { sql: string };
    // Fresh schema already has the new verb; 054 has installed its triggers.
    if (table.sql.includes("'board_deleted'")) return;

    // SQLite CHECK changes require rebuilding the table. Copy every receipt byte
    // and explicit sequence, and preserve the AUTOINCREMENT high-water mark.
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
      .get() as { seq: number } | undefined;
    db.exec(`
      CREATE TABLE events_with_board_deleted (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        user_id TEXT NOT NULL,
        actor_kind TEXT NOT NULL,
        channel TEXT NOT NULL,
        verb TEXT NOT NULL CHECK (verb IN (
          'migrated', 'rolled_back', 'note_created', 'board_created', 'board_deleted',
          'mounted', 'unmounted', 'purpose_created', 'purpose_amended',
          'purpose_sealed', 'proposal_issued', 'proposal_approved',
          'proposal_rejected', 'published'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      INSERT INTO events_with_board_deleted (seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta)
        SELECT seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta FROM events ORDER BY seq;
      DROP TRIGGER events_no_update;
      DROP TRIGGER events_no_delete;
      DROP TABLE events;
      ALTER TABLE events_with_board_deleted RENAME TO events;
      CREATE INDEX idx_events_user_ts ON events(user_id, ts);
      CREATE INDEX idx_events_verb ON events(verb);
      CREATE TRIGGER events_no_update BEFORE UPDATE ON events
      BEGIN
        SELECT RAISE(ABORT, 'events_append_only');
      END;
      CREATE TRIGGER events_no_delete BEFORE DELETE ON events
      BEGIN
        SELECT RAISE(ABORT, 'events_append_only');
      END;
    `);
    if (sequence) db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'events'").run(sequence.seq);
  },
};
