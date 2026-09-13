import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskCardLink } from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { completeTaskSchema, createTaskSchema, linkTaskCardSchema } from '../validators/index.js';

export type TaskRow = Omit<Task, 'checklist' | 'exam_boost' | 'is_prerequisite'> & {
  checklist: string | null;
  exam_boost?: number;
  is_prerequisite?: number;
};

type RecurringGroupRow = { id: string; completed_tasks: number; [key: string]: unknown };
type ActivityRow = { id: string; [key: string]: unknown };

export interface TaskCompletionResult {
  before: TaskRow;
  after: TaskRow;
  activityId: string | null;
  activity: ActivityRow | null;
  recurringGroupBefore: RecurringGroupRow | null;
  recurringGroupAfter: RecurringGroupRow | null;
}

/** Shared creation door; presentation parsing of checklist remains in the route. */
export function createTask(db: Database.Database, userId: string, input: unknown): TaskRow {
  const data = createTaskSchema.parse(input);
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(data.course_id, userId);
  if (!course) throw new AppError(404, 'Course not found');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO tasks (id, user_id, course_id, goal_id, recurring_group_id, title, date, priority, status, order_index, start_time, end_time, description, checklist, time_block_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, data.course_id, data.goal_id || null, data.recurring_group_id || null,
    data.title, data.date, data.priority, data.order_index ?? 0,
    data.start_time || null, data.end_time || null, data.description || null,
    data.checklist ? JSON.stringify(data.checklist) : null, data.time_block_id || null, now, now);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
}

/** Status closure only; scheduling and other task edits remain in their human route. */
export function completeTask(db: Database.Database, userId: string, id: string, input: unknown): TaskCompletionResult {
  const data = completeTaskSchema.parse(input);
  return db.transaction(() => {
    const before = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
    if (!before) throw new AppError(404, 'Task not found');
    if (data.status === undefined && data.completed_at === undefined) throw new AppError(400, 'No fields to update');

    const fields: string[] = [];
    const values: unknown[] = [];
    const now = new Date().toISOString();
    let activityId: string | null = null;
    const recurringGroupBefore = before.recurring_group_id
      ? db.prepare('SELECT * FROM recurring_task_groups WHERE id = ?').get(before.recurring_group_id) as RecurringGroupRow | undefined
      : undefined;

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      if (data.status === 'completed' && before.status !== 'completed') {
        fields.push('completed_at = ?');
        values.push(now);
        activityId = uuidv4();
        db.prepare(
          'INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(activityId, userId, now.split('T')[0], 'task_completed', id, 'task');
        if (before.recurring_group_id) {
          db.prepare('UPDATE recurring_task_groups SET completed_tasks = completed_tasks + 1 WHERE id = ?').run(before.recurring_group_id);
        }
      } else if (data.status === 'pending' && before.status === 'completed') {
        fields.push('completed_at = ?');
        values.push(null);
        if (before.recurring_group_id) {
          db.prepare('UPDATE recurring_task_groups SET completed_tasks = MAX(0, completed_tasks - 1) WHERE id = ?').run(before.recurring_group_id);
        }
      }
    } else if (data.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(data.completed_at);
    }

    fields.push('updated_at = ?');
    values.push(now, id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const after = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
    const recurringGroupAfter = before.recurring_group_id
      ? db.prepare('SELECT * FROM recurring_task_groups WHERE id = ?').get(before.recurring_group_id) as RecurringGroupRow | undefined
      : undefined;
    const activity = activityId
      ? db.prepare('SELECT * FROM study_activity_log WHERE id = ?').get(activityId) as ActivityRow
      : null;
    return { before, after, activityId, activity, recurringGroupBefore: recurringGroupBefore ?? null, recurringGroupAfter: recurringGroupAfter ?? null };
  })();
}

/** One strict human link; the chat caller supplies the enclosing batch transaction. */
export function linkTaskCard(db: Database.Database, userId: string, taskId: string, input: unknown): TaskCardLink {
  const data = linkTaskCardSchema.parse(input);
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
  if (!task) throw new AppError(404, 'Task not found', { card_id: data.card_id });
  const card = db.prepare('SELECT id FROM cards WHERE id = ? AND user_id = ?').get(data.card_id, userId);
  if (!card) throw new AppError(404, `Card not found: ${data.card_id}`, { card_id: data.card_id });
  const existing = db.prepare(
    'SELECT id FROM task_cards WHERE task_id = ? AND card_id = ? AND checklist_index IS ?'
  ).get(taskId, data.card_id, data.checklist_index ?? null);
  if (existing) throw new AppError(409, `Link already exists: ${data.card_id}`, { card_id: data.card_id });
  const id = uuidv4();
  db.prepare('INSERT INTO task_cards (id, task_id, card_id, checklist_index) VALUES (?, ?, ?, ?)')
    .run(id, taskId, data.card_id, data.checklist_index ?? null);
  return db.prepare('SELECT * FROM task_cards WHERE id = ?').get(id) as TaskCardLink;
}
