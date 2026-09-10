import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { BoardTextRangeStatus, BoardTextRangeV1 } from '../../../shared/types/boardTextRange.js';
import { AppError } from '../middleware/errorHandler.js';
import { boardTextRangeSelectionSchema, updateBoardTextRangesSchema } from '../validators/boardTextRanges.js';
import { textFlowIdForBlock } from './textFlowIdentity.js';
import { validTextFlowUnits } from './textFlowUnits.js';
import { sliceGraphemes } from './graphemes.js';

interface RangeRow extends Omit<BoardTextRangeV1, 'pre_edit_offsets'> {
  user_id: string;
  pre_edit_offsets: string | null;
}

function requireTransaction(db: Database.Database): void {
  if (!db.inTransaction) throw new Error('Board text range writes require a caller-owned transaction');
}

function ownedNote(db: Database.Database, userId: string, noteId: string) {
  const note = db.prepare('SELECT id, title, status, note_class, source_kind FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { id: string; title: string; status: string; note_class: string; source_kind: string } | undefined;
  return note;
}

function hydrate(row: RangeRow): BoardTextRangeV1 {
  const { user_id: _owner, pre_edit_offsets, ...range } = row;
  return { ...range, pre_edit_offsets: pre_edit_offsets ? JSON.parse(pre_edit_offsets) : null };
}

/** GET only derives health; source loss never destroys or overwrites its snapshot. */
export function replayBoardTextRange(db: Database.Database, userId: string, range: BoardTextRangeV1) {
  const note = ownedNote(db, userId, range.note_id);
  const result = (status: BoardTextRangeStatus, reason: string | null, text = range.excerpt) => ({
    status, reason, text, title: note?.title ?? null,
  });
  if (!note || note.status !== 'active' || note.note_class === 'system' || note.source_kind === 'canvas_backing') {
    return result('lost', 'source_note_lost');
  }
  const block = db.prepare(`SELECT nb.content_json FROM note_blocks nb
    JOIN note_block_placements nbp ON nbp.block_id = nb.id
    WHERE nb.id = ? AND nbp.note_id = ? AND nb.user_id = ? AND nb.status = 'active'`)
    .get(range.block_id, range.note_id, userId) as { content_json: string } | undefined;
  if (!block) return result('lost', 'source_block_lost');
  // An explicit unsafe edit is sticky even if a new unit happens to reuse text.
  // A missing unit caused by split/merge therefore remains visibly drifted.
  if (range.status === 'drifted') return result('drifted', 'source_changed');
  if (range.text_flow_id !== textFlowIdForBlock(range.block_id)) return result('lost', 'source_unit_lost');
  let body: Record<string, unknown>;
  try { body = JSON.parse(block.content_json) as Record<string, unknown>; }
  catch { return result('lost', 'source_unit_lost'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return result('lost', 'source_unit_lost');
  const unit = validTextFlowUnits(body)?.find((entry) => entry.id === range.text_unit_id);
  if (!unit) return result('lost', 'source_unit_lost');
  if (typeof range.start_offset !== 'number' || typeof range.end_offset !== 'number'
    || range.end_offset <= range.start_offset || range.start_offset < 0 || range.end_offset > unit.text.length) {
    return result('drifted', 'source_changed');
  }
  const text = sliceGraphemes(unit.text, range.start_offset, range.end_offset);
  // Old snapshots retain their original UTF-16 coordinates and bytes; GET does not migrate them.
  const legacyText = unit.text.slice(range.start_offset, range.end_offset);
  return text === range.excerpt || legacyText === range.excerpt
    ? result('active', null, text) : result('drifted', 'source_changed');
}

export function getBoardTextRange(db: Database.Database, userId: string, id: string): BoardTextRangeV1 | null {
  const row = db.prepare('SELECT * FROM board_text_ranges WHERE id = ? AND user_id = ?')
    .get(id, userId) as RangeRow | undefined;
  return row ? hydrate(row) : null;
}

export function listBoardTextRanges(db: Database.Database, userId: string, noteId: string): BoardTextRangeV1[] {
  if (!ownedNote(db, userId, noteId)) throw new AppError(404, 'note_not_found');
  const rows = db.prepare('SELECT * FROM board_text_ranges WHERE user_id = ? AND note_id = ? ORDER BY created_at, id')
    .all(userId, noteId) as RangeRow[];
  return rows.map((row) => {
    const range = hydrate(row);
    return { ...range, status: replayBoardTextRange(db, userId, range).status };
  });
}

/** M1 kernel primitive. The public mint-and-mount door is enabled only in M2. */
export function createBoardTextRange(db: Database.Database, userId: string, boardId: string, value: unknown): BoardTextRangeV1 {
  requireTransaction(db);
  const input = boardTextRangeSelectionSchema.parse(value);
  if (!db.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId)) {
    throw new AppError(404, 'board_not_found');
  }
  const now = new Date().toISOString();
  const range: BoardTextRangeV1 = { ...input, id: uuidv4(), board_id: boardId, status: 'active',
    pre_edit_offsets: null, created_at: now, updated_at: now };
  const replay = replayBoardTextRange(db, userId, range);
  if (replay.status !== 'active') throw new AppError(409, 'board_text_range_source_changed', { reason: replay.reason });
  db.prepare(`INSERT INTO board_text_ranges (id, user_id, board_id, note_id, block_id, text_flow_id,
    text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets, at, created_at, updated_at)
    VALUES (@id, @user_id, @board_id, @note_id, @block_id, @text_flow_id, @text_unit_id,
      @start_offset, @end_offset, @excerpt, @status, @pre_edit_offsets, @at, @created_at, @updated_at)`)
    .run({ ...range, user_id: userId });
  return range;
}

/** Second commit after body save (TD-6). Patch IDs, never replace the note's anchor set. */
export function updateBoardTextRanges(db: Database.Database, userId: string, noteId: string, value: unknown): BoardTextRangeV1[] {
  requireTransaction(db);
  const input = updateBoardTextRangesSchema.parse(value);
  if (!ownedNote(db, userId, noteId)) throw new AppError(404, 'note_not_found');
  for (const update of input.text_ranges) {
    const existing = getBoardTextRange(db, userId, update.id);
    // Unmount/delete may race a pending note save. Never recreate that owned row.
    if (!existing || existing.note_id !== noteId) continue;
    const proposed = { ...existing, ...update };
    const replay = replayBoardTextRange(db, userId, proposed);
    // Source trash may overlap the second commit. Keep unsafe-edit evidence
    // durable underneath derived lost so restoring the source cannot erase it.
    const status = existing.status === 'drifted' || update.status === 'drifted' ? 'drifted' : replay.status;
    const excerpt = status === 'active' ? replay.text : existing.excerpt;
    const preEdit = status === 'drifted'
      ? existing.pre_edit_offsets ?? update.pre_edit_offsets ?? { start_offset: existing.start_offset, end_offset: existing.end_offset }
      : update.pre_edit_offsets;
    db.prepare(`UPDATE board_text_ranges SET block_id = ?, text_flow_id = ?, text_unit_id = ?,
      start_offset = ?, end_offset = ?, excerpt = ?, status = ?, pre_edit_offsets = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND note_id = ?`).run(update.block_id, update.text_flow_id,
      update.text_unit_id, update.start_offset, update.end_offset, excerpt, status,
      preEdit ? JSON.stringify(preEdit) : null, new Date().toISOString(), existing.id, userId, noteId);
  }
  return listBoardTextRanges(db, userId, noteId);
}
