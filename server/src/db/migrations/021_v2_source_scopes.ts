import type Database from 'better-sqlite3';

export default {
  id: '021_v2_source_scopes',
  description: 'Add v2 source scope selection table',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_scopes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_snapshot_id TEXT REFERENCES source_snapshots(id) ON DELETE CASCADE,
        source_snapshot_page_id TEXT REFERENCES source_snapshot_pages(id) ON DELETE SET NULL,
        source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
        source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
        material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
        scope_kind TEXT NOT NULL,
        label TEXT NOT NULL,
        page_start INTEGER,
        page_end INTEGER,
        text_start_offset INTEGER,
        text_end_offset INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_scopes_course_status ON source_scopes(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_source_scopes_snapshot_page ON source_scopes(source_snapshot_id, page_start, page_end);
      CREATE INDEX IF NOT EXISTS idx_source_scopes_anchor ON source_scopes(source_anchor_id);
      CREATE INDEX IF NOT EXISTS idx_source_scopes_material ON source_scopes(source_material_id);
      CREATE INDEX IF NOT EXISTS idx_source_scopes_segment ON source_scopes(material_segment_id);
    `);
  },
};
