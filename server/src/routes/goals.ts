import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createGoalSchema, updateGoalSchema, createTaskSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

function parseTask(task: any): any {
  if (task && task.checklist && typeof task.checklist === 'string') {
    try { task.checklist = JSON.parse(task.checklist); } catch { task.checklist = null; }
  }
  return task;
}

// GET /api/goals
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { course_id, parent_id } = req.query;

  let query = 'SELECT * FROM goals WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (course_id) {
    query += ' AND course_id = ?';
    params.push(course_id);
  }

  if (parent_id === 'null') {
    query += ' AND parent_id IS NULL';
  } else if (parent_id) {
    query += ' AND parent_id = ?';
    params.push(parent_id);
  }

  query += ' ORDER BY created_at DESC';

  const goals = db.prepare(query).all(...params);
  res.json(goals);
});

// GET /api/goals/:id/children
router.get('/:id/children', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  const children = db.prepare('SELECT * FROM goals WHERE parent_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.id, req.userId!);
  res.json(children);
});

// POST /api/goals
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const db = getDb();

    // If parent_id is provided, verify parent exists and belongs to user
    let courseId = data.course_id;
    if (data.parent_id) {
      const parent = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(data.parent_id, req.userId!) as any;
      if (!parent) {
        throw new AppError(404, 'Parent goal not found');
      }
      // Inherit course_id from parent if not explicitly provided differently
      if (!data.course_id || data.course_id === parent.course_id) {
        courseId = parent.course_id;
      }
    }

    // Verify course belongs to user
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO goals (id, user_id, course_id, title, description, deadline, exam_mode, status, parent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(id, req.userId!, courseId, data.title, data.description || null, data.deadline || null, data.exam_mode ? 1 : 0, data.parent_id || null, now, now);

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
    if (data.exam_mode !== undefined) { fields.push('exam_mode = ?'); values.push(data.exam_mode ? 1 : 0); }
    if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }

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

// POST /api/goals/:id/tasks — G-1 fix: add task to existing goal
router.post('/:id/tasks', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!goal) throw new AppError(404, 'Goal not found');

    const data = createTaskSchema.parse(req.body);

    // Use the goal's course_id if not provided
    const courseId = data.course_id || goal.course_id;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, order_index, start_time, end_time, description, checklist, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId!, courseId, goal.id, data.title, data.date, data.priority || 'must', data.order_index ?? 0, data.start_time || null, data.end_time || null, data.description || null, data.checklist ? JSON.stringify(data.checklist) : null, now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(parseTask(task));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
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
