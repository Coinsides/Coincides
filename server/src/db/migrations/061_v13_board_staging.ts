import type Database from 'better-sqlite3';

export default {
  id: '061_v13_board_staging',
  description: 'Add explicit board member placement and human mount provenance for Staging',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(board_members)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'placed')) {
      db.exec('ALTER TABLE board_members ADD COLUMN placed INTEGER NOT NULL DEFAULT 1 CHECK (placed IN (0, 1))');
    }
    if (!columns.some((column) => column.name === 'mounted_actor')) {
      db.exec("ALTER TABLE board_members ADD COLUMN mounted_actor TEXT NOT NULL DEFAULT 'human'");
    }
  },
};
