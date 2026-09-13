import type Database from 'better-sqlite3';
import { seedFactoryPaletteColors } from '../paletteSeed.js';

export default {
  id: '070_v14_palette_colors',
  description: 'Add named palette colors and seed the 24 immutable factory colors per user',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS palette_colors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0,
        origin TEXT NOT NULL CHECK (origin IN ('factory', 'user')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_palette_colors_user_sort ON palette_colors(user_id, sort);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_palette_colors_factory_name
        ON palette_colors(user_id, name) WHERE origin = 'factory';
    `);
    const users = db.prepare('SELECT id FROM users').all() as Array<{ id: string }>;
    for (const user of users) seedFactoryPaletteColors(db, user.id);
  },
};
