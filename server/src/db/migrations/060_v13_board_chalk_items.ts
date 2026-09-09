import type Database from 'better-sqlite3';

export default {
  id: '060_v13_board_chalk_items',
  description: 'Add board-born Item receipts and board-owned plain-text chalk visuals',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(items)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'origin_board_id')) {
      db.exec(`ALTER TABLE items ADD COLUMN origin_board_id TEXT REFERENCES boards(id) ON DELETE SET NULL
        CHECK (origin_board_id IS NULL OR (origin_note_id IS NULL AND origin_course_id IS NULL))`);
    }
    // Migration-owned: startup executes base-schema indexes before adding columns
    // to existing Item tables, so this index cannot be added by schema.sql first.
    db.exec('CREATE INDEX IF NOT EXISTS idx_items_origin_board ON items(user_id, origin_board_id)');

    const visualTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'board_visuals'")
      .get() as { sql: string };
    if (visualTable.sql.includes("'sticky'")) return;
    // Visuals have no inbound foreign keys. Rebuild only this board-owned table
    // to extend its closed kind set, preserving every row and geometry field.
    db.exec(`
      CREATE TABLE board_visuals_chalk_next (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        visual_kind TEXT NOT NULL CHECK (visual_kind IN ('freehand', 'shape', 'image', 'table', 'connector', 'sticky')),
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
      INSERT INTO board_visuals_chalk_next
        (id, board_id, visual_kind, x, y, w, h, scale, rotation, z_index, pinned, data, metadata, created_at, updated_at)
        SELECT id, board_id, visual_kind, x, y, w, h, scale, rotation, z_index, pinned, data, metadata, created_at, updated_at
        FROM board_visuals;
      DROP TABLE board_visuals;
      ALTER TABLE board_visuals_chalk_next RENAME TO board_visuals;
      CREATE INDEX idx_board_visuals_board_z ON board_visuals(board_id, z_index);
    `);
  },
};
