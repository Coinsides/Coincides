/**
 * Coincides v1.3 — Task Scheduling Engine
 *
 * Greedy scheduler: assigns tasks to days based on:
 *   1. Goal dependency ordering (topological sort)
 *   2. Priority: Must > Recommended > Optional
 *   3. Deadline proximity (closer deadlines first)
 *   4. Available study minutes per day (from Time Blocks)
 *   5. Existing task load per day
 *
 * Design Constitution compliance:
 *   - Assigns tasks to DAYS only, never to specific time slots (§3: no locking)
 *   - estimated_minutes is internal only, never exposed to user
 *   - Only moves 'pending' tasks during rescheduling
 */

import { getDb } from '../db/init.js';

// ── Types ──────────────────────────────────────────────

interface TaskDraft {
  title: string;
  priority: 'must' | 'recommended' | 'optional';
  course_id: string;
  goal_id?: string;
  estimated_minutes?: number; // internal only
  description?: string;
}

interface ScheduledTask extends TaskDraft {
  scheduled_date: string; // YYYY-MM-DD
}

interface DayCapacity {
  date: string;
  available_study_minutes: number;
  existing_task_count: number;
  existing_must_minutes: number; // estimated total of already-assigned must tasks
}

interface ScheduleInput {
  tasks: TaskDraft[];
  deadline: string; // YYYY-MM-DD
  start_date: string; // YYYY-MM-DD
  daily_capacities: DayCapacity[];
  goal_order?: string[]; // goal IDs in dependency order (prerequisites first)
}

interface ScheduleResult {
  scheduled: ScheduledTask[];
  overflow: TaskDraft[]; // tasks that couldn't fit
}

// ── Helpers ──────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  must: 3,
  recommended: 2,
  optional: 1,
};

const DEFAULT_TASK_MINUTES = 30; // fallback estimate

/**
 * Get topological sort order for goals based on dependencies.
 * Returns goal IDs ordered so prerequisites come first.
 */
