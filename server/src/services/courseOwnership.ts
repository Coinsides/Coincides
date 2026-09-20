import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

export interface OwnedCourseRow {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  weight: number;
  description: string | null;
  semester: string | null;
  skin: string | null;
  created_at: string;
  updated_at: string;
  system_kind: string | null;
}

export function getOwnedCourse(db: Database.Database, userId: string, courseId: string): OwnedCourseRow {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as OwnedCourseRow | undefined;
  if (!course) throw new AppError(404, 'Course not found');
  return course;
}
