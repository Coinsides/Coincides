import type Database from 'better-sqlite3';

export default {
  id: '040_v2_visual_connector_extensions',
  description: 'Add durable visual connector extension table for visual-only CanvasObject lines',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS visual_connector_extensions (
        object_id TEXT PRIMARY KEY REFERENCES canvas_objects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL,

        start_kind TEXT NOT NULL CHECK (start_kind IN ('object', 'point')),
        start_object_id TEXT,
        start_anchor TEXT NOT NULL DEFAULT 'auto',
        start_x REAL,
        start_y REAL,

        end_kind TEXT NOT NULL CHECK (end_kind IN ('object', 'point')),
        end_object_id TEXT,
        end_anchor TEXT NOT NULL DEFAULT 'auto',
        end_x REAL,
        end_y REAL,

        line_style TEXT NOT NULL DEFAULT 'solid',
        stroke TEXT NOT NULL DEFAULT '#94a3b8',
        stroke_width REAL NOT NULL DEFAULT 1.5,
        start_marker TEXT NOT NULL DEFAULT 'none',
        end_marker TEXT NOT NULL DEFAULT 'arrow',
        relation_kind TEXT NOT NULL DEFAULT 'visual_only' CHECK (relation_kind = 'visual_only'),

        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        CHECK (
          (start_kind = 'object' AND start_object_id IS NOT NULL AND start_x IS NULL AND start_y IS NULL)
          OR
          (start_kind = 'point' AND start_object_id IS NULL AND start_x IS NOT NULL AND start_y IS NOT NULL)
        ),
        CHECK (
          (end_kind = 'object' AND end_object_id IS NOT NULL AND end_x IS NULL AND end_y IS NULL)
          OR
          (end_kind = 'point' AND end_object_id IS NULL AND end_x IS NOT NULL AND end_y IS NOT NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_visual_connector_extensions_note
        ON visual_connector_extensions(user_id, note_id, canvas_id);
      CREATE INDEX IF NOT EXISTS idx_visual_connector_extensions_start_object
        ON visual_connector_extensions(user_id, note_id, start_object_id);
      CREATE INDEX IF NOT EXISTS idx_visual_connector_extensions_end_object
        ON visual_connector_extensions(user_id, note_id, end_object_id);
    `);
  },
};
