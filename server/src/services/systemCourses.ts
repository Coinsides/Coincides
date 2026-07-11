import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

export const HOME_SYSTEM_KIND = 'home';
const HOME_NAME = 'Home';

export interface CourseIdentityRow {
  id: string;
  user_id: string;
  name: string;
  system_kind: string | null;
  [key: string]: unknown;
}

function findHomeCourse(db: Database.Database, userId: string): CourseIdentityRow | null {
  return (db.prepare(`
    SELECT *
    FROM courses
    WHERE user_id = ? AND system_kind = ?
  `).get(userId, HOME_SYSTEM_KIND) as CourseIdentityRow | undefined) || null;
}

export function ensureHomeCourse(db: Database.Database, userId: string): CourseIdentityRow {
  const existing = findHomeCourse(db, userId);
  if (existing) return existing;

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO courses (
        id, user_id, name, code, color, weight, description, semester,
        system_kind, created_at, updated_at
      )
      VALUES (
        ?, ?, ?, NULL, '#64748b', 2, 'System home for unfiled and preserved content.', NULL,
        ?, datetime('now'), datetime('now')
      )
    `).run(id, userId, HOME_NAME, HOME_SYSTEM_KIND);
  } catch (error) {
    const raced = findHomeCourse(db, userId);
    if (raced) return raced;
    throw error;
  }

  const created = findHomeCourse(db, userId);
  if (!created) throw new Error('Failed to create Home course');
  return created;
}

export function assertCourseCanRename(course: CourseIdentityRow, nextName: string): void {
  if (course.system_kind === HOME_SYSTEM_KIND && nextName !== course.name) {
    throw new AppError(400, 'System Home cannot be renamed');
  }
}

export function assertCourseCanDelete(course: CourseIdentityRow): void {
  if (course.system_kind === HOME_SYSTEM_KIND) {
    throw new AppError(400, 'System Home cannot be deleted');
  }
}
