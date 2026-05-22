import type Database from 'better-sqlite3';

export default {
  id: '022_v2_source_boards',
  description: 'Add v2 source board seed tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_boards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_boards_course_status ON source_boards(user_id, course_id, status);

      CREATE TABLE IF NOT EXISTS source_board_nodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_board_id TEXT NOT NULL REFERENCES source_boards(id) ON DELETE CASCADE,
        node_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        source_scope_id TEXT REFERENCES source_scopes(id) ON DELETE SET NULL,
        source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
        note_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        layout_x REAL,
        layout_y REAL,
        layout_width REAL,
        layout_height REAL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_board_nodes_board_status ON source_board_nodes(source_board_id, status, order_index);
      CREATE INDEX IF NOT EXISTS idx_source_board_nodes_target ON source_board_nodes(user_id, course_id, node_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_source_board_nodes_scope ON source_board_nodes(source_scope_id);
      CREATE INDEX IF NOT EXISTS idx_source_board_nodes_anchor ON source_board_nodes(source_anchor_id);
    `);
  },
};
