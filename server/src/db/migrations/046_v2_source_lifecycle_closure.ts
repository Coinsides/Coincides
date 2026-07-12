import type Database from 'better-sqlite3';

function rebuildSourceMaterializations(db: Database.Database): void {
  db.exec(`
    ALTER TABLE source_materializations RENAME TO source_materializations_v10_legacy;

    CREATE TABLE source_materializations (
      id TEXT PRIMARY KEY,
      source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
      source_file_id TEXT NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parser_key TEXT NOT NULL,
      parser_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'parsing', 'publishing', 'materialized', 'failed')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      projection_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      error_code TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (
        status = 'materialized'
        OR projection_note_id IS NULL
      )
    );

    INSERT INTO source_materializations (
      id, source_record_id, source_file_id, user_id, parser_key, parser_version,
      status, attempt_count, projection_note_id, error_code, error_message,
      started_at, completed_at, created_at, updated_at
    )
    SELECT
      id, source_record_id, source_file_id, user_id, parser_key, parser_version,
      status, attempt_count, projection_note_id, error_code, error_message,
      started_at, completed_at, created_at, updated_at
    FROM source_materializations_v10_legacy;

    DROP TABLE source_materializations_v10_legacy;

    CREATE UNIQUE INDEX idx_source_mat_one_per_record
      ON source_materializations(source_record_id);
    CREATE INDEX idx_source_mat_user_status
      ON source_materializations(user_id, status, updated_at);
  `);
}

function rebuildSourceReceipts(db: Database.Database): void {
  db.exec(`
    ALTER TABLE note_block_sources RENAME TO note_block_sources_v10_legacy;

    CREATE TABLE note_block_sources (
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
      source_record_id TEXT REFERENCES source_records(id) ON DELETE SET NULL,
      source_materialization_id TEXT REFERENCES source_materializations(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO note_block_sources (
      id, block_id, document_id, document_chunk_id, source_page_start,
      source_page_end, source_excerpt, reference_type, confidence, metadata,
      source_record_id, source_materialization_id, created_at
    )
    SELECT
      id, block_id, document_id, document_chunk_id, source_page_start,
      source_page_end, source_excerpt, reference_type, confidence, metadata,
      source_record_id, source_materialization_id, created_at
    FROM note_block_sources_v10_legacy;

    DROP TABLE note_block_sources_v10_legacy;

    CREATE INDEX idx_note_block_sources_block ON note_block_sources(block_id);
    CREATE INDEX idx_note_block_sources_document ON note_block_sources(document_id);
    CREATE INDEX idx_note_block_sources_chunk ON note_block_sources(document_chunk_id);
    CREATE INDEX idx_note_block_sources_record ON note_block_sources(source_record_id);
    CREATE INDEX idx_note_block_sources_materialization
      ON note_block_sources(source_materialization_id);
  `);
}

export default {
  id: '046_v2_source_lifecycle_closure',
  description: 'Close Source receipt, projection deletion, and managed file cleanup lifecycles',
  up(db: Database.Database): void {
    rebuildSourceMaterializations(db);
    rebuildSourceReceipts(db);

    db.exec(`
      CREATE TABLE IF NOT EXISTS managed_file_cleanup_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        storage_domain TEXT NOT NULL
          CHECK (storage_domain IN ('source_blob', 'canvas_asset')),
        operation TEXT NOT NULL
          CHECK (operation IN ('delete', 'restore')),
        source_storage_key TEXT NOT NULL,
        destination_storage_key TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'failed')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_managed_file_cleanup_pending
        ON managed_file_cleanup_jobs(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_managed_file_cleanup_user
        ON managed_file_cleanup_jobs(user_id, created_at);
    `);
  },
};
