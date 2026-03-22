import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createRecurringTaskSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne, transaction } from '../db/pool.js';

const router = Router();

// POST /api/recurring-tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createRecurringTaskSchema.parse(req.body);
    // Verify course belongs to user
    const course = await queryOne(`SELECT id FROM courses WHERE id = $1 AND user_id = $2`, [data.course_id, req.userId!]);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (endDate < startDate) {
      throw new AppError(400, 'end_date must be after start_date');
    }

    const groupId = uuidv4();
    const now = new Date().toISOString();
    const totalTasks = data.task_titles.length;

    // Calculate dates for each task: distribute evenly across the date range
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    const createAll = await transaction(async (client) => {
      // Create recurring task group
      await execute(`INSERT INTO recurring_task_groups (id, user_id, goal_id, title, total_tasks, completed_tasks, start_date, end_date, created_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)`, [groupId, req.userId!, data.goal_id || null, data.title, totalTasks, data.start_date, data.end_date, now]);

      // Generate individual tasks distributed across the date range
      for (let i = 0; i < totalTasks; i++) {
        // Distribute tasks evenly across date range
        const dayOffset = totalTasks > 1
          ? Math.round((i * (totalDays - 1)) / (totalTasks - 1))
          : 0;

        const taskDate = new Date(startDate.getTime() + dayOffset * msPerDay);
        const dateStr = taskDate.toISOString().split('T')[0];

        await execute(`INSERT INTO tasks (id, user_id, course_id, goal_id, recurring_group_id, title, date, priority, status, order_index, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)`, [uuidv4(),
          req.userId!,
          data.course_id,
          data.goal_id || null,
          groupId,
          data.task_titles[i],
          dateStr,
          data.priority,
          i,
          now,
          now
        );
      }
    });

    createAll();

    // Return group with tasks
    const group = await queryOne(`SELECT * FROM recurring_task_groups WHERE id = $1`, [groupId]);
    const tasks = await queryAll(`SELECT * FROM tasks WHERE recurring_group_id = $1 ORDER BY date ASC`, [groupId]);

    res.status(201).json({ group, tasks });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/recurring-tasks/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const group = await queryOne(`SELECT * FROM recurring_task_groups WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!group) {
    throw new AppError(404, 'Recurring task group not found');
  }

  // Get actual completed count from tasks
  const stats = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = \'completed\' THEN 1 ELSE 0 END) as completed FROM tasks WHERE recurring_group_id = $1`, [req.params.id]);

  res.json({
    ...group,
    progress: {
      completed: stats.completed || 0,
      total: stats.total || 0,
    },
  });
});

// DELETE /api/recurring-tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const group = await queryOne(`SELECT id FROM recurring_task_groups WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!group) {
    throw new AppError(404, 'Recurring task group not found');
  }

  // CASCADE handles task deletion via FK constraints
  await execute(`DELETE FROM recurring_task_groups WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Recurring task group and all its tasks deleted' });
});

export default router;
