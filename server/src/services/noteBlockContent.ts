import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { updateNoteBlockSchema } from '../validators/index.js';
import { mergeRuntimeNoteBlockTemplateMetadata } from './templateDefinitions.js';
import { assertNoteBlockStatusChangeAllowed, restoreNoteBlockForCanvasLifecycle } from './canvasObjects.js';
import { assertSourceProjectionBlockContentWriteAllowed } from './sourceProjectionPolicy.js';
import { assertItemRefBlockContent } from './itemRefBlocks.js';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function hydrateSavedBlock(row: any) {
  return { ...row, content_json: parseJson(row.content_json, {}), metadata: parseJson(row.metadata, {}) };
}

/** Shared by the legacy PUT and the caller-owned text-save transaction. */
export function updateNoteBlockContent(
  db: Database.Database, userId: string, blockId: string, value: unknown, baseRevision?: number,
) {
  const currentBlock = db.prepare('SELECT * FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as any;
  if (!currentBlock) throw new AppError(404, 'Note block not found');
  assertSourceProjectionBlockContentWriteAllowed(db, userId, blockId, 'update_note_block');
  const data = updateNoteBlockSchema.parse(value);
  if (data.block_type !== undefined || data.content_json !== undefined || data.plain_text !== undefined) {
    assertItemRefBlockContent(db, userId, {
      block_type: data.block_type ?? currentBlock.block_type,
      content_json: data.content_json ?? parseJson(currentBlock.content_json, {}),
      plain_text: data.plain_text === undefined ? currentBlock.plain_text : data.plain_text,
    });
  }
  if (data.status && data.status !== 'active') {
    assertNoteBlockStatusChangeAllowed(db, userId, blockId, data.status);
  }
  if (data.status === 'active' && data.block_type === undefined && data.title === undefined
    && data.content_json === undefined && data.plain_text === undefined && data.metadata === undefined) {
    restoreNoteBlockForCanvasLifecycle(db, userId, blockId);
    return hydrateSavedBlock(db.prepare('SELECT * FROM note_blocks WHERE id = ? AND user_id = ?').get(blockId, userId));
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.block_type !== undefined) { fields.push('block_type = ?'); values.push(data.block_type); }
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content_json !== undefined) { fields.push('content_json = ?'); values.push(JSON.stringify(data.content_json ?? {})); }
  if (data.plain_text !== undefined) { fields.push('plain_text = ?'); values.push(data.plain_text); }
  if (data.metadata !== undefined || data.block_type !== undefined) {
    const mergedMetadata = { ...parseJson<Record<string, unknown>>(currentBlock.metadata, {}), ...(data.metadata || {}) };
    const hasTemplateReference = data.metadata && (typeof data.metadata.template_definition_id === 'string'
      || typeof data.metadata.template_key === 'string' || typeof data.metadata.template_id === 'string');
    fields.push('metadata = ?');
    values.push(JSON.stringify((data.block_type ?? currentBlock.block_type) === 'item_ref' ? mergedMetadata
      : mergeRuntimeNoteBlockTemplateMetadata(db, userId, mergedMetadata, data.block_type || currentBlock.block_type,
        { allowUnknownTemplateFallback: !hasTemplateReference }).metadata));
  }
  if (data.status !== undefined) {
    fields.push('status = ?', 'trashed_at = ?');
    values.push(data.status, data.status === 'trashed' ? new Date().toISOString() : null);
  }
  if (fields.length === 0) throw new AppError(400, 'No fields to update');
  fields.push('updated_at = ?', 'text_save_revision = text_save_revision + 1');
  values.push(new Date().toISOString(), blockId, userId);
  if (baseRevision !== undefined) values.push(baseRevision);
  const result = db.prepare(`UPDATE note_blocks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?
    ${baseRevision === undefined ? '' : 'AND text_save_revision = ?'}`).run(...values);
  if (baseRevision !== undefined && result.changes !== 1) {
    const current = db.prepare('SELECT text_save_revision FROM note_blocks WHERE id = ? AND user_id = ?')
      .get(blockId, userId) as { text_save_revision: number };
    throw new AppError(409, 'stale_revision', { code: 'stale_revision', current_revision: current.text_save_revision });
  }
  return hydrateSavedBlock(db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId));
}
