import type Database from 'better-sqlite3';

export default {
  id: '019_v2_source_snapshots',
  description: 'Add v2 source snapshot viewer foundation tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_snapshots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        snapshot_kind TEXT NOT NULL DEFAULT 'parsed_pages',
        status TEXT NOT NULL DEFAULT 'ready',
        title TEXT NOT NULL,
        source_filename TEXT NOT NULL,
        page_count INTEGER,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_snapshots_material_unique ON source_snapshots(user_id, source_material_id);
      CREATE INDEX IF NOT EXISTS idx_source_snapshots_course_status ON source_snapshots(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_source_snapshots_document ON source_snapshots(document_id);

      CREATE TABLE IF NOT EXISTS source_snapshot_pages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        page_label TEXT,
        text_content TEXT NOT NULL,
        chunk_ids TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_snapshot_pages_snapshot_page ON source_snapshot_pages(source_snapshot_id, page_number);
      CREATE INDEX IF NOT EXISTS idx_source_snapshot_pages_course ON source_snapshot_pages(user_id, course_id);
    `);
  },
};
