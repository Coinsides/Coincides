import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateNoteBlockSchema } from '../validators/index.js';

const router = Router();

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getOwnedBlock(blockId: string, userId: string): { id: string; course_id: string } {
  const block = getDb()
    .prepare('SELECT id, course_id FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as { id: string; course_id: string } | undefined;
  if (!block) throw new AppError(404, 'Note block not found');
  return block;
}

function hydrateBlock(row: any) {
  return {
    ...row,
    content_json: parseJson(row.content_json, {}),
    metadata: parseJson(row.metadata, {}),
  };
}

// PUT /api/note-blocks/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const blockId = req.params.id as string;
    getOwnedBlock(blockId, req.userId!);
    const data = updateNoteBlockSchema.parse(req.body);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.block_type !== undefined) { fields.push('block_type = ?'); values.push(data.block_type); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content_json !== undefined) { fields.push('content_json = ?'); values.push(stringifyJson(data.content_json, {})); }
    if (data.plain_text !== undefined) { fields.push('plain_text = ?'); values.push(data.plain_text); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(stringifyJson(data.metadata, {})); }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      fields.push('trashed_at = ?');
      values.push(data.status === 'trashed' ? new Date().toISOString() : null);
    }

    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now, blockId, req.userId!);

    const db = getDb();
    db.prepare(`UPDATE note_blocks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId);
    res.json(hydrateBlock(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/note-blocks/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const blockId = req.params.id as string;
  getOwnedBlock(blockId, req.userId!);
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE note_blocks SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, blockId, req.userId!);
  res.json({ message: 'Note block moved to trash' });
});

export default router;
