import type Database from 'better-sqlite3';

function hasNoteScopedPageFramePrimaryKey(db: Database.Database): boolean {
  const tableInfo = db.prepare('PRAGMA table_info(page_frame_extensions)').all() as Array<{
    name: string;
    pk: number;
  }>;
  const noteIdPk = tableInfo.find((column) => column.name === 'note_id')?.pk || 0;
  const frameIdPk = tableInfo.find((column) => column.name === 'frame_id')?.pk || 0;
  return noteIdPk > 0 && frameIdPk > 0;
}

export default {
  id: '039_v2_page_frame_extension_note_scope',
  description: 'Scope PageFrame extension identity by note and frame id',
  up(db: Database.Database): void {
    const tableExists = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'page_frame_extensions'
    `).get();
    if (!tableExists || hasNoteScopedPageFramePrimaryKey(db)) return;

    db.exec(`
      CREATE TABLE page_frame_extensions_new (
        frame_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        object_id TEXT NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL,
        page_stack_id TEXT,
        page_index INTEGER,
        page_size TEXT,
        content_inset_json TEXT NOT NULL DEFAULT '{}',
        typography_json TEXT NOT NULL DEFAULT '{}',
        background_json TEXT NOT NULL DEFAULT '{}',
        template_id TEXT,
        template_json TEXT NOT NULL DEFAULT '{}',
        slots_json TEXT NOT NULL DEFAULT '{}',
        exportable INTEGER NOT NULL DEFAULT 1,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (note_id, frame_id)
      );

      INSERT OR REPLACE INTO page_frame_extensions_new (
        frame_id, user_id, course_id, note_id, object_id, canvas_id,
        page_stack_id, page_index, page_size, content_inset_json,
        typography_json, background_json, template_id, template_json,
        slots_json, exportable, metadata, created_at, updated_at
      )
      SELECT
        frame_id, user_id, course_id, note_id, object_id, canvas_id,
        page_stack_id, page_index, page_size, content_inset_json,
        typography_json, background_json, template_id, template_json,
        slots_json, exportable, metadata, created_at, updated_at
      FROM page_frame_extensions;

      DROP TABLE page_frame_extensions;
      ALTER TABLE page_frame_extensions_new RENAME TO page_frame_extensions;

      CREATE INDEX IF NOT EXISTS idx_page_frame_extensions_note
        ON page_frame_extensions(user_id, note_id, page_stack_id, page_index);
      CREATE INDEX IF NOT EXISTS idx_page_frame_extensions_object
        ON page_frame_extensions(object_id);
    `);
  },
};
