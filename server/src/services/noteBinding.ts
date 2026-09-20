import type Database from 'better-sqlite3';
import type { NoteBindingSettings } from '../../../shared/types/noteBinding.js';
import { AppError } from '../middleware/errorHandler.js';
import { noteBindingSettingsSchema } from '../validators/noteBinding.js';

export function parseStoredNoteBindingSettings(value: unknown): NoteBindingSettings | null {
  let decoded = value;
  if (typeof value === 'string') {
    try { decoded = JSON.parse(value); } catch { return null; }
  }
  const result = noteBindingSettingsSchema.safeParse(decoded);
  return result.success ? result.data : null;
}

export function getNoteBindingSettings(db: Database.Database, userId: string, noteId: string) {
  const note = db.prepare('SELECT binding_settings_json FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { binding_settings_json: string | null } | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return { binding_settings: parseStoredNoteBindingSettings(note.binding_settings_json) };
}

/** Human presentation settings use their own note field, never content or page records. */
export function updateNoteBindingSettings(
  db: Database.Database,
  userId: string,
  noteId: string,
  settings: NoteBindingSettings | null,
) {
  const result = db.prepare(`UPDATE notes SET binding_settings_json = ?, updated_at = ?
    WHERE id = ? AND user_id = ?`).run(
    settings === null ? null : JSON.stringify(settings), new Date().toISOString(), noteId, userId,
  );
  if (!result.changes) throw new AppError(404, 'Note not found');
  return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
}
