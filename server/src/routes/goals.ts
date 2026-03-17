import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createGoalSchema, updateGoalSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/goals
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { course_id } = req.query;

  let query = 'SELECT * FROM goals WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (course_id) {
    query += ' AND course_id = ?';
    params.push(course_id);
  }

  query += ' ORDER BY created_at DESC';

  const goals = db.prepare(query).all(...params);
  res.json(goals);
});

// POST /api/goals
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const db = getDb();

    // Verify course belongs to user
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(data.course_id, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO goals (id, user_id, course_id, title, description, deadline, exam_mode, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(id, req.userId!, data.course_id, data.title, data.description || null, data.deadline || null, data.exam_mode ? 1 : 0, now, now);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json(goal);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/goals/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
    if (!existing) {
      throw new AppError(404, 'Goal not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); values.push(data.deadline); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/goals/:id/exam-mode
router.put('/:id/exam-mode', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) {
    throw new AppError(404, 'Goal not found');
  }

  const newExamMode = existing.exam_mode ? 0 : 1;
  const now = new Date().toISOString();

  db.prepare('UPDATE goals SET exam_mode = ?, updated_at = ? WHERE id = ?').run(newExamMode, now, req.params.id);

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/goals/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!existing) {
    throw new AppError(404, 'Goal not found');
  }

  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);

  res.json({ message: 'Goal deleted' });
});

export default router;
