import type Database from 'better-sqlite3';

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  return (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>)
    .some((column) => column.name === columnName);
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  alterSql: string,
): void {
  if (!hasColumn(db, tableName, columnName)) {
    db.exec(alterSql);
  }
  if (!hasColumn(db, tableName, columnName)) {
    throw new Error(`Migration 045 failed to add ${tableName}.${columnName}`);
  }
}

function assertTable(db: Database.Database, tableName: string): void {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);
  if (!row) throw new Error(`Migration 045 failed to create ${tableName}`);
}

export default {
  id: '045_v2_source_identity_floor',
  description: 'Add global Source identity, file, materialization, and Project placement foundation',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        origin_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        origin_course_name_snapshot TEXT,
        origin_entry_kind TEXT NOT NULL DEFAULT 'project_upload'
          CHECK (origin_entry_kind IN ('project_upload', 'library_upload', 'import')),
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_source_records_user
        ON source_records(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS source_files (
        id TEXT PRIMARY KEY,
        source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_filename TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        storage_state TEXT NOT NULL DEFAULT 'staging'
          CHECK (storage_state IN ('staging', 'ready')),
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
        content_hash TEXT NOT NULL,
        file_mtime TEXT,
        uploaded_at TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_files_user_hash
        ON source_files(user_id, content_hash);
      CREATE INDEX IF NOT EXISTS idx_source_files_record
        ON source_files(source_record_id);

      CREATE TABLE IF NOT EXISTS source_materializations (
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
          (status = 'materialized' AND projection_note_id IS NOT NULL)
          OR (status != 'materialized' AND projection_note_id IS NULL)
        )
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_mat_one_per_record
        ON source_materializations(source_record_id);
      CREATE INDEX IF NOT EXISTS idx_source_mat_user_status
        ON source_materializations(user_id, status, updated_at);

      CREATE TABLE IF NOT EXISTS source_project_placements (
        id TEXT PRIMARY KEY,
        source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_placement_unique
        ON source_project_placements(source_record_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_source_placement_course
        ON source_project_placements(user_id, course_id);
    `);

    ensureColumn(
      db,
      'notes',
      'note_class',
      "ALTER TABLE notes ADD COLUMN note_class TEXT NOT NULL DEFAULT 'user'",
    );
    ensureColumn(
      db,
      'note_block_sources',
      'source_record_id',
      'ALTER TABLE note_block_sources ADD COLUMN source_record_id TEXT',
    );
    ensureColumn(
      db,
      'note_block_sources',
      'source_materialization_id',
      'ALTER TABLE note_block_sources ADD COLUMN source_materialization_id TEXT',
    );
    ensureColumn(
      db,
      'courses',
      'system_kind',
      'ALTER TABLE courses ADD COLUMN system_kind TEXT',
    );

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_note_block_sources_record
        ON note_block_sources(source_record_id);
      CREATE INDEX IF NOT EXISTS idx_note_block_sources_materialization
        ON note_block_sources(source_materialization_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_system_kind
        ON courses(user_id, system_kind)
        WHERE system_kind IS NOT NULL;

      UPDATE notes
      SET note_class = 'system'
      WHERE page_format = 'canvas_backing'
        AND note_class != 'system';
    `);

    for (const tableName of [
      'source_records',
      'source_files',
      'source_materializations',
      'source_project_placements',
    ]) {
      assertTable(db, tableName);
    }
  },
};
