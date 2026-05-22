import type Database from 'better-sqlite3';

export default {
  id: '020_v2_source_anchors',
  description: 'Add v2 source anchor jump-back tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_anchors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        source_snapshot_page_id TEXT REFERENCES source_snapshot_pages(id) ON DELETE SET NULL,
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        anchor_kind TEXT NOT NULL,
        page_start INTEGER,
        page_end INTEGER,
        text_start_offset INTEGER,
        text_end_offset INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        confidence REAL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_anchors_course_status ON source_anchors(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_source_anchors_snapshot_page ON source_anchors(source_snapshot_id, page_start, page_end);
      CREATE INDEX IF NOT EXISTS idx_source_anchors_document_chunk ON source_anchors(document_id, document_chunk_id);

      CREATE TABLE IF NOT EXISTS source_anchor_links (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_anchor_id TEXT NOT NULL REFERENCES source_anchors(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        link_role TEXT NOT NULL DEFAULT 'source',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_anchor_id, target_type, target_id)
      );
      CREATE INDEX IF NOT EXISTS idx_source_anchor_links_target ON source_anchor_links(user_id, course_id, target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_source_anchor_links_anchor ON source_anchor_links(source_anchor_id);
    `);
  },
};
