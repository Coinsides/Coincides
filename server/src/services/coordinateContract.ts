import type Database from 'better-sqlite3';

export type CoordinateContract = 'v1' | 'v2';

/** Read the database contract without caching it or creating a default row. */
export function readCoordinateContract(db: Database.Database): CoordinateContract {
  const row = db.prepare('SELECT value FROM database_meta WHERE key = ?')
    .get('coordinate_contract') as { value: string } | undefined;
  if (!row) return 'v1';
  if (row.value === 'v1' || row.value === 'v2') return row.value;
  throw new Error('Unsupported database coordinate contract');
}
