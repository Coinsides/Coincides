import type Database from 'better-sqlite3';

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  return (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>)
    .some((column) => column.name === columnName);
}

export default {
  id: '050_v2_source_intake_declarations',
  description: 'Store honest intake declarations on each Source file',
  up(db: Database.Database): void {
    if (!hasColumn(db, 'source_files', 'intake_declarations_json')) {
      db.exec(`
        ALTER TABLE source_files
        ADD COLUMN intake_declarations_json TEXT NOT NULL DEFAULT '[]'
          CHECK (
            json_valid(intake_declarations_json)
            AND json_type(intake_declarations_json) = 'array'
          )
      `);
    }

    if (!hasColumn(db, 'source_files', 'intake_declarations_json')) {
      throw new Error('Migration 050 failed to add source_files.intake_declarations_json');
    }
  },
};
