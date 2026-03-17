import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database;

const SYSTEM_TAGS = ['Definition', 'Theorem', 'Formula', 'Important', 'Exam-relevant'];

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || join(__dirname, '..', '..', 'coincides.db');

  db = new Database(resolvedPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema statements (split by semicolons, skip PRAGMA since we set them above)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));

  for (const stmt of statements) {
    db.exec(stmt + ';');
  }

  return db;
}

export function seedSystemTags(userId: string): void {
  const db = getDb();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO tags (id, user_id, name, is_system, created_at) VALUES (?, ?, ?, 1, datetime(\'now\'))'
  );

  const insertMany = db.transaction((tags: string[]) => {
    for (const tag of tags) {
      insert.run(uuidv4(), userId, tag);
    }
  });

  insertMany(SYSTEM_TAGS);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
