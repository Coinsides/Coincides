import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import type { ReorderNoteTrayInput } from '../validators/trayOrder.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';

/** Reorder placement edges together, without rewriting objects, mounts or content. */
export function reorderNoteTray(
  db: Database.Database,
  userId: string,
  noteId: string,
  { placementIds }: ReorderNoteTrayInput,
): { placementIds: string[] } {
  return db.transaction(() => {
    const note = db.prepare('SELECT id, status FROM notes WHERE id = ? AND user_id = ?')
      .get(noteId, userId) as { id: string; status: string } | undefined;
    if (!note) throw new AppError(404, 'Note not found');
    if (note.status !== 'active') throw new AppError(409, 'Note is not active');
    assertSourceProjectionNoteContentWriteAllowed(db, userId, noteId, 'reorder_note_tray');

    // Match getNoteCanvasPersistence: inactive/missing paragraph backing blocks
    // are omitted from the runtime, while shapes keep their placement without text.
    const current = db.prepare(`
      SELECT cp.id FROM canvas_placements cp
      WHERE cp.note_id = ? AND cp.user_id = ? AND cp.surface = 'tray'
        AND NOT EXISTS (
          SELECT 1 FROM canvas_objects co
          JOIN content_mounts cm ON cm.object_id = co.id
            AND cm.user_id = co.user_id AND cm.note_id = co.note_id
            AND cm.target_kind = 'note_block'
          LEFT JOIN note_blocks nb ON nb.id = cm.target_id AND nb.user_id = co.user_id
          WHERE co.id = cp.object_id AND co.user_id = cp.user_id AND co.note_id = cp.note_id
            AND co.status = 'active' AND co.kind = 'paragraph_block_projection'
            AND co.backing = 'note_block' AND (nb.id IS NULL OR nb.status != 'active')
        )
    `).all(noteId, userId) as { id: string }[];
    const currentIds = new Set(current.map(({ id }) => id));
    if (new Set(placementIds).size !== placementIds.length
      || placementIds.length !== currentIds.size
      || placementIds.some((id) => !currentIds.has(id))) {
      throw new AppError(409, 'Staging entries changed; refresh before reordering', {
        code: 'tray_order_conflict',
      });
    }

    if (placementIds.length > 0) {
      const now = new Date().toISOString();
      const update = db.prepare(`UPDATE canvas_placements SET order_index = ?, updated_at = ?
        WHERE id = ? AND note_id = ? AND user_id = ? AND surface = 'tray'`);
      placementIds.forEach((id, index) => {
        if (update.run(index, now, id, noteId, userId).changes !== 1) {
          throw new AppError(409, 'Staging entries changed; refresh before reordering', {
            code: 'tray_order_conflict',
          });
        }
      });
      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?').run(now, noteId, userId);
    }
    return { placementIds: [...placementIds] };
  })();
}
