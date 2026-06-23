import type Database from 'better-sqlite3';

export default {
  id: '032_v2_group_folders',
  description: 'Add v2 GroupFolder entity and ContentGroup folder placement tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS group_folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
        parent_folder_id TEXT REFERENCES group_folders(id) ON DELETE SET NULL,

        scope_kind TEXT NOT NULL DEFAULT 'note',
        scope_project_id TEXT,
        scope_note_id TEXT,
        scope_label TEXT,

        title TEXT NOT NULL,
        origin TEXT NOT NULL DEFAULT 'user',
        system_root INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_group_folders_user_scope
        ON group_folders(user_id, scope_kind, scope_project_id, scope_note_id, status);
      CREATE INDEX IF NOT EXISTS idx_group_folders_course_note
        ON group_folders(user_id, course_id, note_id, status);
      CREATE INDEX IF NOT EXISTS idx_group_folders_parent
        ON group_folders(user_id, parent_folder_id, status);
      CREATE INDEX IF NOT EXISTS idx_group_folders_order
        ON group_folders(user_id, parent_folder_id, order_index, title);

      CREATE TABLE IF NOT EXISTS content_group_folder_placements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL REFERENCES group_folders(id) ON DELETE CASCADE,
        placement_role TEXT NOT NULL DEFAULT 'primary',
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        added_by TEXT NOT NULL DEFAULT 'human',
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_cg_folder_placements_folder
        ON content_group_folder_placements(user_id, folder_id, status, order_index);
      CREATE INDEX IF NOT EXISTS idx_cg_folder_placements_group
        ON content_group_folder_placements(user_id, content_group_id, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cg_folder_placements_one_primary
        ON content_group_folder_placements(user_id, content_group_id)
        WHERE placement_role = 'primary' AND status = 'active';
    `);
  },
};
