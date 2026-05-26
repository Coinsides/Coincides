import type Database from 'better-sqlite3';

export default {
  id: '023_v2_learning_canvas',
  description: 'Add v2 learning canvas document tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_canvases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        canvas_kind TEXT NOT NULL DEFAULT 'finite',
        preset TEXT NOT NULL DEFAULT 'page',
        page_size TEXT NOT NULL DEFAULT 'a4',
        orientation TEXT NOT NULL DEFAULT 'portrait',
        width REAL NOT NULL DEFAULT 794,
        height REAL NOT NULL DEFAULT 1123,
        background_style TEXT NOT NULL DEFAULT 'plain',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_learning_canvases_course_status ON learning_canvases(user_id, course_id, status);

      CREATE TABLE IF NOT EXISTS canvas_nodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
        node_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        note_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
        source_scope_id TEXT REFERENCES source_scopes(id) ON DELETE SET NULL,
        source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
        source_board_node_id TEXT REFERENCES source_board_nodes(id) ON DELETE SET NULL,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
        proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        width REAL NOT NULL DEFAULT 280,
        height REAL NOT NULL DEFAULT 160,
        z_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_canvas_status ON canvas_nodes(canvas_id, status, z_index);
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_target ON canvas_nodes(user_id, course_id, node_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_scope ON canvas_nodes(source_scope_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_anchor ON canvas_nodes(source_anchor_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_board_node ON canvas_nodes(source_board_node_id);

      CREATE TABLE IF NOT EXISTS canvas_edges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
        source_node_id TEXT NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
        target_node_id TEXT NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
        relation_kind TEXT,
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_canvas_status ON canvas_edges(canvas_id, status);
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_nodes ON canvas_edges(source_node_id, target_node_id);

      CREATE TABLE IF NOT EXISTS canvas_frames (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        width REAL NOT NULL DEFAULT 640,
        height REAL NOT NULL DEFAULT 480,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_frames_canvas_status ON canvas_frames(canvas_id, status);

      CREATE TABLE IF NOT EXISTS canvas_viewport_states (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
        viewport_x REAL NOT NULL DEFAULT 0,
        viewport_y REAL NOT NULL DEFAULT 0,
        zoom REAL NOT NULL DEFAULT 1,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, canvas_id)
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_viewport_states_canvas ON canvas_viewport_states(canvas_id, user_id);
    `);
  },
};
