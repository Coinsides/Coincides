import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createTaskSchema, updateTaskSchema, batchCreateTasksSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne, transaction } from '../db/pool.js';

const router = Router();

function parseTask(task: any): any {
  if (task && task.checklist && typeof task.checklist === 'string') {
    try { task.checklist = JSON.parse(task.checklist); } catch { task.checklist = null; }
  }
  return task;
}

function verifyCourseBelongsToUser(courseId: string, userId: string): void {
  const course = await queryOne(`SELECT id FROM courses WHERE id = $1 AND user_id = $2`, [courseId, userId]);
  if (!course) {
    throw new AppError(404, 'Course not found');
  }
}

// GET /api/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  const { date, from, to, course_id } = req.query;

  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  } else if (from && to) {
    query += ' AND date >= ? AND date <= ?';
    params.push(from, to);
  }

  if (course_id) {
    query += ' AND course_id = ?';
    params.push(course_id);
  }

  query += ' ORDER BY date ASC, order_index ASC, created_at ASC';

  const tasks = await queryAll(query, params);
  res.json(tasks.map(parseTask));
});

// POST /api/tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    verifyCourseBelongsToUser(data.course_id, req.userId!);
    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO tasks (id, user_id, course_id, goal_id, recurring_group_id, title, date, priority, status, order_index, start_time, end_time, description, checklist, time_block_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14, $15, $16)`, [id,
      req.userId!,
      data.course_id,
      data.goal_id || null,
      data.recurring_group_id || null,
      data.title,
      data.date,
      data.priority,
      data.order_index ?? 0,
      data.start_time || null,
      data.end_time || null,
      data.description || null,
      data.checklist ? JSON.stringify(data.checklist) : null,
      data.time_block_id || null,
      now,
      now
    ]);

    const task = await queryOne(`SELECT * FROM tasks WHERE id = $1`, [id]);
    res.status(201).json(parseTask(task));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/tasks/batch
router.post('/batch', async (req: AuthRequest, res: Response) => {
  try {
    const data = batchCreateTasksSchema.parse(req.body);
    const now = new Date().toISOString();

    // Verify all courses belong to user
    const courseIds = [...new Set(data.tasks.map(t => t.course_id))];
    for (const courseId of courseIds) {
      verifyCourseBelongsToUser(courseId, req.userId!);
    }

    const ids: string[] = [];

    const insertAll = await transaction(async (client) => {
      for (const task of data.tasks) {
        const id = uuidv4();
        ids.push(id);
        await execute(`INSERT INTO tasks (id, user_id, course_id, goal_id, recurring_group_id, title, date, priority, status, order_index, start_time, end_time, description, checklist, time_block_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14, $15, $16)`, [id,
          req.userId!,
          task.course_id,
          task.goal_id || null,
          task.recurring_group_id || null,
          task.title,
          task.date,
          task.priority || 'must',
          task.order_index ?? 0,
          task.start_time || null,
          task.end_time || null,
          task.description || null,
          task.checklist ? JSON.stringify(task.checklist) : null,
          task.time_block_id || null,
          now,
          now
        ]);
      }
    });

    insertAll();

    const placeholders = ids.map(() => '?').join(',');
    const tasks = await queryAll(`SELECT * FROM tasks WHERE id IN (${placeholders})`, [...ids]);
    res.status(201).json(tasks.map(parseTask));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Task not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.order_index !== undefined) { fields.push('order_index = ?'); values.push(data.order_index); }
    if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time); }
    if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.checklist !== undefined) { fields.push('checklist = ?'); values.push(data.checklist ? JSON.stringify(data.checklist) : null); }
    if (data.time_block_id !== undefined) { fields.push('time_block_id = ?'); values.push(data.time_block_id); }

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);

      // Auto-set completed_at when marking complete, clear when marking pending
      if (data.status === 'completed' && existing.status !== 'completed') {
        fields.push('completed_at = ?');
        values.push(new Date().toISOString());

        // Log activity
        const activityDate = new Date().toISOString().split('T')[0];
        await execute(`INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type) VALUES ($1, $2, $3, $4, $5, $6)`, [uuidv4(), req.userId!, activityDate, 'task_completed', existing.id, 'task']);

        // Update recurring group count if applicable
        if (existing.recurring_group_id) {
          await execute(`UPDATE recurring_task_groups SET completed_tasks = completed_tasks + 1 WHERE id = $1`, [existing.recurring_group_id]);
        }
      } else if (data.status === 'pending' && existing.status === 'completed') {
        fields.push('completed_at = ?');
        values.push(null);

        if (existing.recurring_group_id) {
          await execute(`UPDATE recurring_task_groups SET completed_tasks = MAX(0, completed_tasks - 1) WHERE id = $1`, [existing.recurring_group_id]);
        }
      }
    }

    if (data.completed_at !== undefined && data.status === undefined) {
      fields.push('completed_at = ?');
      values.push(data.completed_at);
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    await execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $1`, [...values]);

    const updated = await queryOne(`SELECT * FROM tasks WHERE id = $1`, [req.params.id]);
    res.json(parseTask(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Task not found');
  }

  // If this was a completed task in a recurring group, decrement the count
  if (existing.recurring_group_id && existing.status === 'completed') {
    await execute(`UPDATE recurring_task_groups SET completed_tasks = MAX(0, completed_tasks - 1) WHERE id = $1`, [existing.recurring_group_id]);
  }

  // Also decrement total_tasks for the recurring group
  if (existing.recurring_group_id) {
    await execute(`UPDATE recurring_task_groups SET total_tasks = MAX(0, total_tasks - 1) WHERE id = $1`, [existing.recurring_group_id]);
  }

  await execute(`DELETE FROM tasks WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Task deleted' });
});

// ============================================================
// Task-Card Linkage (v1.7)
// ============================================================

// GET /api/tasks/:taskId/cards — get all cards linked to a task
router.get('/:taskId/cards', async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  // Verify task belongs to user
  const task = await queryOne(`SELECT id FROM tasks WHERE id = $1 AND user_id = $2`, [taskId, req.userId!]);
  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  const links = await queryAll(`
    SELECT tc.id, tc.card_id, tc.checklist_index, tc.created_at,
           c.title as card_title, c.template_type, c.deck_id,
           d.name as deck_name
    FROM task_cards tc
    JOIN cards c ON tc.card_id = c.id
    JOIN card_decks d ON c.deck_id = d.id
    WHERE tc.task_id = $1
    ORDER BY tc.checklist_index ASC NULLS LAST, tc.created_at ASC
  `, [taskId]);

  res.json(links);
});

// POST /api/tasks/:taskId/cards — create a task-card link
router.post('/:taskId/cards', async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const { card_id, checklist_index } = req.body;

  if (!card_id) {
    throw new AppError(400, 'card_id is required');
  }

  // Verify task belongs to user
  const task = await queryOne(`SELECT id FROM tasks WHERE id = $1 AND user_id = $2`, [taskId, req.userId!]);
  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  // Verify card belongs to user
  const card = await queryOne(`SELECT id FROM cards WHERE id = $1 AND user_id = $2`, [card_id, req.userId!]);
  if (!card) {
    throw new AppError(404, 'Card not found');
  }

  // Check for duplicate
  const existing = await queryOne(`SELECT id FROM task_cards WHERE task_id = $1 AND card_id = $2 AND checklist_index IS $3`, [taskId, card_id, checklist_index ?? null]);
  if (existing) {
    res.status(409).json({ error: 'Link already exists' });
    return;
  }

  const id = uuidv4();
  await execute(`INSERT INTO task_cards (id, task_id, card_id, checklist_index) VALUES ($1, $2, $3, $4)`, [id, taskId, card_id, checklist_index ?? null]);

  const link = await queryOne(`SELECT * FROM task_cards WHERE id = $1`, [id]);
  res.status(201).json(link);
});

// DELETE /api/tasks/:taskId/cards/:linkId — remove a task-card link
router.delete('/:taskId/cards/:linkId', async (req: AuthRequest, res: Response) => {
  const { taskId, linkId } = req.params;

  // Verify task belongs to user
  const task = await queryOne(`SELECT id FROM tasks WHERE id = $1 AND user_id = $2`, [taskId, req.userId!]);
  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  const result = await execute(`DELETE FROM task_cards WHERE id = $1 AND task_id = $2`, [linkId, taskId]);
  if (result.rowCount === 0) {
    throw new AppError(404, 'Link not found');
  }

  res.status(204).send();
});

export default router;
