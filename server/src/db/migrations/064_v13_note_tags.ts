import type Database from 'better-sqlite3';

export default {
  id: '064_v13_note_tags',
  description: 'Add flat note tags with retained actor provenance',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS note_tags (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 48 AND label = trim(label)),
        actor TEXT NOT NULL DEFAULT 'user' CHECK (actor IN ('user', 'agent')),
        created_at TEXT NOT NULL,
        UNIQUE (note_id, label)
      );
      CREATE INDEX IF NOT EXISTS idx_note_tags_user_note ON note_tags(user_id, note_id);
    `);
  },
};
