import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createTagSchema, updateTagSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/tags?course_id=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;

  if (courseId) {
    // Return tags for a specific course (via tag_groups)
    const tags = await queryAll(`SELECT t.* FROM tags t
       INNER JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE tg.course_id = $1 AND t.user_id = $2
       ORDER BY tg.order_index ASC, t.name ASC`, [courseId, req.userId!]);
    res.json(tags);
  } else {
    // Return all user tags (backwards compatible)
    const tags = await queryAll(`SELECT * FROM tags WHERE user_id = $1 ORDER BY is_system DESC, name ASC`, [req.userId!]);
    res.json(tags);
  }
});

// POST /api/tags
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createTagSchema.parse(req.body);
    // Check uniqueness
    const existing = await queryOne(`SELECT id FROM tags WHERE user_id = $1 AND name = $2`, [req.userId!, data.name]);
    if (existing) {
      throw new AppError(409, 'A tag with this name already exists');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO tags (id, user_id, name, is_system, color, tag_group_id, created_at) VALUES ($1, $2, $3, FALSE, $4, $5, $6)`, [id, req.userId!, data.name, data.color || null, data.tag_group_id || null, now]);

    const tag = await queryOne(`SELECT * FROM tags WHERE id = $1`, [id]);
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
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTagSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM tags WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Tag not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      // Check uniqueness of new name
      const duplicate = await queryOne(`SELECT id FROM tags WHERE user_id = $1 AND name = $2 AND id != $3`, [req.userId!, data.name, req.params.id]);
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
    await execute(`UPDATE tags SET ${fields.join(', ')} WHERE id = $1`, [...values]);

    const updated = await queryOne(`SELECT * FROM tags WHERE id = $1`, [req.params.id]);
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
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT * FROM tags WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Tag not found');
  }

  // CASCADE handles card_tags cleanup via FK constraints
  await execute(`DELETE FROM tags WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Tag deleted' });
});

export default router;
