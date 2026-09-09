import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { itemRefBlockDataSchema } from '../validators/index.js';

/** References never carry an Item body snapshot or write through to the Item. */
export function assertItemRefBlockContent(
  db: Database.Database,
  userId: string,
  block: { block_type: string; content_json?: unknown; plain_text?: string | null },
): void {
  if (block.block_type !== 'item_ref') return;
  const content = itemRefBlockDataSchema.parse(block.content_json);
  if (block.plain_text) {
    throw new AppError(400, 'Item reference blocks cannot store copied plain text');
  }
  const item = db.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?')
    .get(content.item_id, userId);
  if (!item) throw new AppError(400, 'Referenced Item not found');
}
