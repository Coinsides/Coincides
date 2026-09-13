import type Database from 'better-sqlite3';

export default {
  id: '075_v14_delete_authorizations',
  description: 'Add single-use time-block delete authorizations and deletion events',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_authorizations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('time_block_delete')),
        object_ids TEXT NOT NULL CHECK (json_valid(object_ids) AND json_type(object_ids) = 'array'),
        consequence_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_authorizations_user
        ON agent_authorizations(user_id, kind, created_at);
    `);

    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'events'")
      .get() as { sql: string };
    if (table.sql.includes("'time_block_deleted'")) return;

    // Preserve the existing ledger and append-only guards when widening the verb CHECK.
    // The migration runner owns the transaction, including the authorization table above.
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
      .get() as { seq: number } | undefined;
    db.exec(`
      CREATE TABLE events_with_delete_verb (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        user_id TEXT NOT NULL,
        actor_kind TEXT NOT NULL,
        channel TEXT NOT NULL,
        verb TEXT NOT NULL CHECK (verb IN (
          'migrated', 'rolled_back', 'note_created', 'board_created', 'board_deleted', 'goal_created',
          'task_created', 'deck_created', 'section_created', 'time_blocks_created',
          'time_block_updated', 'time_block_deleted', 'task_cards_linked', 'task_completed',
          'mounted', 'unmounted', 'purpose_created', 'purpose_amended',
          'purpose_sealed', 'proposal_issued', 'proposal_approved',
          'proposal_rejected', 'published'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      INSERT INTO events_with_delete_verb (seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta)
        SELECT seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta FROM events ORDER BY seq;
      DROP TRIGGER events_no_update;
      DROP TRIGGER events_no_delete;
      DROP TABLE events;
      ALTER TABLE events_with_delete_verb RENAME TO events;
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
