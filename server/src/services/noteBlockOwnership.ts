import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

export interface OwnedNoteBlockRow {
  id: string;
  user_id: string;
  course_id: string;
  block_type: string;
  title: string | null;
  content_json: string;
  plain_text: string | null;
  status: string;
  source_kind: string;
  metadata: string;
  operation_batch_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed_at: string | null;
  text_save_revision: number;
}

export function getOwnedBlock(db: Database.Database, userId: string, blockId: string): OwnedNoteBlockRow {
  const block = db.prepare('SELECT * FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as OwnedNoteBlockRow | undefined;
  if (!block) throw new AppError(404, 'Note block not found');
  return block;
}
