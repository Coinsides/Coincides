import type Database from 'better-sqlite3';

const planningVerbs = [
  'task_created', 'deck_created', 'section_created', 'time_blocks_created',
  'time_block_updated', 'task_cards_linked', 'task_completed',
];

export default {
  id: '074_v14_agent_planning_events',
  description: 'Allow planning action events while preserving event history',
  up(db: Database.Database): void {
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'events'")
      .get() as { sql: string };
    if (planningVerbs.every((verb) => table.sql.includes(`'${verb}'`))) return;

    // As in 073, only widen the closed verb CHECK. Keep historical rows, sequence,
    // indexes and append-only triggers inside the migration runner's transaction.
    const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
      .get() as { seq: number } | undefined;
    db.exec(`
      CREATE TABLE events_with_planning_verbs (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        user_id TEXT NOT NULL,
        actor_kind TEXT NOT NULL,
        channel TEXT NOT NULL,
        verb TEXT NOT NULL CHECK (verb IN (
          'migrated', 'rolled_back', 'note_created', 'board_created', 'board_deleted', 'goal_created',
          'task_created', 'deck_created', 'section_created', 'time_blocks_created',
          'time_block_updated', 'task_cards_linked', 'task_completed',
          'mounted', 'unmounted', 'purpose_created', 'purpose_amended',
          'purpose_sealed', 'proposal_issued', 'proposal_approved',
          'proposal_rejected', 'published'
        )),
        objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
        summary TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
      );
      INSERT INTO events_with_planning_verbs (seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta)
        SELECT seq, ts, user_id, actor_kind, channel, verb, objects, summary, meta FROM events ORDER BY seq;
      DROP TRIGGER events_no_update;
      DROP TRIGGER events_no_delete;
      DROP TABLE events;
      ALTER TABLE events_with_planning_verbs RENAME TO events;
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
