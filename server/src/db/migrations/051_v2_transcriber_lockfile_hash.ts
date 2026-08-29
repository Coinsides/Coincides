import type Database from 'better-sqlite3';

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  return (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>)
    .some((column) => column.name === columnName);
}

export default {
  id: '051_v2_transcriber_lockfile_hash',
  description: 'Add the raw-lockfile SHA-256 identity to Source imprint birth certificates',
  up(db: Database.Database): void {
    if (!hasColumn(db, 'source_imprints', 'transcriber_lockfile_hash')) {
      db.exec(`
        ALTER TABLE source_imprints
        ADD COLUMN transcriber_lockfile_hash TEXT
      `);
    }

    if (!hasColumn(db, 'source_imprints', 'transcriber_lockfile_hash')) {
      throw new Error('Migration 051 failed to add source_imprints.transcriber_lockfile_hash');
    }
  },
};
