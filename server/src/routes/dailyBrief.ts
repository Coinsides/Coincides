import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/daily-brief
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const userId = req.userId!;

  // Get active exam mode goals
  const examGoals = db.prepare(
    `SELECT g.id, g.title, g.course_id, g.deadline, c.name as course_name
     FROM goals g JOIN courses c ON g.course_id = c.id
     WHERE g.user_id = ? AND g.exam_mode = 1 AND g.status = 'active' AND g.deadline >= ?`
  ).all(userId, today) as any[];

  const examCourseIds = new Set<string>(examGoals.map((g: any) => g.course_id));
  const examModeActive = examGoals.length > 0;

  // Get today's tasks grouped by priority
  const allTasks = db.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY order_index ASC, created_at ASC'
  ).all(userId, today) as any[];

  // Apply exam mode filtering + boost
  const tasks = allTasks
    .filter(t => {
      // Suppress optional tasks for exam courses
      if (examModeActive && examCourseIds.has(t.course_id) && t.priority === 'optional') {
        return false;
      }
      return true;
    })
    .map(t => {
      // Add exam_boost flag for must tasks in exam courses
      if (examModeActive && examCourseIds.has(t.course_id) && t.priority === 'must') {
        return { ...t, exam_boost: true };
      }
      return t;
    });

  // Conflict arbitration sorting within each priority tier
  // Get goal deadlines for ranking
  const goalDeadlines = db.prepare(
    `SELECT g.course_id, MIN(g.deadline) as nearest_deadline
     FROM goals g WHERE g.user_id = ? AND g.status = 'active' AND g.deadline IS NOT NULL
     GROUP BY g.course_id`
  ).all(userId) as { course_id: string; nearest_deadline: string }[];
  const deadlineMap = new Map(goalDeadlines.map(g => [g.course_id, g.nearest_deadline]));

  // Get course weights
  const courseWeights = db.prepare(
    'SELECT id, weight FROM courses WHERE user_id = ?'
  ).all(userId) as { id: string; weight: number }[];
  const weightMap = new Map(courseWeights.map(c => [c.id, c.weight]));

  function sortTasks(taskList: any[]): any[] {
    return taskList.sort((a, b) => {
      // 1. Exam mode course tasks first
      const aExam = examCourseIds.has(a.course_id) ? 0 : 1;
      const bExam = examCourseIds.has(b.course_id) ? 0 : 1;
      if (aExam !== bExam) return aExam - bExam;

      // 2. Closer deadline = higher priority
      const aDeadline = deadlineMap.get(a.course_id) || '9999-12-31';
      const bDeadline = deadlineMap.get(b.course_id) || '9999-12-31';
      if (aDeadline !== bDeadline) return aDeadline.localeCompare(bDeadline);

      // 3. Higher course weight = higher priority
      const aWeight = weightMap.get(a.course_id) || 5;
      const bWeight = weightMap.get(b.course_id) || 5;
      if (aWeight !== bWeight) return bWeight - aWeight;

      // 4. Existing order_index
      return (a.order_index || 0) - (b.order_index || 0);
    });
  }

  const mustTasks = sortTasks(tasks.filter(t => t.priority === 'must'));
  const recommendedTasks = sortTasks(tasks.filter(t => t.priority === 'recommended'));
  const optionalTasks = sortTasks(tasks.filter(t => t.priority === 'optional'));

  // Cards due for review
  const dueRow = db.prepare(
    'SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND (fsrs_next_review <= ? OR fsrs_reps = 0)'
  ).get(userId, today + 'T23:59:59') as any;
  const cardsDueCount = dueRow.count;

  // Recurring task progress alerts
  const groups = db.prepare(
    'SELECT * FROM recurring_task_groups WHERE user_id = ? AND end_date >= ?'
  ).all(userId, today) as any[];

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
  ).get(userId, today) as any;

  // Minimum Working Flow
  const mustPendingCount = mustTasks.filter((t: any) => t.status === 'pending').length;
  const estimatedMinutes = mustPendingCount * 10 + cardsDueCount * 2;

  const examCourses = examGoals.map((g: any) => ({
    course_id: g.course_id,
    course_name: g.course_name,
    goal_title: g.title,
    deadline: g.deadline,
  }));

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
    minimum_working_flow: {
      must_tasks_count: mustPendingCount,
      cards_due_count: cardsDueCount,
      estimated_minutes: estimatedMinutes,
      exam_mode_active: examModeActive,
      exam_courses: examCourses,
    },
  });
});

export default router;
