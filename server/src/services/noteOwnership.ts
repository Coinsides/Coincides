import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

export interface OwnedNoteRow {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
  source_kind: string;
  page_format: string;
  binding_settings_json: string | null;
  metadata: string;
  operation_batch_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed_at: string | null;
  note_class: string;
}

export function getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNoteRow {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as OwnedNoteRow | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}
