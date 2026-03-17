import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createCourseSchema, updateCourseSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/courses
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const courses = db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC').all(req.userId!);
  res.json(courses);
});

// POST /api/courses
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createCourseSchema.parse(req.body);
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO courses (id, user_id, name, code, color, weight, semester, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      req.userId!,
      data.name,
      data.code || null,
      data.color || '#6366f1',
      data.weight ?? 5,
      data.semester || null,
      now,
      now
    );

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    res.status(201).json(course);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/courses/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateCourseSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!existing) {
      throw new AppError(404, 'Course not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
    if (data.semester !== undefined) { fields.push('semester = ?'); values.push(data.semester); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/courses/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!existing) {
    throw new AppError(404, 'Course not found');
  }

  // CASCADE handles related data deletion via FK constraints
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);

  res.json({ message: 'Course deleted' });
});

export default router;
