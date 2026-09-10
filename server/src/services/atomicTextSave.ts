import type Database from 'better-sqlite3';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { updateNoteBlockSchema } from '../validators/index.js';
import { updateBoardTextRangesSchema } from '../validators/boardTextRanges.js';
import { listAnnotationTruths, patchTextSaveAnnotationRanges } from './annotationTruths.js';
import { getBoardTextRange, updateBoardTextRanges } from './boardTextRanges.js';
import { updateNoteBlockContent } from './noteBlockContent.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';

const id = z.string().trim().min(1).max(180);
const textSaveSchema = z.object({
  note_id: id,
  base_revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  block: updateNoteBlockSchema.omit({ status: true }).strict(),
  annotations: z.object({ range_updates: z.array(z.object({
    annotation_id: id, range: z.record(z.unknown()),
  }).strict()).max(10000) }).strict(),
  text_ranges: updateBoardTextRangesSchema.shape.text_ranges,
}).strict();

/** Scope: one block's text-save door, not generic canvas/placement or board-owned writes. */
export function saveAtomicText(db: Database.Database, userId: string, blockId: string, value: unknown) {
  const input = textSaveSchema.parse(value);
  return db.transaction(() => {
    const current = db.prepare(`SELECT nb.text_save_revision FROM note_blocks nb
      JOIN note_block_placements p ON p.block_id = nb.id
      JOIN notes n ON n.id = p.note_id
      WHERE nb.id = ? AND nb.user_id = ? AND n.id = ? AND n.user_id = ?`)
      .get(blockId, userId, input.note_id, userId) as { text_save_revision: number } | undefined;
    if (!current) throw new AppError(404, 'Note block not found');
    assertSourceProjectionNoteContentWriteAllowed(db, userId, input.note_id, 'update_note_block');
    if (current.text_save_revision !== input.base_revision) {
      throw new AppError(409, 'stale_revision', { code: 'stale_revision', current_revision: current.text_save_revision });
    }
    // Conditional read and write share the same synchronous SQLite transaction.
    // Semantic range validation intentionally happens after the body write: any
    // rejection (including a late range failure) rolls this update back as well.
    const block = updateNoteBlockContent(db, userId, blockId, input.block, input.base_revision);
    patchTextSaveAnnotationRanges(db, userId, input.note_id, blockId, input.annotations.range_updates);
    for (const range of input.text_ranges) {
      const existing = getBoardTextRange(db, userId, range.id);
      if (range.block_id !== blockId || (existing && (existing.block_id !== blockId || existing.note_id !== input.note_id))) {
        throw new AppError(400, 'Board text range belongs to another block');
      }
    }
    const textRanges = updateBoardTextRanges(db, userId, input.note_id, { text_ranges: input.text_ranges });
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(new Date().toISOString(), input.note_id, userId);
    return { block, annotations: listAnnotationTruths(db, userId, input.note_id),
      text_ranges: textRanges, revision: block.text_save_revision as number };
  })();
}
