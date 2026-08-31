import type Database from 'better-sqlite3';

const RECEIPT_COLUMNS = [
  'id',
  'fragment_id',
  'model_id',
  'dimensions',
  'l2_normalized',
  'encoding_format',
  'normalization',
  'created_at',
] as const;

const VECTOR_COLUMNS = [
  'vector_id',
  'embedding',
  'model_id',
] as const;

function tableSql(db: Database.Database, tableName: string): string {
  const row = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName) as { sql: string | null } | undefined;
  if (!row?.sql) throw new Error(`Migration 052 failed to create ${tableName}`);
  return row.sql;
}

function tableExists(db: Database.Database, tableName: string): boolean {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName));
}

function assertColumns(
  db: Database.Database,
  tableName: string,
  expected: readonly string[],
): void {
  const actual = (db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>)
    .map((column) => column.name);
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(
      `Migration 052 created an unexpected ${tableName} shape: ${actual.join(',')}`,
    );
  }
}

export default {
  id: '052_v2_imprint_fragment_vectors',
  description: 'Add model-isolated vector identities and sqlite-vec storage for imprint fragments',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS imprint_fragment_vectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fragment_id TEXT NOT NULL REFERENCES imprint_fragments(id) ON DELETE CASCADE,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL CHECK (dimensions = 1024),
        l2_normalized INTEGER NOT NULL CHECK (l2_normalized IN (0, 1)),
        encoding_format TEXT NOT NULL CHECK (length(encoding_format) > 0),
        normalization TEXT NOT NULL CHECK (length(normalization) > 0),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (fragment_id, model_id)
      );

      CREATE INDEX IF NOT EXISTS idx_imprint_fragment_vectors_model_fragment
        ON imprint_fragment_vectors(model_id, fragment_id);
    `);

    if (!tableExists(db, 'imprint_fragment_vec')) {
      db.exec(`
        CREATE VIRTUAL TABLE imprint_fragment_vec USING vec0(
          vector_id INTEGER PRIMARY KEY,
          embedding FLOAT[1024] distance_metric=cosine,
          model_id TEXT NOT NULL PARTITION KEY
        );
      `);
    }

    const vecSql = tableSql(db, 'imprint_fragment_vec').replace(/\s+/g, ' ').toLowerCase();
    tableSql(db, 'imprint_fragment_vectors');
    assertColumns(db, 'imprint_fragment_vectors', RECEIPT_COLUMNS);
    assertColumns(db, 'imprint_fragment_vec', VECTOR_COLUMNS);
    if (!vecSql.includes('model_id text not null partition key')) {
      throw new Error('Migration 052 failed to make model_id a vec0 partition key');
    }
    if (!vecSql.includes('embedding float[1024] distance_metric=cosine')) {
      throw new Error('Migration 052 failed to create the 1024-dimension cosine vector column');
    }
  },
};
