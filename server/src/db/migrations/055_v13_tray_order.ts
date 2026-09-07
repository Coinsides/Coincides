import type Database from 'better-sqlite3';

export default {
  id: '055_v13_tray_order',
  description: 'Add placement ordering for the note tray',
  up(db: Database.Database): void {
    db.exec('ALTER TABLE canvas_placements ADD COLUMN order_index INTEGER NULL');
  },
};
