import type Database from 'better-sqlite3';

// purposes and purpose_members live only in migrations; schema.sql has no copy.
const PURPOSE_COLUMNS: Array<[string, string]> = [
  ['user_verbatim', 'TEXT'],
  ['interpretation_json', "TEXT NOT NULL DEFAULT '{}'"],
  ['interpretation_locked', 'INTEGER NOT NULL DEFAULT 0'],
  ['locked_at', 'TEXT'],
];

export default {
  id: '086_v2_purpose_card_ink_verbs',
  description: 'Add purpose card layers and lock, reopen purpose membership, and record human ink verbs',
  up(db: Database.Database): void {
    const columns = new Set((db.pragma('table_info(purposes)') as Array<{ name: string }>).map((column) => column.name));
    for (const [name, definition] of PURPOSE_COLUMNS) {
      if (!columns.has(name)) db.exec(`ALTER TABLE purposes ADD COLUMN ${name} ${definition}`);
    }
    // Only the membership writers reopen. The legacy note-purpose triggers stay.
    db.exec(`
      DROP TRIGGER IF EXISTS purpose_members_writer_retired_insert;
      DROP TRIGGER IF EXISTS purpose_members_writer_retired_update;
    `);

    // A fresh database already has these words from schema.sql; an older one rebuilds.
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'events'")
      .get() as { sql: string };
    if (table.sql.includes("'card_reviewed'")) return;

    // Widen only the event vocabulary, following 073/074/081's transactional
    // rebuild. Retain the append-only ledger and its sequence.
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
      .get() as { seq: number } | undefined;
    db.exec(`
      CREATE TABLE events_with_ink_verbs (
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
          'proposal_rejected', 'published', 'claim_without_receipt', 'board_changed',
          'card_reviewed', 'item_cited', 'item_edited'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      INSERT INTO events_with_ink_verbs (seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta)
        SELECT seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta FROM events ORDER BY seq;
      DROP TRIGGER events_no_update;
      DROP TRIGGER events_no_delete;
      DROP TABLE events;
      ALTER TABLE events_with_ink_verbs RENAME TO events;
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
