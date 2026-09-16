import type Database from 'better-sqlite3';

/** Board-owned drawing data only. No content identities or semantic relations. */
export default {
  id: '078_v14_board_visuals',
  description: 'Add board stickies and visual arc edges with polymorphic bindings',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_stickies (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        text TEXT NOT NULL DEFAULT '' CHECK (length(text) <= 12000),
        x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0,
        w REAL NOT NULL DEFAULT 240 CHECK (w IN (240, 416)),
        h REAL NOT NULL DEFAULT 240 CHECK (h >= 120),
        color_index INTEGER CHECK (color_index IS NULL OR color_index = 1),
        weight INTEGER NOT NULL DEFAULT 1 CHECK (weight IN (1, 2, 3)),
        layer_id TEXT REFERENCES board_layers(id) ON DELETE SET NULL,
        z_index INTEGER NOT NULL DEFAULT 0,
        pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE (board_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_board_stickies_board_z ON board_stickies(board_id, z_index);
    `);
    const columns = db.pragma('table_info(board_edges)') as Array<{ name: string }>;
    if (columns.some((column) => column.name === 'visual_version')) return;
    // Rebuild only this board-owned table so legacy member FKs remain real FKs,
    // now nullable alongside sticky bindings or explicit free points.
    db.exec(`
      CREATE TABLE board_edges_visual_v1 (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        from_member_id TEXT, to_member_id TEXT,
        from_sticky_id TEXT, to_sticky_id TEXT,
        from_x REAL, from_y REAL, to_x REAL, to_y REAL,
        from_anchor TEXT NOT NULL DEFAULT 'auto' CHECK (from_anchor IN ('auto','n','e','s','w')),
        to_anchor TEXT NOT NULL DEFAULT 'auto' CHECK (to_anchor IN ('auto','n','e','s','w')),
        bend REAL NOT NULL DEFAULT 0,
        dash TEXT NOT NULL DEFAULT 'solid' CHECK (dash IN ('solid','dashed')),
        weight INTEGER NOT NULL DEFAULT 1 CHECK (weight IN (1,2,3)),
        cap_start TEXT NOT NULL DEFAULT 'none' CHECK (cap_start IN ('none','arrow','dot')),
        cap_end TEXT NOT NULL DEFAULT 'none' CHECK (cap_end IN ('none','arrow','dot')),
        color_index INTEGER CHECK (color_index IS NULL OR color_index = 1),
        label_position REAL NOT NULL DEFAULT 0.5 CHECK (label_position >= 0 AND label_position <= 1),
        visual_version INTEGER NOT NULL DEFAULT 0 CHECK (visual_version IN (0,1)),
        style TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(style) AND json_type(style) = 'object'),
        label TEXT,
        created_at TEXT NOT NULL,
        CHECK ((from_member_id IS NOT NULL) + (from_sticky_id IS NOT NULL) + (from_x IS NOT NULL AND from_y IS NOT NULL) = 1),
        CHECK ((to_member_id IS NOT NULL) + (to_sticky_id IS NOT NULL) + (to_x IS NOT NULL AND to_y IS NOT NULL) = 1),
        CHECK ((from_x IS NULL) = (from_y IS NULL)),
        CHECK ((to_x IS NULL) = (to_y IS NULL)),
        FOREIGN KEY (board_id, from_member_id) REFERENCES board_members(board_id, id) ON DELETE CASCADE,
        FOREIGN KEY (board_id, to_member_id) REFERENCES board_members(board_id, id) ON DELETE CASCADE,
        FOREIGN KEY (board_id, from_sticky_id) REFERENCES board_stickies(board_id, id) ON DELETE CASCADE,
        FOREIGN KEY (board_id, to_sticky_id) REFERENCES board_stickies(board_id, id) ON DELETE CASCADE
      );
      INSERT INTO board_edges_visual_v1 (id,board_id,from_member_id,to_member_id,style,label,created_at)
        SELECT id,board_id,from_member_id,to_member_id,style,label,created_at FROM board_edges;
      DROP TABLE board_edges;
      ALTER TABLE board_edges_visual_v1 RENAME TO board_edges;
      CREATE INDEX idx_board_edges_from ON board_edges(board_id, from_member_id);
      CREATE INDEX idx_board_edges_to ON board_edges(board_id, to_member_id);
      CREATE INDEX idx_board_edges_from_sticky ON board_edges(board_id, from_sticky_id);
      CREATE INDEX idx_board_edges_to_sticky ON board_edges(board_id, to_sticky_id);
    `);
  },
};
