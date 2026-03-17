import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createTagSchema, updateTagSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/tags?course_id=xxx
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const courseId = req.query.course_id as string | undefined;

  if (courseId) {
    // Return tags for a specific course (via tag_groups)
    const tags = db.prepare(
      `SELECT t.* FROM tags t
       INNER JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE tg.course_id = ? AND t.user_id = ?
       ORDER BY tg.order_index ASC, t.name ASC`
    ).all(courseId, req.userId!);
    res.json(tags);
  } else {
    // Return all user tags (backwards compatible)
    const tags = db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY is_system DESC, name ASC').all(req.userId!);
    res.json(tags);
  }
});

// POST /api/tags
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createTagSchema.parse(req.body);
    const db = getDb();

    // Check uniqueness
    const existing = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(req.userId!, data.name);
    if (existing) {
      throw new AppError(409, 'A tag with this name already exists');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO tags (id, user_id, name, is_system, color, tag_group_id, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)'
    ).run(id, req.userId!, data.name, data.color || null, data.tag_group_id || null, now);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.status(201).json(tag);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/tags/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateTagSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!existing) {
      throw new AppError(404, 'Tag not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      // Check uniqueness of new name
      const duplicate = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?').get(req.userId!, data.name, req.params.id);
      if (duplicate) {
        throw new AppError(409, 'A tag with this name already exists');
      }
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    values.push(req.params.id);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) {
    throw new AppError(404, 'Tag not found');
  }

  // CASCADE handles card_tags cleanup via FK constraints
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);

  res.json({ message: 'Tag deleted' });
});

export default router;
