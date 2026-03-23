import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';

import { queryAll, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/statistics/overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0];

  // Calculate streak
  const streak = calculateStreak(userId, today);

  // Today's stats
  const todayTasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = $1 AND date = $2`, [userId, today]) as { total: number; completed: number };

  const todayCards = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log WHERE user_id = $1 AND date = $2 AND activity_type = 'card_reviewed'`, [userId, today]) as { count: number };

  // This week stats (Monday to Sunday)
  const weekStart = getWeekStart(today);
  const weekEnd = getWeekEnd(today);

  const weekTasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStart, weekEnd]) as { total: number; completed: number };

  const weekCards = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log WHERE user_id = $1 AND date >= $2 AND date <= $3 AND activity_type = 'card_reviewed'`, [userId, weekStart, weekEnd]) as { count: number };

  // This month stats
  const monthStart = today.substring(0, 7) + '-01';
  const monthEnd = getMonthEnd(today);

  const monthTasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, monthStart, monthEnd]) as { total: number; completed: number };

  const monthCards = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log WHERE user_id = $1 AND date >= $2 AND date <= $3 AND activity_type = 'card_reviewed'`, [userId, monthStart, monthEnd]) as { count: number };

  res.json({
    streak,
    today: {
      tasks_completed: todayTasks.completed || 0,
      tasks_total: todayTasks.total,
      cards_reviewed: todayCards.count,
    },
    this_week: {
      tasks_completed: weekTasks.completed || 0,
      tasks_total: weekTasks.total,
      cards_reviewed: weekCards.count,
    },
    this_month: {
      tasks_completed: monthTasks.completed || 0,
      tasks_total: monthTasks.total,
      cards_reviewed: monthCards.count,
    },
  });
});

// GET /api/statistics/heatmap?months=6
router.get('/heatmap', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const months = parseInt(req.query.months as string) || 6;
  const today = new Date().toISOString().split('T')[0];

  const startDate = subtractMonths(today, months);

  // Get task completions by date
  const taskCounts = await queryAll(`SELECT date, COUNT(*) as count FROM tasks
     WHERE user_id = $1 AND date >= $2 AND date <= $3 AND status = 'completed'
     GROUP BY date`, [userId, startDate, today]) as { date: string; count: number }[];

  // Get card reviews by date
  const reviewCounts = await queryAll(`SELECT date, COUNT(*) as count FROM study_activity_log
     WHERE user_id = $1 AND date >= $2 AND date <= $3 AND activity_type = 'card_reviewed'
     GROUP BY date`, [userId, startDate, today]) as { date: string; count: number }[];

  // Merge counts per date
  const countMap = new Map<string, number>();
  for (const r of taskCounts) countMap.set(r.date, (countMap.get(r.date) || 0) + r.count);
  for (const r of reviewCounts) countMap.set(r.date, (countMap.get(r.date) || 0) + r.count);

  // Calculate quartile thresholds
  const allCounts = [...countMap.values()].filter(c => c > 0).sort((a, b) => a - b);
  const q1 = allCounts[Math.floor(allCounts.length * 0.25)] || 1;
  const q2 = allCounts[Math.floor(allCounts.length * 0.5)] || 2;
  const q3 = allCounts[Math.floor(allCounts.length * 0.75)] || 4;

  // Build result array for all dates in range
  const result: { date: string; count: number; level: number }[] = [];
  const cursor = new Date(startDate);
  const end = new Date(today);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split('T')[0];
    const count = countMap.get(dateStr) || 0;
    let level = 0;
    if (count > 0) {
      if (count >= q3) level = 4;
      else if (count >= q2) level = 3;
      else if (count >= q1) level = 2;
      else level = 1;
    }
    result.push({ date: dateStr, count, level });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json(result);
});

