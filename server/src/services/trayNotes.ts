import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';

type Row = Record<string, any>;
interface SplitReceipt {
  sourceNoteId: string;
  destinationNoteId: string;
  memberships: Row[];
  sourcePlacements: Row[];
  destinationPlacements: Row[];
}

function ownedNote(db: Database.Database, userId: string, noteId: string): Row {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId) as Row | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

// Only stored snapshots of this table enter here, never client-supplied column names.
function restorePlacement(db: Database.Database, row: Row): void {
  const columns = (db.prepare('PRAGMA table_info(canvas_placements)').all() as { name: string }[])
    .map(({ name }) => name);
  db.prepare(`INSERT INTO canvas_placements (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
    .run(...columns.map((column) => row[column] ?? null));
}

/** Move membership, not content. Placement snapshots make the ordinary edit reversible. */
export function splitTrayNote(
  db: Database.Database,
  userId: string,
  noteId: string,
  input: { placement_ids: string[]; title: string },
) {
  return db.transaction(() => {
    const note = ownedNote(db, userId, noteId);
    if (note.status !== 'active') throw new AppError(409, 'Note is not active');
    assertSourceProjectionNoteContentWriteAllowed(db, userId, noteId, 'split_tray_note');
    const ids = [...new Set(input.placement_ids)];
    if (ids.length === 0) throw new AppError(400, 'Select tray blocks first');
    const memberships: Row[] = [];
    const sourcePlacements: Row[] = [];
    for (const id of ids) {
      const member = db.prepare(`SELECT nbp.* FROM note_block_placements nbp
        JOIN note_blocks nb ON nb.id = nbp.block_id
        WHERE nbp.id = ? AND nbp.note_id = ? AND nb.user_id = ? AND nb.status = 'active'`)
        .get(id, noteId, userId) as Row | undefined;
      const placement = db.prepare(`SELECT cp.* FROM canvas_placements cp
        JOIN canvas_objects co ON co.id = cp.object_id AND co.note_id = cp.note_id
        JOIN content_mounts cm ON cm.object_id = co.id AND cm.note_id = co.note_id
        WHERE cp.id = ? AND cp.note_id = ? AND cp.user_id = ? AND cp.surface = 'tray'
          AND co.kind = 'paragraph_block_projection' AND co.status = 'active'
          AND cm.target_kind = 'note_block' AND cm.target_id = ?`)
        .get(id, noteId, userId, member?.block_id ?? '') as Row | undefined;
      if (!member || !placement) throw new AppError(409, 'Selected placement is not a tray block');
      // A shape owns its backing block lifecycle; it cannot be split as an ordinary block.
      const shapeOwner = db.prepare(`SELECT 1 FROM content_mounts cm
        JOIN canvas_objects co ON co.id = cm.object_id
        WHERE cm.user_id = ? AND cm.target_kind = 'note_block' AND cm.target_id = ?
          AND cm.projection_mode = 'owned' AND co.kind = 'shape' AND co.status = 'active'`)
        .get(userId, member.block_id);
      if (shapeOwner) throw new AppError(409, 'Shape-owned blocks cannot be split independently');
      memberships.push(member);
      sourcePlacements.push(placement);
    }
    const destinationNoteId = uuidv4();
    const batchId = uuidv4();
    const now = new Date().toISOString();
    const receipt: SplitReceipt = { sourceNoteId: noteId, destinationNoteId, memberships, sourcePlacements, destinationPlacements: [] };
    db.prepare(`INSERT INTO operation_batches
      (id, user_id, course_id, source_type, label, status, metadata, applied_at)
      VALUES (?, ?, ?, 'manual', 'Split tray blocks into a note', 'applied', ?, ?)`)
      .run(batchId, userId, note.course_id, JSON.stringify({ tray_split: receipt }), now);
    db.prepare(`INSERT INTO notes
      (id, user_id, course_id, title, page_format, operation_batch_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(destinationNoteId, userId, note.course_id, input.title, note.page_format, batchId, now, now);
    memberships.forEach((member, index) => {
      db.prepare(`UPDATE note_block_placements SET note_id = ?, parent_placement_id = NULL,
        order_index = ?, updated_at = ? WHERE id = ?`).run(destinationNoteId, index, now, member.id);
      // Remove only the placement edge. Objects, mounts, blocks and all content remain.
      db.prepare('DELETE FROM canvas_placements WHERE id = ? AND note_id = ?').run(member.id, noteId);
    });
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(now, noteId);
    return { note_id: destinationNoteId, batch_id: batchId };
  })();
}

export function setTraySplitApplied(
  db: Database.Database, userId: string, noteId: string, batchId: string, applied: boolean,
) {
  return db.transaction(() => {
    const batch = db.prepare('SELECT * FROM operation_batches WHERE id = ? AND user_id = ?')
      .get(batchId, userId) as Row | undefined;
    const receipt = batch ? JSON.parse(batch.metadata).tray_split as SplitReceipt | undefined : undefined;
    if (!batch || !receipt || receipt.sourceNoteId !== noteId) throw new AppError(404, 'Tray split edit not found');
    ownedNote(db, userId, receipt.sourceNoteId);
    ownedNote(db, userId, receipt.destinationNoteId);
    if ((batch.status === 'applied') === applied) return { note_id: receipt.destinationNoteId, batch_id: batchId };
    const from = applied ? receipt.sourceNoteId : receipt.destinationNoteId;
    const to = applied ? receipt.destinationNoteId : receipt.sourceNoteId;
    assertSourceProjectionNoteContentWriteAllowed(db, userId, from, 'undo_redo_tray_split');
    assertSourceProjectionNoteContentWriteAllowed(db, userId, to, 'undo_redo_tray_split');
    const now = new Date().toISOString();
    const currentPlacements: Row[] = [];
    for (const member of receipt.memberships) {
      const current = db.prepare('SELECT note_id FROM note_block_placements WHERE id = ? AND block_id = ?')
        .get(member.id, member.block_id) as Row | undefined;
      if (current?.note_id !== from) throw new AppError(409, 'A split block has moved since this edit');
      const placement = db.prepare('SELECT * FROM canvas_placements WHERE id = ? AND note_id = ? AND user_id = ?')
        .get(member.id, from, userId) as Row | undefined;
      if (placement) currentPlacements.push(placement);
    }
    if (applied) receipt.sourcePlacements = currentPlacements;
    else receipt.destinationPlacements = currentPlacements;
    receipt.memberships.forEach((member, index) => {
      db.prepare('DELETE FROM canvas_placements WHERE id = ? AND note_id = ?').run(member.id, from);
      db.prepare(`UPDATE note_block_placements SET note_id = ?, parent_placement_id = ?,
        order_index = ?, updated_at = ? WHERE id = ?`)
        .run(to, applied ? null : member.parent_placement_id, applied ? index : member.order_index, now, member.id);
    });
    for (const row of applied ? receipt.destinationPlacements : receipt.sourcePlacements) restorePlacement(db, row);
    db.prepare(`UPDATE notes SET status = 'active', trashed_at = NULL, updated_at = ? WHERE id = ?`).run(now, to);
    if (!applied && !db.prepare('SELECT 1 FROM note_block_placements WHERE note_id = ? LIMIT 1').get(from)) {
      db.prepare(`UPDATE notes SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, from);
    }
    db.prepare(`UPDATE operation_batches SET status = ?, metadata = ?, reverted_at = ? WHERE id = ?`)
      .run(applied ? 'applied' : 'reverted', JSON.stringify({ tray_split: receipt }), applied ? null : now, batchId);
    return { note_id: receipt.destinationNoteId, batch_id: batchId };
  })();
}
