import type Database from 'better-sqlite3';

export default {
  id: '016_v2_material_proposal',
  description: 'Add v2 course material proposal seed tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_materials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
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
        UNIQUE(user_id, document_id)
      );
      CREATE INDEX IF NOT EXISTS idx_source_materials_user_course_status ON source_materials(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_source_materials_document ON source_materials(document_id);

      CREATE TABLE IF NOT EXISTS source_fragments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_material_id TEXT NOT NULL REFERENCES source_materials(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_fragments_material_order ON source_fragments(source_material_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_course ON source_fragments(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_source_fragments_chunk ON source_fragments(document_chunk_id);

      CREATE TABLE IF NOT EXISTS material_segments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE,
        segment_type TEXT NOT NULL DEFAULT 'chunk_group',
        title TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'proposed',
        order_index INTEGER NOT NULL DEFAULT 0,
        page_start INTEGER,
        page_end INTEGER,
        confidence REAL,
        warnings_json TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        accepted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_material_segments_course_status_order ON material_segments(user_id, course_id, status, order_index);
      CREATE INDEX IF NOT EXISTS idx_material_segments_source_material ON material_segments(source_material_id);

      CREATE TABLE IF NOT EXISTS material_segment_fragments (
        segment_id TEXT NOT NULL REFERENCES material_segments(id) ON DELETE CASCADE,
        fragment_id TEXT NOT NULL REFERENCES source_fragments(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (segment_id, fragment_id)
      );
      CREATE INDEX IF NOT EXISTS idx_material_segment_fragments_fragment ON material_segment_fragments(fragment_id);
    `);
  },
};

