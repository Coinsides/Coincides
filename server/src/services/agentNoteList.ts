import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { listNotes } from './notes.js';

export const AGENT_NOTE_LIST_LIMIT = 50;

export interface AgentNoteListEntry {
  id: string;
  title: string;
  note_class: string;
  updated_at: string;
}

export type AgentNoteListResult =
  | { course_id: string; notes: AgentNoteListEntry[]; total: number; truncated: boolean; note?: string }
  | { error: string };

/**
 * The project's active notes, newest first, as identities only. Reads through the
 * same listNotes service as the project page and the public list_notes tool, so
 * the Agent sees exactly the human's list; body text stays behind read_note.
 */
export function listNotesForAgent(
  db: Database.Database,
  userId: string,
  input: { courseId?: string; contextCourseId?: string },
): AgentNoteListResult {
  const courseId = input.courseId?.trim() || input.contextCourseId;
  if (!courseId) {
    return { error: 'course_id is required when no project is in context; call list_courses to find it.' };
  }
  let all: AgentNoteListEntry[];
  try {
    all = listNotes({ userId, courseId, status: 'active' }) as AgentNoteListEntry[];
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) return { error: 'Project not found' };
    throw error;
  }
  const total = all.length;
  const notes = all.slice(0, AGENT_NOTE_LIST_LIMIT)
    .map(({ id, title, note_class, updated_at }) => ({ id, title, note_class, updated_at }));
  const truncated = total > notes.length;
  return {
    course_id: courseId,
    notes,
    total,
    truncated,
    ...(truncated ? { note: `Showing the ${notes.length} most recently updated of ${total} notes.` } : {}),
  };
}

/** The project the user is looking at, if the context hint names an owned object in one. */
export function contextCourseIdForAgent(
  db: Database.Database,
  userId: string,
  hint: { type: string; data: object } | undefined,
): string | undefined {
  if (!hint) return undefined;
  const data = hint.data as Record<string, unknown>;
  const lookup = (sql: string, id: unknown) => typeof id === 'string'
    ? (db.prepare(sql).get(id, userId) as { course_id: string | null } | undefined)?.course_id ?? undefined
    : undefined;
  switch (hint.type) {
    case 'note_view': return lookup('SELECT course_id FROM notes WHERE id = ? AND user_id = ?', data.note_id);
    case 'deck': return lookup('SELECT course_id FROM card_decks WHERE id = ? AND user_id = ?', data.deck_id);
    case 'board_view': return lookup('SELECT project_id AS course_id FROM boards WHERE id = ? AND user_id = ?', data.board_id);
    default: return undefined;
  }
}
