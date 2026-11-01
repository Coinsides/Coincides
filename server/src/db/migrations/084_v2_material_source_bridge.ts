import type Database from 'better-sqlite3';

// Ready Sources feed the material layer alongside legacy documents. A Source
// material belongs to one Project placement and goes with it; its fragments are
// the Source projection's blocks. Both tables keep every legacy document row.
const MATERIALS_TABLE = `
  CREATE TABLE source_materials_v084 (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    source_record_id TEXT REFERENCES source_records(id) ON DELETE CASCADE,
    source_placement_id TEXT REFERENCES source_project_placements(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'document',
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    parse_status TEXT NOT NULL DEFAULT 'pending',
    fragment_status TEXT NOT NULL DEFAULT 'not_started',
    segment_status TEXT NOT NULL DEFAULT 'not_started',
    proposal_status TEXT NOT NULL DEFAULT 'not_proposed',
    used_in_note_count INTEGER NOT NULL DEFAULT 0,
    confidence REAL,
    warnings_json TEXT NOT NULL DEFAULT '[]',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, document_id),
    CHECK (
      (document_id IS NOT NULL AND source_record_id IS NULL AND source_placement_id IS NULL)
      OR (document_id IS NULL AND source_record_id IS NOT NULL AND source_placement_id IS NOT NULL)
    )
  )
`;

const FRAGMENTS_TABLE = `
  CREATE TABLE source_fragments_v084 (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    source_material_id TEXT NOT NULL REFERENCES source_materials(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
    source_record_id TEXT REFERENCES source_records(id) ON DELETE CASCADE,
    note_block_id TEXT,
    fragment_type TEXT NOT NULL DEFAULT 'chunk',
    title TEXT,
    content TEXT NOT NULL,
    page_start INTEGER,
    page_end INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    confidence REAL,
    warnings_json TEXT NOT NULL DEFAULT '[]',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK ((document_id IS NULL) <> (source_record_id IS NULL))
  )
`;

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
    .some((entry) => entry.name === column);
}

export default {
  id: '084_v2_material_source_bridge',
  description: 'Let Ready Sources feed source materials and fragments next to legacy documents',
  // Segments, evidence, anchors, scopes, snapshots, boards and canvas nodes
  // reference these two; the rebuild must not fire their FK actions.
  foreignKeysOff: true,
  up(db: Database.Database): void {
    // Fresh databases already get this shape from schema.sql.
    if (hasColumn(db, 'source_materials', 'source_placement_id') && hasColumn(db, 'source_fragments', 'note_block_id')) {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_source_materials_record ON source_materials(source_record_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_source_materials_placement ON source_materials(source_placement_id);
        CREATE INDEX IF NOT EXISTS idx_source_fragments_record ON source_fragments(source_record_id);
      `);
      return;
    }

    db.exec(`
      ${MATERIALS_TABLE};
      INSERT INTO source_materials_v084 (
        id, user_id, course_id, document_id, source_type, title, status, parse_status,
        fragment_status, segment_status, proposal_status, used_in_note_count, confidence,
        warnings_json, metadata, created_at, updated_at
      )
      SELECT
        id, user_id, course_id, document_id, source_type, title, status, parse_status,
        fragment_status, segment_status, proposal_status, used_in_note_count, confidence,
        warnings_json, metadata, created_at, updated_at
      FROM source_materials;
      DROP TABLE source_materials;
      ALTER TABLE source_materials_v084 RENAME TO source_materials;

      ${FRAGMENTS_TABLE};
      INSERT INTO source_fragments_v084 (
        id, user_id, course_id, source_material_id, document_id, document_chunk_id,
        fragment_type, title, content, page_start, page_end, order_index, confidence,
        warnings_json, metadata, created_at, updated_at
      )
      SELECT
        id, user_id, course_id, source_material_id, document_id, document_chunk_id,
        fragment_type, title, content, page_start, page_end, order_index, confidence,
        warnings_json, metadata, created_at, updated_at
      FROM source_fragments;
      DROP TABLE source_fragments;
      ALTER TABLE source_fragments_v084 RENAME TO source_fragments;

      CREATE INDEX IF NOT EXISTS idx_source_materials_user_course_status ON source_materials(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_source_materials_document ON source_materials(document_id);
      CREATE INDEX IF NOT EXISTS idx_source_materials_record ON source_materials(source_record_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_materials_placement ON source_materials(source_placement_id);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_material_order ON source_fragments(source_material_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_course ON source_fragments(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_chunk ON source_fragments(document_chunk_id);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_record ON source_fragments(source_record_id);
    `);
  },
};