// GET /api/statistics/trends?period=weekly&weeks=12
router.get('/trends', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const period = (req.query.period as string) || 'weekly';
  const weeks = parseInt(req.query.weeks as string) || 12;
  const today = new Date().toISOString().split('T')[0];

  if (period === 'monthly') {
    const months = Math.ceil(weeks / 4);
    const startDate = subtractMonths(today, months);

    const rows = await queryAll(`SELECT strftime('%Y-%m', date) as period_label,
              COUNT(*) as tasks_total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
       FROM tasks WHERE user_id = $1 AND date >= $2
       GROUP BY period_label ORDER BY period_label`, [userId, startDate]) as { period_label: string; tasks_total: number; tasks_completed: number }[];

    const cardRows = await queryAll(`SELECT strftime('%Y-%m', date) as period_label, COUNT(*) as cards_reviewed
       FROM study_activity_log WHERE user_id = $1 AND date >= $2 AND activity_type = 'card_reviewed'
       GROUP BY period_label ORDER BY period_label`, [userId, startDate]) as { period_label: string; cards_reviewed: number }[];

    const cardMap = new Map(cardRows.map(r => [r.period_label, r.cards_reviewed]));

    const result = rows.map(r => ({
      period_label: r.period_label,
      tasks_completed: r.tasks_completed || 0,
      tasks_total: r.tasks_total,
      cards_reviewed: cardMap.get(r.period_label) || 0,
      completion_rate: r.tasks_total > 0 ? Math.round(((r.tasks_completed || 0) / r.tasks_total) * 100) / 100 : 0,
    }));

    res.json(result);
  } else {
    // weekly
    const startDate = subtractDays(today, weeks * 7);

    const rows = await queryAll(`SELECT strftime('%Y-W%W', date) as period_label,
              COUNT(*) as tasks_total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
       FROM tasks WHERE user_id = $1 AND date >= $2
       GROUP BY period_label ORDER BY period_label`, [userId, startDate]) as { period_label: string; tasks_total: number; tasks_completed: number }[];

    const cardRows = await queryAll(`SELECT strftime('%Y-W%W', date) as period_label, COUNT(*) as cards_reviewed
       FROM study_activity_log WHERE user_id = $1 AND date >= $2 AND activity_type = 'card_reviewed'
       GROUP BY period_label ORDER BY period_label`, [userId, startDate]) as { period_label: string; cards_reviewed: number }[];

    const cardMap = new Map(cardRows.map(r => [r.period_label, r.cards_reviewed]));

    const result = rows.map(r => ({
      period_label: r.period_label,
      tasks_completed: r.tasks_completed || 0,
      tasks_total: r.tasks_total,
      cards_reviewed: cardMap.get(r.period_label) || 0,
      completion_rate: r.tasks_total > 0 ? Math.round(((r.tasks_completed || 0) / r.tasks_total) * 100) / 100 : 0,
    }));

    res.json(result);
  }
});

// GET /api/statistics/courses
router.get('/courses', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const courses = await queryAll(`SELECT id, name, color FROM courses WHERE user_id = $1 ORDER BY name`, [userId]) as { id: string; name: string; color: string }[];

  const result = await Promise.all(courses.map(async course => {
    const taskStats = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = $1 AND course_id = $2`, [userId, course.id]) as { total: number; completed: number };

    const cardStats = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN fsrs_reps > 0 THEN 1 ELSE 0 END) as reviewed FROM cards c JOIN card_decks d ON c.deck_id = d.id WHERE d.user_id = $1 AND d.course_id = $2`, [userId, course.id]) as { total: number; reviewed: number };

    const activeGoals = await queryOne(`SELECT COUNT(*) as count FROM goals WHERE user_id = $1 AND course_id = $2 AND status = 'active'`, [userId, course.id]) as { count: number };

    const total = taskStats.total || 0;
    const completed = taskStats.completed || 0;

    return {
      course_id: course.id,
      course_name: course.name,
      course_color: course.color,
      tasks_total: total,
      tasks_completed: completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
      cards_total: cardStats.total || 0,
      cards_reviewed: cardStats.reviewed || 0,
      active_goals: activeGoals.count,
    };
  }));

  res.json(result);
});

// --- Helpers ---

async function calculateStreak(userId: string, today: string): Promise<{ current: number; longest: number }> {
  // Get all dates with activity (task completed or card reviewed), ordered descending
  const activityDates = await queryAll(`SELECT DISTINCT date FROM (
       SELECT date FROM tasks WHERE user_id = $1 AND status = 'completed'
       UNION
       SELECT date FROM study_activity_log WHERE user_id = $2 AND activity_type = 'card_reviewed'
     ) ORDER BY date DESC`, [userId, userId]) as { date: string }[];

  const dateSet = new Set(activityDates.map(d => d.date));

  // Current streak: count consecutive days backwards from today
  let current = 0;
  let cursor = new Date(today);
  while (dateSet.has(cursor.toISOString().split('T')[0])) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak
  let longest = 0;
  let streak = 0;
  const sorted = activityDates.map(d => d.date).sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        streak++;
      } else {
        streak = 1;
      }
    }
    if (streak > longest) longest = streak;
  }

  return { current, longest };
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // Sunday = end
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function subtractMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export default router;
