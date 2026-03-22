import { queryAll, queryOne } from '../db/pool.js';
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
export async function getGoalTopologicalOrder(userId: string, courseId?: string): Promise<string[]> {
  let goalsQuery = 'SELECT id FROM goals WHERE user_id = ?';
  const params: unknown[] = [userId];
  if (courseId) {
    goalsQuery += ' AND course_id = ?';
    params.push(courseId);
  }

  const goals = await queryAll(goalsQuery, params);
  const goalIds = new Set(goals.map(g => g.id));

  // Build adjacency: goal_id depends_on depends_on_goal_id
  const goalIdArr = Array.from(goalIds);
  const placeholders = goalIdArr.map((_, i) => `$${i + 1}`).join(',');
  const deps = await queryAll(
    `SELECT goal_id, depends_on_goal_id FROM goal_dependencies WHERE goal_id IN (${placeholders})`,
    goalIdArr
  ) as Array<{ goal_id: string; depends_on_goal_id: string }>;

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

/** Parse 'HH:MM' to total minutes from midnight */
function hhmmToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get available study minutes for each day in a date range.
 * v1.5: Subtracts nested non-study blocks from study block time.
 *   available = Study Block total − Σ(non-study blocks nested inside study block)
 */
export async function getDailyCapacities(userId: string, startDate: string, endDate: string): Promise<DayCapacity[]> {
  const capacities: DayCapacity[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay(); // 0=Sun

    // v1.7.3: Get date-based time block instances directly
    const blocks = await queryAll(`SELECT id, start_time, end_time, type FROM time_blocks WHERE user_id = $1 AND date = $2`, [userId, dateStr])<{ id: string; start_time: string; end_time: string; type: string }>;

    const resolved: Array<{ id: string; type: string; startMin: number; endMin: number }> = [];
    for (const b of blocks) {
      const sMin = hhmmToMin(b.start_time);
      const eMin = hhmmToMin(b.end_time);
      if (eMin > sMin) {
        resolved.push({ id: b.id, type: b.type, startMin: sMin, endMin: eMin });
      }
    }

    // Separate study and non-study blocks
    const studyBlocks = resolved.filter(b => b.type === 'study');
    const nonStudyBlocks = resolved.filter(b => b.type !== 'study');

    // Compute gross study time
    let studyMinutes = 0;
    for (const sb of studyBlocks) {
      studyMinutes += sb.endMin - sb.startMin;
    }

    // Subtract non-study blocks that are nested inside any study block
    let nestedSubtract = 0;
    for (const nsb of nonStudyBlocks) {
      for (const sb of studyBlocks) {
        // Calculate overlap between non-study block and study block
        const overlapStart = Math.max(nsb.startMin, sb.startMin);
        const overlapEnd = Math.min(nsb.endMin, sb.endMin);
        if (overlapEnd > overlapStart) {
          nestedSubtract += overlapEnd - overlapStart;
        }
      }
    }

    const netStudyMinutes = Math.max(0, studyMinutes - nestedSubtract);

    // Count existing tasks
    const existing = await queryOne(`SELECT COUNT(*) as cnt FROM tasks WHERE user_id = $1 AND date = $2 AND status = $3`, [userId, dateStr, 'pending']) as { cnt: number };

    capacities.push({
      date: dateStr,
      available_study_minutes: netStudyMinutes,
      existing_task_count: existing.cnt,
      existing_must_minutes: 0,
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