export function getGoalTopologicalOrder(userId: string, courseId?: string): string[] {
  const db = getDb();

  let goalsQuery = 'SELECT id FROM goals WHERE user_id = ?';
  const params: unknown[] = [userId];
  if (courseId) {
    goalsQuery += ' AND course_id = ?';
    params.push(courseId);
  }

  const goals = db.prepare(goalsQuery).all(...params) as Array<{ id: string }>;
  const goalIds = new Set(goals.map(g => g.id));

  // Build adjacency: goal_id depends_on depends_on_goal_id
  const deps = db.prepare(
    'SELECT goal_id, depends_on_goal_id FROM goal_dependencies WHERE goal_id IN (' +
    Array.from(goalIds).map(() => '?').join(',') + ')'
  ).all(...Array.from(goalIds)) as Array<{ goal_id: string; depends_on_goal_id: string }>;

  // Build in-degree map + adjacency list
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of goalIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const d of deps) {
    if (goalIds.has(d.depends_on_goal_id)) {
      inDegree.set(d.goal_id, (inDegree.get(d.goal_id) || 0) + 1);
      adj.get(d.depends_on_goal_id)!.push(d.goal_id);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of adj.get(current) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return order;
}

/**
 * Get available study minutes for each day in a date range.
 */
export function getDailyCapacities(userId: string, startDate: string, endDate: string): DayCapacity[] {
  const db = getDb();
  const capacities: DayCapacity[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay(); // 0=Sun

    // Get time blocks for this day of week
    const blocks = db.prepare(
      'SELECT start_time, end_time, type FROM time_blocks WHERE user_id = ? AND day_of_week = ?'
    ).all(userId, dow) as Array<{ start_time: string; end_time: string; type: string }>;

    // Check for overrides
    const overrides = db.prepare(
      'SELECT time_block_id, start_time, end_time FROM time_block_overrides WHERE user_id = ? AND override_date = ?'
    ).all(userId, dateStr) as Array<{ time_block_id: string; start_time: string | null; end_time: string | null }>;

    const overMap = new Map(overrides.map(o => [o.time_block_id, o]));

    // Compute study minutes (union of study blocks)
    const studyRanges: Array<{ start: number; end: number }> = [];
    for (const b of blocks) {
      const ov = overMap.get((b as any).id);
      if (ov && ov.start_time === null) continue; // deleted

      const st = ov ? ov.start_time! : b.start_time;
      const et = ov ? ov.end_time! : b.end_time;

      if (b.type === 'study') {
        const [sh, sm] = st.split(':').map(Number);
        const [eh, em] = et.split(':').map(Number);
        const sMin = sh * 60 + sm;
        const eMin = eh * 60 + em;
        if (eMin > sMin) {
          studyRanges.push({ start: sMin, end: eMin });
        } else {
          // Midnight-crossing block: split into two ranges
          if (sMin < 1440) studyRanges.push({ start: sMin, end: 1440 });
          if (eMin > 0) studyRanges.push({ start: 0, end: eMin });
        }
      }
    }

    // Merge overlapping ranges
    studyRanges.sort((a, b) => a.start - b.start);
    const merged: typeof studyRanges = [];
    for (const r of studyRanges) {
      if (merged.length > 0 && r.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
      } else {
        merged.push({ ...r });
      }
    }
    const studyMinutes = merged.reduce((sum, r) => sum + (r.end - r.start), 0);

    // Count existing tasks
    const existing = db.prepare(
      'SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND date = ? AND status = ?'
    ).get(userId, dateStr, 'pending') as { cnt: number };

    capacities.push({
      date: dateStr,
      available_study_minutes: studyMinutes,
      existing_task_count: existing.cnt,
      existing_must_minutes: 0, // simplified for v1.3
    });
  }

  return capacities;
}

/**
 * Main scheduling function.
 * Assigns tasks to days using greedy strategy.
 */
export function scheduleTasksAcrossDays(input: ScheduleInput): ScheduleResult {
  const { tasks, daily_capacities, goal_order } = input;

  // Sort tasks by:
  // 1. Goal dependency order (prerequisites first)
  // 2. Priority (must > recommended > optional)
  const goalOrderMap = new Map<string, number>();
  if (goal_order) {
    goal_order.forEach((id, idx) => goalOrderMap.set(id, idx));
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    // Goal order first
    const aOrder = a.goal_id ? (goalOrderMap.get(a.goal_id) ?? 999) : 999;
    const bOrder = b.goal_id ? (goalOrderMap.get(b.goal_id) ?? 999) : 999;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Then priority
    return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
  });

  // Track remaining capacity per day
  const dayBudget = new Map<string, number>();
  for (const cap of daily_capacities) {
    // If no time blocks, allow a default capacity (fallback: 120 min = 2 hours)
    const budget = cap.available_study_minutes > 0
      ? cap.available_study_minutes - cap.existing_must_minutes
      : 120;
    dayBudget.set(cap.date, Math.max(budget, 0));
  }

  const scheduled: ScheduledTask[] = [];
  const overflow: TaskDraft[] = [];

  for (const task of sortedTasks) {
    const est = task.estimated_minutes || DEFAULT_TASK_MINUTES;
    let assigned = false;

    // Find the first day with enough capacity
    for (const cap of daily_capacities) {
      const remaining = dayBudget.get(cap.date) || 0;

      // Strict capacity check (only when user has Time Blocks)
      if (cap.available_study_minutes > 0 && remaining < est) {
        continue;
      }

      // Soft cap in fallback mode (no Time Blocks): don't overload a single day
      if (cap.available_study_minutes === 0 && remaining <= 0) {
        continue;
      }

      // Assign to this day
      scheduled.push({ ...task, scheduled_date: cap.date });
      dayBudget.set(cap.date, remaining - est);
      assigned = true;
      break;
    }

    if (!assigned) {
      overflow.push(task);
    }
  }

  return { scheduled, overflow };
}
