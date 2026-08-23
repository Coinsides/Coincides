import type Database from 'better-sqlite3';

export default {
  id: '048_v2_operation_batches_created_at_timestamp_fix',
  description: 'Normalize operation_batches.created_at values from ISO with Z to SQLite datetime format',
  up(db: Database.Database): void {
    db.exec(`
      UPDATE operation_batches
      SET created_at = substr(replace(created_at, 'T', ' '), 1, 19)
      WHERE created_at LIKE '%T%Z'
    `);
  },
};
