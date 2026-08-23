import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { getOwnedCourse, hydrateNote } from '../routes/notes.js';

export interface ListNotesInput {
  userId: string;
  courseId?: string;
  status?: string;
}

interface NoteLifecycleTarget {
  userId: string;
  noteId: string;
}

export function trashNote({ userId, noteId }: NoteLifecycleTarget): void {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE notes SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, noteId, userId);
}

export function restoreNote({ userId, noteId }: NoteLifecycleTarget): void {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE notes SET status = 'active', trashed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, noteId, userId);
}

export function listNotes({
  userId,
  courseId,
  status,
}: ListNotesInput) {
  if (!courseId) throw new AppError(400, 'course_id query parameter is required');
  const resolvedStatus = status || 'active';
  if (!['active', 'archived', 'trashed'].includes(resolvedStatus)) {
    throw new AppError(400, 'Invalid status');
  }

  getOwnedCourse(courseId, userId);

  return getDb()
    .prepare('SELECT * FROM notes WHERE user_id = ? AND course_id = ? AND status = ? ORDER BY updated_at DESC')
    .all(userId, courseId, resolvedStatus)
    .map(hydrateNote);
}
