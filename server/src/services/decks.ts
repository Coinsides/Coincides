import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { CardDeck } from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createDeckSchema } from '../validators/index.js';

/** Shared human/chat creation door, returning the complete persisted row. */
export function createDeck(db: Database.Database, userId: string, input: unknown): CardDeck {
  const data = createDeckSchema.parse(input);
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(data.course_id, userId);
  if (!course) throw new AppError(404, 'Course not found');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO card_decks (id, user_id, course_id, name, description, card_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
  ).run(id, userId, data.course_id, data.name, data.description || null, now, now);
  return db.prepare('SELECT * FROM card_decks WHERE id = ?').get(id) as CardDeck;
}
