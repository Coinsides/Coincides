import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { getOwnedCourse, getOwnedNote } from '../routes/notes.js';
import { hydrateNote } from './noteHydration.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';

export interface ListNotesInput {
  userId: string;
  courseId?: string;
  status?: string;
}

interface NoteLifecycleTarget {
  userId: string;
  noteId: string;
}

export interface NoteLifecycleWriteResult {
  changes: number;
}

export type TrashNoteAsUserResult =
  | { outcome: 'trashed' }
  | { outcome: 'skipped'; reason: 'already_trashed' | 'read_only_projection' }
  | { outcome: 'missing' };

export type RestoreNoteAsUserResult =
  | { outcome: 'restored' }
  | { outcome: 'skipped'; reason: 'already_active' }
  | { outcome: 'missing' };

export function trashNote({ userId, noteId }: NoteLifecycleTarget): NoteLifecycleWriteResult {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE notes SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, noteId, userId);
  return { changes: result.changes };
}

export function restoreNote({ userId, noteId }: NoteLifecycleTarget): NoteLifecycleWriteResult {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE notes SET status = 'active', trashed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, noteId, userId);
  return { changes: result.changes };
}

function ownedNoteOrMissing({ userId, noteId }: NoteLifecycleTarget) {
  try {
    return getOwnedNote(noteId, userId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404 && error.message === 'Note not found') {
      return null;
    }
    throw error;
  }
}

function isSourceProjectionReadOnlyError(error: unknown): boolean {
  if (!(error instanceof AppError) || error.statusCode !== 409) return false;
  const details = error.details;
  return Boolean(
    details
    && typeof details === 'object'
    && !Array.isArray(details)
    && (details as Record<string, unknown>).code === 'source_projection_read_only',
  );
}

export function trashNoteAsUser(target: NoteLifecycleTarget): TrashNoteAsUserResult {
  const note = ownedNoteOrMissing(target);
  if (!note) return { outcome: 'missing' };
  if (note.status === 'trashed') {
    return { outcome: 'skipped', reason: 'already_trashed' };
  }

  try {
    assertSourceProjectionNoteContentWriteAllowed(
      getDb(),
      target.userId,
      target.noteId,
      'delete_note',
    );
  } catch (error) {
    if (isSourceProjectionReadOnlyError(error)) {
      return { outcome: 'skipped', reason: 'read_only_projection' };
    }
    throw error;
  }

  trashNote(target);
  return { outcome: 'trashed' };
}

export function restoreNoteAsUser(target: NoteLifecycleTarget): RestoreNoteAsUserResult {
  const note = ownedNoteOrMissing(target);
  if (!note) return { outcome: 'missing' };
  if (note.status === 'active') {
    return { outcome: 'skipped', reason: 'already_active' };
  }

  restoreNote(target);
  return { outcome: 'restored' };
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
