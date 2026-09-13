import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Goal } from '../../../shared/types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createGoalSchema } from '../validators/index.js';

/** The complete SQLite row, retaining the human route's numeric exam_mode. */
export type GoalRow = Omit<Goal, 'exam_mode'> & { exam_mode: number };

/** Shared creation door: connection, user scope, input; return the complete owned row. */
export function createGoal(db: Database.Database, userId: string, input: unknown): GoalRow {
  const data = createGoalSchema.parse(input);

  // If parent_id is provided, verify parent exists and belongs to user
  let courseId = data.course_id;
  if (data.parent_id) {
    const parent = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(data.parent_id, userId) as GoalRow | undefined;
    if (!parent) {
      throw new AppError(404, 'Parent goal not found');
    }
    // Inherit course_id from parent if not explicitly provided differently
    if (!data.course_id || data.course_id === parent.course_id) {
      courseId = parent.course_id;
    }
  }

  // Verify course belongs to user
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  // Auto-assign sort_order: max + 1 among siblings
  const maxOrder = db.prepare(
    data.parent_id
      ? 'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM goals WHERE user_id = ? AND parent_id = ?'
      : 'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM goals WHERE user_id = ? AND parent_id IS NULL'
  ).get(...(data.parent_id ? [userId, data.parent_id] : [userId])) as { max_order: number };

  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO goals (id, user_id, course_id, title, description, deadline, exam_mode, status, parent_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
  ).run(id, userId, courseId, data.title, data.description || null, data.deadline || null, data.exam_mode ? 1 : 0, data.parent_id || null, sortOrder, now, now);

  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow;
}
