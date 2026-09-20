import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { noteRefBlockDataSchema } from '../validators/noteRef.js';

export function storedCoverFrameId(db: Database.Database, userId: string, noteId: string): string | null {
  // Some pre-A2 fixtures deliberately have the older notes table.
  if (!(db.pragma('table_info(notes)') as { name: string }[]).some((column) => column.name === 'binding_settings_json')) return null;
  const row = db.prepare('SELECT binding_settings_json FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { binding_settings_json: string | null } | undefined;
  try {
    const settings = JSON.parse(row?.binding_settings_json ?? 'null');
    return settings?.version === 2 && typeof settings.coverPage?.frameId === 'string' ? settings.coverPage.frameId : null;
  } catch { return null; }
}

export function assertNoteRefContent(block: {
  block_type: string; content_json?: unknown; plain_text?: string | null; title?: string | null;
}): void {
  if (block.block_type !== 'note_ref') return;
  noteRefBlockDataSchema.parse(block.content_json);
  if (block.plain_text || block.title) throw new AppError(400, 'Note identity blocks store only a field reference');
}

export function findExistingNoteRefBlock(
  db: Database.Database, userId: string, noteId: string, field: string, excludeId = '',
): Record<string, unknown> | undefined {
  const coverFrameId = storedCoverFrameId(db, userId, noteId);
  if (!coverFrameId) return undefined;
  return db.prepare(`SELECT nb.*, p.id AS placement_id, p.note_id, p.order_index,
    p.parent_placement_id, p.display_mode, p.display_overrides_json
    FROM note_blocks nb JOIN note_block_placements p ON p.block_id = nb.id
    LEFT JOIN canvas_placements cp ON cp.id = p.id AND cp.note_id = p.note_id AND cp.user_id = nb.user_id
    WHERE nb.user_id = ? AND p.note_id = ? AND nb.block_type = 'note_ref' AND nb.status = 'active'
      AND nb.id != ? AND json_extract(nb.content_json, '$.field') = ?
      AND ((cp.id IS NOT NULL AND cp.frame_id = ? AND cp.surface != 'tray')
        OR (cp.id IS NULL AND json_extract(p.display_overrides_json, '$.note_ref_pending_frame_id') = ?))
    ORDER BY p.order_index LIMIT 1`).get(userId, noteId, excludeId, field, coverFrameId, coverFrameId) as Record<string, unknown> | undefined;
}

/** Reserve the cover while the existing create -> canvas-placement workflow is pending. */
export function noteRefCreationOverrides(
  db: Database.Database, userId: string, noteId: string, blockType: string, overrides: Record<string, unknown>,
): Record<string, unknown> {
  return blockType === 'note_ref'
    ? { ...overrides, note_ref_pending_frame_id: storedCoverFrameId(db, userId, noteId) }
    : overrides;
}

export function isBlockOnCover(
  db: Database.Database, userId: string, noteId: string, blockId: string, coverFrameId: string,
): boolean {
  return Boolean(db.prepare(`SELECT 1 FROM note_block_placements p
    LEFT JOIN canvas_placements cp ON cp.id = p.id AND cp.note_id = p.note_id AND cp.user_id = ?
    WHERE p.note_id = ? AND p.block_id = ?
      AND ((cp.id IS NOT NULL AND cp.frame_id = ? AND cp.surface != 'tray')
        OR (cp.id IS NULL AND json_extract(p.display_overrides_json, '$.note_ref_pending_frame_id') = ?))`)
    .get(userId, noteId, blockId, coverFrameId, coverFrameId));
}

export function assertNoteRefCreation(db: Database.Database, userId: string, noteId: string, block: {
  block_type: string; content_json?: unknown; plain_text?: string | null; title?: string | null;
}): Record<string, unknown> | undefined {
  if (block.block_type !== 'note_ref') return undefined;
  assertNoteRefContent(block);
  if (!storedCoverFrameId(db, userId, noteId)) throw new AppError(400, 'Add a cover page before adding its identity blocks');
  return findExistingNoteRefBlock(db, userId, noteId, noteRefBlockDataSchema.parse(block.content_json).field);
}

function dataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') { try { return dataRecord(JSON.parse(value)); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function assertCoverResident(kind: string, blockType?: string, metadata?: unknown, content?: unknown): void {
  const meta = dataRecord(metadata);
  const body = dataRecord(content);
  // Same active presentation classification as the paper renderer. Text-role
  // variants remain text; code/formula templates and Item projections do not.
  const templateKey = [meta.template_key, meta.template_id, meta.legacy_template_id]
    .find((value) => typeof value === 'string' && value.length > 0) as string | undefined ?? '';
  const component = blockType === 'formula' || templateKey.includes('formula') || templateKey.includes('code')
    || (typeof body.language === 'string' && body.language.length > 0);
  const accepted = kind === 'paragraph_block_projection'
    ? Boolean(blockType && blockType !== 'item_ref' && !component)
    : ['image', 'shape', 'freehand'].includes(kind);
  if (!accepted) throw new AppError(400, 'Cover pages accept identity, text, media and decoration blocks only',
    { code: 'cover_resident_not_allowed' });
}

/** Cover-specific presentation invariant; existing authorization remains in its usual services. */
export function assertCoverPlacement(
  db: Database.Database, userId: string, noteId: string, kind: string,
  layout: Record<string, unknown>, blockId?: string,
): void {
  const coverFrameId = storedCoverFrameId(db, userId, noteId);
  if (!coverFrameId || layout.frame_id !== coverFrameId || layout.surface === 'tray') return;
  const block = blockId ? db.prepare('SELECT block_type,metadata,content_json FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as { block_type: string; metadata: string; content_json: string } | undefined : undefined;
  assertCoverResident(kind, block?.block_type, block?.metadata, block?.content_json);
  if (kind === 'paragraph_block_projection' && layout.width_mode !== 'manual') {
    throw new AppError(400, 'Cover blocks use manual placement', { code: 'cover_manual_required' });
  }
  if (block?.block_type === 'note_ref' && findExistingNoteRefBlock(
    db, userId, noteId, String(dataRecord(block.content_json).field), blockId,
  )) throw new AppError(400, 'This cover already has that identity projection');
}

export function assertCoverCollection(db: Database.Database, userId: string, noteId: string, collection: Record<string, unknown>): void {
  const coverId = storedCoverFrameId(db, userId, noteId);
  if (!coverId) return;
  const frames = Array.isArray(collection.pageFrames) ? collection.pageFrames as Record<string, unknown>[] : [];
  if (frames[0]?.id !== coverId || frames.length < 2 || collection.primaryFrameId === coverId) {
    throw new AppError(400, 'The cover remains before the primary content page; remove it through binding settings');
  }
  const stacks = Array.isArray(collection.pageStacks) ? collection.pageStacks as Record<string, unknown>[] : [];
  if (stacks.some((stack) => Array.isArray(stack.frameIds) && stack.frameIds.includes(coverId) && stack.frameIds.length !== 1)) {
    throw new AppError(400, 'The cover must stay outside content flow stacks');
  }
}
