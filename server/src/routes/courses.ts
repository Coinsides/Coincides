import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createCourseSchema, updateCourseSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/courses
router.get('/', async (req: AuthRequest, res: Response) => {
  const courses = await queryAll(`SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC`, [req.userId!]);
  res.json(courses);
});

// POST /api/courses
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createCourseSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO courses (id, user_id, name, code, color, weight, description, semester, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [id,
      req.userId!,
      data.name,
      data.code || null,
      data.color || '#6366f1',
      data.weight ?? 2,
      data.description || null,
      data.semester || null,
      now,
      now]);

    const course = await queryOne(`SELECT * FROM courses WHERE id = $1`, [id]);
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
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCourseSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM courses WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Course not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name); }
    if (data.code !== undefined) { fields.push(`code = $${paramIdx++}`); values.push(data.code); }
    if (data.color !== undefined) { fields.push(`color = $${paramIdx++}`); values.push(data.color); }
    if (data.weight !== undefined) { fields.push(`weight = $${paramIdx++}`); values.push(data.weight); }
    if (data.description !== undefined) { fields.push(`description = $${paramIdx++}`); values.push(data.description); }
    if (data.semester !== undefined) { fields.push(`semester = $${paramIdx++}`); values.push(data.semester); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push(`updated_at = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(req.params.id);

    await execute(`UPDATE courses SET ${fields.join(', ')} WHERE id = $${paramIdx}`, [...values]);

    const updated = await queryOne(`SELECT * FROM courses WHERE id = $1`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/courses/:id/summary
router.get('/:id/summary', async (req: AuthRequest, res: Response) => {
  const courseId = req.params.id;
  const userId = req.userId!;

  const course = await queryOne(`SELECT * FROM courses WHERE id = $1 AND user_id = $2`, [courseId, userId]);
  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  // Goals with task counts (recursive — includes tasks under all descendant sub-goals)
  const goals = await queryAll(`
    WITH RECURSIVE goal_tree(id) AS (
      SELECT id FROM goals WHERE course_id = $1 AND user_id = $2
      UNION ALL
      SELECT g.id FROM goals g JOIN goal_tree gt ON g.parent_id = gt.id
    )
    SELECT g.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.goal_id IN (
        WITH RECURSIVE sub(id) AS (
          SELECT g.id UNION ALL SELECT g2.id FROM goals g2 JOIN sub s ON g2.parent_id = s.id
        ) SELECT id FROM sub
      )) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.status = 'completed' AND t.goal_id IN (
        WITH RECURSIVE sub(id) AS (
          SELECT g.id UNION ALL SELECT g2.id FROM goals g2 JOIN sub s ON g2.parent_id = s.id
        ) SELECT id FROM sub
      )) as completed_task_count
    FROM goals g
    WHERE g.course_id = $3 AND g.user_id = $4
    ORDER BY g.sort_order ASC, g.created_at ASC
  `, [courseId, userId, courseId, userId]);

  // Decks with card counts and due review counts
  const decks = await queryAll(`
    SELECT d.*,
      (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) as card_count,
      (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.fsrs_next_review IS NOT NULL AND c.fsrs_next_review <= NOW()::text) as due_count
    FROM card_decks d
    WHERE d.course_id = $1 AND d.user_id = $2
    ORDER BY d.created_at DESC
  `, [courseId, userId]);

  // Documents
  const documents = await queryAll(`
    SELECT id, filename, file_type, parse_status, page_count, created_at
    FROM documents
    WHERE course_id = $1 AND user_id = $2
    ORDER BY created_at DESC
  `, [courseId, userId]);

  res.json({
    course,
    goals,
    decks,
    documents,
  });
});

// DELETE /api/courses/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id FROM courses WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Course not found');
  }

  // CASCADE handles related data deletion via FK constraints
  await execute(`DELETE FROM courses WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Course deleted' });
});

export default router;
