import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createDeckSchema, updateDeckSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/decks
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const courseId = req.query.course_id as string | undefined;

  let query = 'SELECT * FROM card_decks WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (courseId) {
    query += ' AND course_id = ?';
    params.push(courseId);
  }

  query += ' ORDER BY created_at DESC';
  const decks = db.prepare(query).all(...params);
  res.json(decks);
});

// POST /api/decks
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createDeckSchema.parse(req.body);
    const db = getDb();

    // Verify course belongs to user
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(data.course_id, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO card_decks (id, user_id, course_id, name, description, card_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
    ).run(id, req.userId!, data.course_id, data.name, data.description || null, now, now);

    const deck = db.prepare('SELECT * FROM card_decks WHERE id = ?').get(id);
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
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateDeckSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM card_decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!existing) {
      throw new AppError(404, 'Deck not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE card_decks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM card_decks WHERE id = ?').get(req.params.id);
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
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!existing) {
    throw new AppError(404, 'Deck not found');
  }

  // CASCADE handles cards deletion via FK constraints
  db.prepare('DELETE FROM card_decks WHERE id = ?').run(req.params.id);

  res.json({ message: 'Deck deleted' });
});

export default router;
