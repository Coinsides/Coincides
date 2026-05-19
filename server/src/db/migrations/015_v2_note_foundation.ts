import type Database from 'better-sqlite3';

export default {
  id: '015_v2_note_foundation',
  description: 'Add v2 NoteBlock foundation tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS operation_batches (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL DEFAULT 'manual',
        source_id TEXT,
        label TEXT,
        status TEXT NOT NULL DEFAULT 'applied',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        applied_at DATETIME,
        reverted_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_operation_batches_user_course ON operation_batches(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_operation_batches_source ON operation_batches(source_type, source_id);

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        source_kind TEXT NOT NULL DEFAULT 'manual',
        page_format TEXT NOT NULL DEFAULT 'flow',
        metadata TEXT NOT NULL DEFAULT '{}',
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        trashed_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_notes_user_course_status ON notes(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_notes_course_updated ON notes(course_id, updated_at);

      CREATE TABLE IF NOT EXISTS note_blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        block_type TEXT NOT NULL,
        title TEXT,
        content_json TEXT NOT NULL DEFAULT '{}',
        plain_text TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        source_kind TEXT NOT NULL DEFAULT 'manual',
        metadata TEXT NOT NULL DEFAULT '{}',
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        trashed_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_note_blocks_user_course_status ON note_blocks(user_id, course_id, status);
      CREATE INDEX IF NOT EXISTS idx_note_blocks_course_type ON note_blocks(course_id, block_type);
      CREATE INDEX IF NOT EXISTS idx_note_blocks_course_updated ON note_blocks(course_id, updated_at);

      CREATE TABLE IF NOT EXISTS note_block_placements (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        block_id TEXT NOT NULL REFERENCES note_blocks(id) ON DELETE CASCADE,
        parent_placement_id TEXT REFERENCES note_block_placements(id) ON DELETE SET NULL,
        order_index INTEGER NOT NULL,
        display_mode TEXT NOT NULL DEFAULT 'default',
        display_overrides_json TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(note_id, block_id)
      );
      CREATE INDEX IF NOT EXISTS idx_note_block_placements_note_order ON note_block_placements(note_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_note_block_placements_block ON note_block_placements(block_id);

      CREATE TABLE IF NOT EXISTS note_block_sources (
        id TEXT PRIMARY KEY,
        block_id TEXT NOT NULL REFERENCES note_blocks(id) ON DELETE CASCADE,
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
        source_page_start INTEGER,
        source_page_end INTEGER,
        source_excerpt TEXT,
        reference_type TEXT NOT NULL DEFAULT 'page',
        confidence REAL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_note_block_sources_block ON note_block_sources(block_id);
      CREATE INDEX IF NOT EXISTS idx_note_block_sources_document ON note_block_sources(document_id);
      CREATE INDEX IF NOT EXISTS idx_note_block_sources_chunk ON note_block_sources(document_chunk_id);

      CREATE TABLE IF NOT EXISTS projections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        snapshot_json TEXT NOT NULL DEFAULT '{}',
        source_refs_json TEXT NOT NULL DEFAULT '[]',
        source_versions_json TEXT NOT NULL DEFAULT '{}',
        operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        trashed_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_projections_user_course_type_status ON projections(user_id, course_id, type, status);
      CREATE INDEX IF NOT EXISTS idx_projections_course_updated ON projections(course_id, updated_at);
    `);
  },
};
