import type Database from 'better-sqlite3';

export default {
  id: '041_v2_canvas_image_assets',
  description: 'Add canvas image assets and image CanvasObject extension table',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS canvas_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        origin_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        kind TEXT NOT NULL CHECK (kind = 'image'),
        storage_kind TEXT NOT NULL CHECK (storage_kind = 'local_file'),
        storage_key TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL DEFAULT 0,
        width INTEGER,
        height INTEGER,
        sha256 TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_canvas_assets_user_kind
        ON canvas_assets(user_id, kind, created_at);
      CREATE INDEX IF NOT EXISTS idx_canvas_assets_origin_note
        ON canvas_assets(user_id, origin_note_id, created_at);

      CREATE TABLE IF NOT EXISTS image_object_extensions (
        object_id TEXT PRIMARY KEY REFERENCES canvas_objects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL,
        asset_id TEXT NOT NULL REFERENCES canvas_assets(id) ON DELETE RESTRICT,
        fit TEXT NOT NULL DEFAULT 'contain' CHECK (fit IN ('contain', 'cover')),
        caption TEXT,
        alt_text TEXT,
        natural_width INTEGER,
        natural_height INTEGER,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_image_object_extensions_note
        ON image_object_extensions(user_id, note_id, canvas_id);
      CREATE INDEX IF NOT EXISTS idx_image_object_extensions_asset
        ON image_object_extensions(user_id, asset_id);
    `);
  },
};
