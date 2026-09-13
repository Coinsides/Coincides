import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { CardSection } from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createSectionSchema } from '../validators/index.js';

/** Missing order appends to the deck; an explicit order remains authoritative. */
export function createSection(db: Database.Database, userId: string, input: unknown): CardSection {
  const data = createSectionSchema.parse(input);
  const deck = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(data.deck_id, userId);
  if (!deck) throw new AppError(404, 'Deck not found');
  const orderIndex = data.order_index ?? (db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM card_sections WHERE deck_id = ? AND user_id = ?'
  ).get(data.deck_id, userId) as { max_order: number }).max_order + 1;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO card_sections (id, deck_id, user_id, name, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.deck_id, userId, data.name, orderIndex, now);
  return db.prepare('SELECT * FROM card_sections WHERE id = ?').get(id) as CardSection;
}
