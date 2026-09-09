import type Database from 'better-sqlite3';

export default {
  id: '059_v13_board_text_ranges',
  description: 'Add board-owned live text ranges independent of annotation replacement',
  up(db: Database.Database): void {
    // Match schema.sql. Source identities deliberately have no cascading FK:
    // deleting a source must retain the board's last valid excerpt.
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_text_ranges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL,
        block_id TEXT NOT NULL,
        text_flow_id TEXT NOT NULL,
        text_unit_id TEXT NOT NULL,
        start_offset INTEGER CHECK (start_offset IS NULL OR start_offset >= 0),
        end_offset INTEGER CHECK (end_offset IS NULL OR (end_offset >= 0 AND end_offset >= start_offset)),
        excerpt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'drifted', 'lost')),
        pre_edit_offsets TEXT CHECK (pre_edit_offsets IS NULL OR
          (json_valid(pre_edit_offsets) AND json_type(pre_edit_offsets) = 'object')),
        at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_board_text_ranges_note ON board_text_ranges(user_id, note_id);
      CREATE INDEX IF NOT EXISTS idx_board_text_ranges_board ON board_text_ranges(board_id);
    `);
  },
};
