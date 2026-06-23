import type Database from 'better-sqlite3';

export default {
  id: '031_v2_content_groups',
  description: 'Add v2 ContentGroup root entity table',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        canvas_id TEXT,
        primary_folder_id TEXT,
        parent_group_id TEXT REFERENCES content_groups(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL DEFAULT 'human',

        identity_status TEXT NOT NULL DEFAULT 'none',
        identity_role TEXT,
        identity_topic TEXT,
        identity_summary TEXT,
        identity_created_by TEXT NOT NULL DEFAULT 'human',
        identity_reviewed_by TEXT,
        identity_confidence REAL,
        identity_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        identity_accepted_at DATETIME,
        identity_metadata TEXT NOT NULL DEFAULT '{}',

        placements_json TEXT NOT NULL DEFAULT '[]',
        members_json TEXT NOT NULL DEFAULT '[]',
        fragments_json TEXT NOT NULL DEFAULT '[]',
        petals_json TEXT NOT NULL DEFAULT '[]',
        view_state_json TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{}',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_content_groups_course_note_status
        ON content_groups(user_id, course_id, note_id, status);
      CREATE INDEX IF NOT EXISTS idx_content_groups_course_updated
        ON content_groups(user_id, course_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_content_groups_identity
        ON content_groups(user_id, course_id, identity_status, status);
      CREATE INDEX IF NOT EXISTS idx_content_groups_primary_folder
        ON content_groups(user_id, course_id, primary_folder_id, status);
      CREATE INDEX IF NOT EXISTS idx_content_groups_parent
        ON content_groups(parent_group_id);
    `);
  },
};
