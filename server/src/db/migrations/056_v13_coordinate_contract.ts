import type Database from 'better-sqlite3';

export default {
  id: '056_v13_coordinate_contract',
  description: 'Add database metadata for the explicit coordinate contract switch',
  up(db: Database.Database): void {
    // Schema only. Coordinate normalization and the v2 switch belong to the
    // explicitly invoked migration executor, never to application startup.
    db.exec(`
      CREATE TABLE IF NOT EXISTS database_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  },
};
