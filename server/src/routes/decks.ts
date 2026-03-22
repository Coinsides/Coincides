import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createDeckSchema, updateDeckSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/decks
router.get('/', async (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;

  let query = 'SELECT * FROM card_decks WHERE user_id = $1';
  const params: unknown[] = [req.userId!];
  let paramIdx = 2;

  if (courseId) {
    query += ` AND course_id = $${paramIdx++}`;
    params.push(courseId);
  }

  query += ' ORDER BY created_at DESC';
  const decks = await queryAll(query, params);
  res.json(decks);
});

// POST /api/decks
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createDeckSchema.parse(req.body);
    // Verify course belongs to user
    const course = await queryOne(`SELECT id FROM courses WHERE id = $1 AND user_id = $2`, [data.course_id, req.userId!]);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO card_decks (id, user_id, course_id, name, description, card_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`, [id, req.userId!, data.course_id, data.name, data.description || null, now, now]);

    const deck = await queryOne(`SELECT * FROM card_decks WHERE id = $1`, [id]);
    res.status(201).json(deck);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/decks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateDeckSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM card_decks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Deck not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${paramIdx++}`); values.push(data.description); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push(`updated_at = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(req.params.id);

    await execute(`UPDATE card_decks SET ${fields.join(', ')} WHERE id = $${paramIdx}`, [...values]);

    const updated = await queryOne(`SELECT * FROM card_decks WHERE id = $1`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/decks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Deck not found');
  }

  // CASCADE handles cards deletion via FK constraints
  await execute(`DELETE FROM card_decks WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Deck deleted' });
});

export default router;
