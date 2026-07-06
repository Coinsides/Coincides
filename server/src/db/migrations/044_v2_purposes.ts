import type Database from 'better-sqlite3';

function safeAlter(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists in upgraded local databases.
  }
}

export default {
  id: '044_v2_purposes',
  description: 'Add purpose frames and move ContentGroup role semantics to purpose edge',
  up(db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS purposes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        intent TEXT,
        scope_note TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        is_note_default INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL DEFAULT 'human',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (is_note_default IN (0, 1)),
        CHECK (is_note_default = 0 OR note_id IS NOT NULL)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_purposes_note_default
        ON purposes(note_id)
        WHERE is_note_default = 1;

      CREATE INDEX IF NOT EXISTS idx_purposes_user_note
        ON purposes(user_id, note_id, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_purposes_user_course
        ON purposes(user_id, course_id, status, updated_at);

      CREATE TABLE IF NOT EXISTS purpose_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        member_kind TEXT NOT NULL,
        member_id TEXT NOT NULL,
        role TEXT,
        fitness TEXT NOT NULL DEFAULT 'unknown',
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (length(member_id) BETWEEN 1 AND 180)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_purpose_members_unique_member
        ON purpose_members(purpose_id, member_kind, member_id);

      CREATE INDEX IF NOT EXISTS idx_purpose_members_user_purpose
        ON purpose_members(user_id, purpose_id, order_index);
    `);

    safeAlter(db, 'ALTER TABLE content_groups ADD COLUMN identity_type TEXT');
    db.exec(`
      UPDATE content_groups
      SET identity_type = identity_role
      WHERE identity_type IS NULL
        AND identity_role IS NOT NULL
    `);
  },
};
