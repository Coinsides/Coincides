import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateNoteBlockSchema } from '../validators/index.js';
import { mergeRuntimeNoteBlockTemplateMetadata } from '../services/templateDefinitions.js';
import {
  assertNoteBlockStatusChangeAllowed,
  restoreNoteBlockForCanvasLifecycle,
} from '../services/canvasObjects.js';
import { assertSourceProjectionBlockContentWriteAllowed } from '../services/sourceProjectionPolicy.js';
import { assertItemRefBlockContent } from '../services/itemRefBlocks.js';

const router = Router();

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getOwnedBlock(blockId: string, userId: string): { id: string; course_id: string; block_type: string; content_json: string; plain_text: string | null; metadata: string; source_kind: string } {
  const block = getDb()
    .prepare('SELECT id, course_id, block_type, content_json, plain_text, metadata, source_kind FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as { id: string; course_id: string; block_type: string; content_json: string; plain_text: string | null; metadata: string; source_kind: string } | undefined;
  if (!block) throw new AppError(404, 'Note block not found');
  return block;
}

function hydrateBlock(row: any) {
  return {
    ...row,
    content_json: parseJson(row.content_json, {}),
    metadata: parseJson(row.metadata, {}),
  };
}

function hasTemplateReference(metadata: Record<string, unknown> | undefined): boolean {
  return Boolean(metadata && (
    typeof metadata.template_definition_id === 'string'
    || typeof metadata.template_key === 'string'
    || typeof metadata.template_id === 'string'
  ));
}

// PUT /api/note-blocks/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const blockId = req.params.id as string;
    const currentBlock = getOwnedBlock(blockId, req.userId!);
    assertSourceProjectionBlockContentWriteAllowed(getDb(), req.userId!, blockId, 'update_note_block');
    const data = updateNoteBlockSchema.parse(req.body);
    if (data.block_type !== undefined || data.content_json !== undefined || data.plain_text !== undefined) {
      assertItemRefBlockContent(getDb(), req.userId!, {
        block_type: data.block_type ?? currentBlock.block_type,
        content_json: data.content_json ?? parseJson(currentBlock.content_json, {}),
        plain_text: data.plain_text === undefined ? currentBlock.plain_text : data.plain_text,
      });
    }
    if (data.status && data.status !== 'active') {
      assertNoteBlockStatusChangeAllowed(getDb(), req.userId!, blockId, data.status);
    }
    if (
      data.status === 'active'
      && data.block_type === undefined
      && data.title === undefined
      && data.content_json === undefined
      && data.plain_text === undefined
      && data.metadata === undefined
    ) {
      restoreNoteBlockForCanvasLifecycle(getDb(), req.userId!, blockId);
      const restored = getDb().prepare('SELECT * FROM note_blocks WHERE id = ? AND user_id = ?').get(blockId, req.userId!);
      res.json(hydrateBlock(restored));
      return;
    }
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.block_type !== undefined) { fields.push('block_type = ?'); values.push(data.block_type); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content_json !== undefined) { fields.push('content_json = ?'); values.push(stringifyJson(data.content_json, {})); }
    if (data.plain_text !== undefined) { fields.push('plain_text = ?'); values.push(data.plain_text); }
    if (data.metadata !== undefined || data.block_type !== undefined) {
      const currentMetadata = parseJson<Record<string, unknown>>(currentBlock.metadata, {});
      const mergedMetadata = {
        ...currentMetadata,
        ...(data.metadata || {}),
      };
      fields.push('metadata = ?');
      values.push(stringifyJson(
        (data.block_type ?? currentBlock.block_type) === 'item_ref' ? mergedMetadata : mergeRuntimeNoteBlockTemplateMetadata(
          getDb(),
          req.userId!,
          mergedMetadata,
          data.block_type || currentBlock.block_type,
          { allowUnknownTemplateFallback: !hasTemplateReference(data.metadata) },
        ).metadata,
        {},
      ));
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      fields.push('trashed_at = ?');
      values.push(data.status === 'trashed' ? new Date().toISOString() : null);
    }

    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now, blockId, req.userId!);

    const db = getDb();
    db.prepare(`UPDATE note_blocks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId);
    res.json(hydrateBlock(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/note-blocks/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const blockId = req.params.id as string;
  getOwnedBlock(blockId, req.userId!);
  assertSourceProjectionBlockContentWriteAllowed(getDb(), req.userId!, blockId, 'delete_note_block');
  assertNoteBlockStatusChangeAllowed(getDb(), req.userId!, blockId, 'trashed');
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE note_blocks SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, blockId, req.userId!);
  res.json({ message: 'Note block moved to trash' });
});

export default router;
