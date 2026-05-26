import type Database from 'better-sqlite3';

function tableColumns(db: Database.Database, tableName: string) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string; notnull: number }>;
}

function createCanvasEdgesTableSql(tableName: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
      source_node_id TEXT NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
      source_port TEXT NOT NULL DEFAULT 'right',
      target_node_id TEXT REFERENCES canvas_nodes(id) ON DELETE SET NULL,
      target_port TEXT,
      loose_target_x REAL,
      loose_target_y REAL,
      object_relation_id TEXT REFERENCES object_relations(id) ON DELETE SET NULL,
      relation_layer_id TEXT REFERENCES relation_layers(id) ON DELETE SET NULL,
      relation_kind TEXT,
      label TEXT,
      connection_state TEXT NOT NULL DEFAULT 'visual_only',
      style_key TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

export default {
  id: '024_v2_canvas_relations',
  description: 'Add v2 canvas edge relation and relation layer seed tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS relation_layers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        canvas_id TEXT REFERENCES learning_canvases(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        layer_kind TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'visible',
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id, canvas_id, layer_kind)
      );
      CREATE INDEX IF NOT EXISTS idx_relation_layers_course_canvas ON relation_layers(user_id, course_id, canvas_id, status, order_index);

      CREATE TABLE IF NOT EXISTS object_relations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'accepted',
        visibility TEXT NOT NULL DEFAULT 'visible',
        confidence REAL,
        source_canvas_edge_id TEXT,
        relation_layer_id TEXT REFERENCES relation_layers(id) ON DELETE SET NULL,
        created_by TEXT NOT NULL DEFAULT 'user',
        label TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_object_relations_course_status ON object_relations(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_object_relations_source ON object_relations(user_id, course_id, source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_object_relations_target ON object_relations(user_id, course_id, target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_object_relations_canvas_edge ON object_relations(source_canvas_edge_id);
    `);

    const columns = tableColumns(db, 'canvas_edges');
    const hasV244Shape = columns.some((column) => column.name === 'source_port')
      && columns.some((column) => column.name === 'connection_state')
      && columns.find((column) => column.name === 'target_node_id')?.notnull === 0;

    if (!hasV244Shape) {
      db.exec(createCanvasEdgesTableSql('canvas_edges_v244'));
      db.exec(`
        INSERT INTO canvas_edges_v244 (
          id, user_id, course_id, canvas_id, source_node_id, source_port,
          target_node_id, target_port, relation_kind, label, connection_state,
          style_key, status, metadata, created_at, updated_at
        )
        SELECT
          id, user_id, course_id, canvas_id, source_node_id, 'right',
          target_node_id, 'left', relation_kind, label, 'visual_only',
          'default', status, metadata, created_at, updated_at
        FROM canvas_edges;
      `);
      db.exec('DROP TABLE canvas_edges;');
      db.exec('ALTER TABLE canvas_edges_v244 RENAME TO canvas_edges;');
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_canvas_status ON canvas_edges(canvas_id, status);
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_nodes ON canvas_edges(source_node_id, target_node_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_relation ON canvas_edges(object_relation_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_edges_layer ON canvas_edges(relation_layer_id);
    `);
  },
};
