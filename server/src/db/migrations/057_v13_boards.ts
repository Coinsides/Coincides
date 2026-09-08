import type Database from 'better-sqlite3';

export default {
  id: '057_v13_boards',
  description: 'Add library boards and retire note-purpose and maintained membership writers',
  up(db: Database.Database): void {
    // Keep these four tables and their indexes identical to schema.sql.
    // Triggers only live in migrations because initDb splits schema.sql on semicolons.
    // A board is independent of Item identity until the V13.4 bridge.
    db.exec(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        soul_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE RESTRICT,
        project_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        viewport TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'
          CHECK (json_valid(viewport) AND json_type(viewport) = 'object'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_soul ON boards(soul_id);
      CREATE INDEX IF NOT EXISTS idx_boards_user_updated ON boards(user_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_boards_user_project ON boards(user_id, project_id);

      CREATE TABLE IF NOT EXISTS board_members (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        member_kind TEXT NOT NULL CHECK (member_kind IN ('note', 'item', 'content_group', 'text_range')),
        member_id TEXT NOT NULL CHECK (length(member_id) BETWEEN 1 AND 180),
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        w REAL NOT NULL DEFAULT 0 CHECK (w >= 0),
        h REAL NOT NULL DEFAULT 0 CHECK (h >= 0),
        scale REAL NOT NULL DEFAULT 1 CHECK (scale > 0),
        z_index INTEGER NOT NULL DEFAULT 0,
        pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
        metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata) AND json_type(metadata) = 'object'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (board_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_board_members_board_z ON board_members(board_id, z_index);
      CREATE INDEX IF NOT EXISTS idx_board_members_target ON board_members(member_kind, member_id);

      CREATE TABLE IF NOT EXISTS board_edges (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        from_member_id TEXT NOT NULL,
        to_member_id TEXT NOT NULL,
        style TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(style) AND json_type(style) = 'object'),
        label TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (board_id, from_member_id) REFERENCES board_members(board_id, id) ON DELETE CASCADE,
        FOREIGN KEY (board_id, to_member_id) REFERENCES board_members(board_id, id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_board_edges_from ON board_edges(board_id, from_member_id);
      CREATE INDEX IF NOT EXISTS idx_board_edges_to ON board_edges(board_id, to_member_id);

      CREATE TABLE IF NOT EXISTS board_visuals (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        visual_kind TEXT NOT NULL CHECK (visual_kind IN ('freehand', 'shape', 'image', 'table', 'connector')),
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        w REAL NOT NULL DEFAULT 0 CHECK (w >= 0),
        h REAL NOT NULL DEFAULT 0 CHECK (h >= 0),
        scale REAL NOT NULL DEFAULT 1 CHECK (scale > 0),
        rotation REAL NOT NULL DEFAULT 0,
        z_index INTEGER NOT NULL DEFAULT 0,
        pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
        data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data) AND json_type(data) = 'object'),
        metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata) AND json_type(metadata) = 'object'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_board_visuals_board_z ON board_visuals(board_id, z_index);
    `);

    // course_id was already nullable in 044. Keep all historical purpose rows,
    // note_id/default columns, memberships and relation birth references in place.
    // RESTRICT on boards.soul_id prevents an attached historical soul cascading
    // away with its note. Legacy detachment/data migration is a later operation.
    db.exec(`
      DROP INDEX IF EXISTS idx_purposes_note_default;

      CREATE TRIGGER IF NOT EXISTS purposes_note_writer_retired_insert
      BEFORE INSERT ON purposes
      WHEN NEW.note_id IS NOT NULL OR NEW.is_note_default != 0
      BEGIN
        SELECT RAISE(ABORT, 'note_purpose_writer_retired');
      END;
      CREATE TRIGGER IF NOT EXISTS purposes_note_writer_retired_update
      BEFORE UPDATE OF note_id, is_note_default ON purposes
      WHEN NEW.note_id IS NOT OLD.note_id OR NEW.is_note_default IS NOT OLD.is_note_default
      BEGIN
        SELECT RAISE(ABORT, 'note_purpose_writer_retired');
      END;

      CREATE TRIGGER IF NOT EXISTS purpose_members_writer_retired_insert
      BEFORE INSERT ON purpose_members
      BEGIN
        SELECT RAISE(ABORT, 'purpose_members_writer_retired');
      END;
      CREATE TRIGGER IF NOT EXISTS purpose_members_writer_retired_update
      BEFORE UPDATE ON purpose_members
      BEGIN
        SELECT RAISE(ABORT, 'purpose_members_writer_retired');
      END;
    `);
    // DELETE remains available to existing FK lifecycle cleanup. V13.3 has no
    // membership writer or compiler; neither mount nor unmount touches this table.
  },
};
