import type Database from 'better-sqlite3';

export default {
  id: '062_v13_board_layers',
  description: 'Add board layers with nullable Base membership and persistent layer order',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_layers (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
        order_index INTEGER NOT NULL CHECK (order_index >= 0),
        visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1))
      );
      CREATE INDEX IF NOT EXISTS idx_board_layers_board_order ON board_layers(board_id, order_index);
    `);
    for (const table of ['board_members', 'board_visuals']) {
      const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
      if (!columns.some((column) => column.name === 'layer_id')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN layer_id TEXT REFERENCES board_layers(id) ON DELETE SET NULL`);
      }
      // Startup loads schema.sql before migrations, so indexes on newly added
      // columns belong here to support existing databases as well as fresh ones.
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_layer ON ${table}(board_id, layer_id)`);
    }
  },
};
