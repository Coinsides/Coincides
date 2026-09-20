import type Database from 'better-sqlite3';

export default {
  id: '081_v14_board_agent_staging',
  description: 'Extend board Staging to stickies and record board changes',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(board_stickies)') as Array<{ name: string }>;
    if (!columns.some(column => column.name === 'placed')) {
      db.exec('ALTER TABLE board_stickies ADD COLUMN placed INTEGER NOT NULL DEFAULT 1 CHECK (placed IN (0, 1))');
      db.exec("ALTER TABLE board_stickies ADD COLUMN mounted_actor TEXT NOT NULL DEFAULT 'human'");
    }
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'events'")
      .get() as { sql: string };
    if (table.sql.includes("'board_changed'")) return;

    // Widen only the event vocabulary, following 073/074's transactional rebuild.
    // Retain the existing append-only ledger and its sequence.
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
      .get() as { seq: number } | undefined;
    db.exec(`
      CREATE TABLE events_with_board_changes (
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
          'proposal_rejected', 'published', 'claim_without_receipt', 'board_changed'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      INSERT INTO events_with_board_changes (seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta)
        SELECT seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta FROM events ORDER BY seq;
      DROP TRIGGER events_no_update;
      DROP TRIGGER events_no_delete;
      DROP TABLE events;
      ALTER TABLE events_with_board_changes RENAME TO events;
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
    if (sequence) {
      db.prepare(`INSERT INTO sqlite_sequence (name, seq)
        SELECT 'events', ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'events')`)
        .run(sequence.seq);
      db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'events'").run(sequence.seq);
    }
  },
};
