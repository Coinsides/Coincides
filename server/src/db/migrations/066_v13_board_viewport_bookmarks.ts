import type Database from 'better-sqlite3';

export default {
  id: '066_v13_board_viewport_bookmarks',
  description: 'Add board-owned named viewport snapshots without changing board layout',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_viewport_bookmarks (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 32),
        x REAL NOT NULL,
        y REAL NOT NULL,
        zoom REAL NOT NULL CHECK (zoom > 0),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_board_viewport_bookmarks_created
        ON board_viewport_bookmarks(board_id, user_id, created_at);
    `);
  },
};
