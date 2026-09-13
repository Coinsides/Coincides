import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { createTimeBlocksSchema, updateTimeBlockSchema } from '../validators/index.js';

export interface TimeBlockRow {
  id: string; user_id: string; template_id: string | null; label: string;
  type: string; date: string; start_time: string; end_time: string;
  color: string | null; created_at: string; updated_at: string;
}

export interface TimeBlockDeleteConsequences {
  block: TimeBlockRow;
  taskBindings: Array<{ id: string; time_block_id: string }>;
}

/** Capture the actual FK effect, including every task that will be unbound. */
export function getTimeBlockDeleteConsequences(
  db: Database.Database, userId: string, id: string,
): TimeBlockDeleteConsequences {
  const block = db.prepare('SELECT * FROM time_blocks WHERE id = ? AND user_id = ?')
    .get(id, userId) as TimeBlockRow | undefined;
  if (!block) throw new AppError(404, 'Time block not found');
  const taskBindings = db.prepare('SELECT id, time_block_id FROM tasks WHERE time_block_id = ? ORDER BY id')
    .all(id) as TimeBlockDeleteConsequences['taskBindings'];
  return { block, taskBindings };
}

/** Shared human/agent domain door; the caller owns any additional ceremony. */
export function deleteTimeBlock(db: Database.Database, userId: string, id: string): TimeBlockDeleteConsequences {
  return db.transaction(() => {
    const consequences = getTimeBlockDeleteConsequences(db, userId, id);
    db.prepare('DELETE FROM time_blocks WHERE id = ? AND user_id = ?').run(id, userId);
    return consequences;
  })();
}

/** Return every actual row in request order, for both single and batch callers. */
export function createTimeBlocks(db: Database.Database, userId: string, input: unknown): TimeBlockRow[] {
  const { blocks } = createTimeBlocksSchema.parse(input);
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return db.transaction(() => blocks.map(item => {
    const id = uuidv4();
    insert.run(id, userId, item.template_id || null, item.label, item.type || 'custom',
      item.date, item.start_time, item.end_time, item.color || null, now, now);
    return db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(id) as TimeBlockRow;
  }))();
}

export function updateTimeBlock(db: Database.Database, userId: string, id: string, input: unknown): { before: TimeBlockRow; after: TimeBlockRow } {
  const data = updateTimeBlockSchema.parse(input);
  const before = db.prepare('SELECT * FROM time_blocks WHERE id = ? AND user_id = ?').get(id, userId) as TimeBlockRow | undefined;
  if (!before) throw new AppError(404, 'Time block not found');
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['label', 'type', 'start_time', 'end_time', 'color'] as const) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) throw new AppError(400, 'No fields to update');
  fields.push('updated_at = ?');
  values.push(new Date().toISOString(), id);
  db.prepare(`UPDATE time_blocks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const after = db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(id) as TimeBlockRow;
  return { before, after };
}
