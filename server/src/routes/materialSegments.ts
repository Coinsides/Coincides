import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateMaterialSegmentSchema } from '../validators/index.js';

const router = Router();

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const segmentId = req.params.id as string;
    const data = updateMaterialSegmentSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM material_segments WHERE id = ? AND user_id = ?')
      .get(segmentId, req.userId!) as { id: string } | undefined;
    if (!existing) throw new AppError(404, 'Material segment not found');

    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      if (data.status === 'accepted') {
        fields.push('accepted_at = COALESCE(accepted_at, ?)');
        values.push(new Date().toISOString());
      }
    }
    if (data.order_index !== undefined) { fields.push('order_index = ?'); values.push(data.order_index); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(data.metadata)); }

    if (fields.length === 0) throw new AppError(400, 'No fields to update');
    fields.push('updated_at = ?');
    values.push(new Date().toISOString(), segmentId, req.userId!);

    db.prepare(`UPDATE material_segments SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM material_segments WHERE id = ?').get(segmentId) as any;
    res.json({
      ...updated,
      warnings: parseJson<string[]>(updated.warnings_json, []),
      metadata: parseJson<Record<string, unknown>>(updated.metadata, {}),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;

