import type Database from 'better-sqlite3';
import type { NoteBindingSettings } from '../../../shared/types/noteBinding.js';
import { getNoteBindingCover, getNoteBindingCoverPage, upgradeNoteBindingSettings } from './noteBindingModel.js';
import { AppError } from '../middleware/errorHandler.js';
import { noteBindingSettingsSchema } from '../validators/noteBinding.js';
import { getNoteCanvasPersistence, savePageFrameCollection } from './canvasObjects.js';
import { getCanvasAsset } from './canvasAssets.js';
import { assertCoverPlacement } from './noteCoverRules.js';
import { projectCanvasPlacementLayout } from './canvasPlacementLayout.js';
import { assertSourceProjectionNoteContentWriteAllowed } from './sourceProjectionPolicy.js';
import { detachLegacyNoteCover, readNoteBindingView } from './noteCoverStorage.js';

export function parseStoredNoteBindingSettings(value: unknown): NoteBindingSettings | null {
  let decoded = value;
  if (typeof value === 'string') {
    try { decoded = JSON.parse(value); } catch { return null; }
  }
  const result = noteBindingSettingsSchema.safeParse(decoded);
  return result.success ? result.data : null;
}

export function getNoteBindingSettings(db: Database.Database, userId: string, noteId: string) {
  const note = db.prepare('SELECT binding_settings_json, metadata FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { binding_settings_json: string | null; metadata: string } | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return { binding_settings: readNoteBindingView(note) };
}

/** Human presentation settings use their own note field, never content or page records. */
export function updateNoteBindingSettings(
  db: Database.Database,
  userId: string,
  noteId: string,
  settings: NoteBindingSettings | null,
  collection?: Record<string, unknown>,
) {
  return db.transaction(() => {
    const current = getNoteBindingSettings(db, userId, noteId).binding_settings;
    const currentCover = getNoteBindingCover(current);
    if (settings?.version === 1 && current?.version === 2) {
      settings = { ...upgradeNoteBindingSettings(settings), cover: current.cover, coverPage: current.coverPage };
    }
    if (settings?.version === 2 && settings.cover) {
      getCanvasAsset(db, userId, settings.cover.assetId);
      const card = currentCover?.card ?? settings.cover.card;
      if (!card) throw new AppError(400, 'A new cover image requires its initial card viewport');
      settings = { ...settings, cover: { ...settings.cover,
        card,
        ...(settings.cover.page || currentCover?.page ? { page: settings.cover.page ?? currentCover?.page } : {}),
      } };
    }
    const oldCoverId = getNoteBindingCoverPage(current).frameId;
    const nextCoverId = getNoteBindingCoverPage(settings).frameId;
    if (oldCoverId !== nextCoverId && !collection) {
      throw new AppError(400, 'Cover page changes require the page collection in the same request');
    }
    const cover = getNoteBindingCover(settings);
    if (cover) getCanvasAsset(db, userId, cover.assetId);
    let destinationId: string | null = null;
    if (collection) {
      assertSourceProjectionNoteContentWriteAllowed(db, userId, noteId, 'update_page_frame_collection');
      const before = getNoteCanvasPersistence(db, userId, noteId).pageFrameCollection;
      const frames = Array.isArray(collection.pageFrames) ? collection.pageFrames as Record<string, unknown>[] : [];
      const ids = frames.map((frame) => frame?.id);
      if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) {
        throw new AppError(400, 'Cover pages require distinct page identities');
      }
      if (!frames.length || (nextCoverId && (ids[0] !== nextCoverId || frames.length < 2))) {
        throw new AppError(400, 'The cover must precede at least one content page');
      }
      if (nextCoverId && collection.primaryFrameId === nextCoverId) {
        throw new AppError(400, 'The primary flow page remains a content page');
      }
      for (const frame of before?.pageFrames ?? []) {
        if (frame.id !== oldCoverId && !ids.includes(frame.id)) {
          throw new AppError(400, 'Cover lifecycle cannot remove content pages');
        }
      }
      const stacks = Array.isArray(collection.pageStacks) ? collection.pageStacks as Record<string, unknown>[] : [];
      if (nextCoverId && stacks.some((stack) => Array.isArray(stack.frameIds)
        && stack.frameIds.includes(nextCoverId) && stack.frameIds.length !== 1)) {
        throw new AppError(400, 'The cover must stay outside content flow stacks');
      }
      if (oldCoverId && oldCoverId !== nextCoverId) {
        if (ids.includes(oldCoverId)) throw new AppError(400, 'Removing the cover must retire its page frame');
        destinationId = ids.find((id) => id !== nextCoverId) as string | undefined ?? null;
        if (!destinationId) throw new AppError(400, 'Cover residents need a first content page');
      }
    }
    db.prepare(`UPDATE notes SET binding_settings_json = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`).run(
      settings === null ? null : JSON.stringify(settings), new Date().toISOString(), noteId, userId,
    );
    if (settings?.version === 2 || current?.version === 2) {
      const row = db.prepare('SELECT metadata FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId) as { metadata: string };
      let metadata: Record<string, unknown> = {};
      try { metadata = JSON.parse(row.metadata); } catch { /* Existing empty metadata. */ }
      const detached = detachLegacyNoteCover(metadata);
      if (detached !== metadata) db.prepare('UPDATE notes SET metadata = ? WHERE id = ? AND user_id = ?')
        .run(JSON.stringify(detached), noteId, userId);
    }
    if (collection) {
      savePageFrameCollection(db, userId, noteId, collection);
      if (destinationId && oldCoverId) {
        // Only affiliation moves. Replaying rounded read-side layouts would lose
        // subpixel coordinates; ink and archived residents retain their exact data.
        db.prepare(`UPDATE canvas_placements SET frame_id = ?, updated_at = ?
          WHERE user_id = ? AND note_id = ? AND frame_id = ?`).run(
          destinationId, new Date().toISOString(), userId, noteId, oldCoverId,
        );
        // A creation that has not reached canvas placement still belongs to the
        // retired page. Transfer that reservation too, including reused frame IDs.
        db.prepare(`UPDATE note_block_placements SET display_overrides_json =
          json_set(display_overrides_json, '$.note_ref_pending_frame_id', ?)
          WHERE note_id = ? AND json_extract(display_overrides_json, '$.note_ref_pending_frame_id') = ?
            AND NOT EXISTS (SELECT 1 FROM canvas_placements cp WHERE cp.id = note_block_placements.id
              AND cp.note_id = note_block_placements.note_id AND cp.user_id = ?)`).run(
          destinationId, noteId, oldCoverId, userId,
        );
      }
    }
    if (nextCoverId) {
      const frame = db.prepare('SELECT frame_id FROM page_frame_extensions WHERE user_id = ? AND note_id = ? AND frame_id = ?')
        .get(userId, noteId, nextCoverId);
      if (!frame) throw new AppError(400, 'Cover page frame not found');
      const residents = db.prepare(`SELECT cp.*, co.kind, cm.target_id AS block_id
        FROM canvas_placements cp JOIN canvas_objects co ON co.id = cp.object_id
        LEFT JOIN content_mounts cm ON cm.object_id = co.id AND cm.target_kind = 'note_block'
        WHERE cp.user_id = ? AND cp.note_id = ? AND cp.frame_id = ? AND co.kind != 'page_frame'`)
        .all(userId, noteId, nextCoverId) as Array<Record<string, any>>;
      for (const row of residents) {
        let metadata: Record<string, any> = {};
        try { metadata = JSON.parse(row.metadata ?? '{}'); } catch { /* Existing empty policy. */ }
        const layout = projectCanvasPlacementLayout(row as any, metadata.layout_policy ?? {});
        assertCoverPlacement(db, userId, noteId, row.kind, layout, row.block_id);
      }
    }
    return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
  })();
}
