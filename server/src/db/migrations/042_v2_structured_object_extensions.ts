import type Database from 'better-sqlite3';

export default {
  id: '042_v2_structured_object_extensions',
  description: 'Add structured CanvasObject extension table for table objects',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS structured_object_extensions (
        object_id TEXT PRIMARY KEY REFERENCES canvas_objects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL,
        structured_kind TEXT NOT NULL CHECK (structured_kind = 'table'),
        schema_version TEXT NOT NULL CHECK (schema_version = 'table.v1'),
        row_count INTEGER NOT NULL DEFAULT 0,
        column_count INTEGER NOT NULL DEFAULT 0,
        data_json TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_structured_object_extensions_note
        ON structured_object_extensions(user_id, note_id, canvas_id);
      CREATE INDEX IF NOT EXISTS idx_structured_object_extensions_kind
        ON structured_object_extensions(user_id, structured_kind);
    `);
  },
};
