import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/daily-brief
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Get today's tasks grouped by priority
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY order_index ASC, created_at ASC'
  ).all(req.userId!, today) as any[];

  const mustTasks = tasks.filter(t => t.priority === 'must');
  const recommendedTasks = tasks.filter(t => t.priority === 'recommended');
  const optionalTasks = tasks.filter(t => t.priority === 'optional');

  // Cards due for review — return 0 for now (Phase 2)
  const cardsDueCount = 0;

  // Recurring task progress alerts
  const groups = db.prepare(
    'SELECT * FROM recurring_task_groups WHERE user_id = ? AND end_date >= ?'
  ).all(req.userId!, today) as any[];

  const recurringAlerts = [];

  for (const group of groups) {
    const startDate = new Date(group.start_date);
    const endDate = new Date(group.end_date);
    const todayDate = new Date(today);

    if (todayDate < startDate) continue;

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const daysPassed = Math.ceil((todayDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const expectedProgress = Math.round((daysPassed / totalDays) * group.total_tasks);

    // Get actual completed count
    const stats = db.prepare(
      'SELECT SUM(CASE WHEN status = \'completed\' THEN 1 ELSE 0 END) as completed FROM tasks WHERE recurring_group_id = ?'
    ).get(group.id) as any;

    const completed = stats.completed || 0;
    const daysBehind = Math.max(0, expectedProgress - completed);

    if (daysBehind > 0) {
      recurringAlerts.push({
        group_id: group.id,
        title: group.title,
        total_tasks: group.total_tasks,
        completed_tasks: completed,
        expected_completed: expectedProgress,
        days_behind: daysBehind,
      });
    }
  }

  // Get today's energy level
  const dailyStatus = db.prepare(
    'SELECT energy_level FROM daily_statuses WHERE user_id = ? AND date = ?'
  ).get(req.userId!, today) as any;

  res.json({
    date: today,
    tasks: {
      must: mustTasks,
      recommended: recommendedTasks,
      optional: optionalTasks,
    },
    cards_due_count: cardsDueCount,
    recurring_alerts: recurringAlerts,
    energy_level: dailyStatus?.energy_level || null,
  });
});

export default router;
