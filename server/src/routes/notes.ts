import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z, ZodError } from 'zod';
import { splitTrayNote, setTraySplitApplied } from '../services/trayNotes.js';
import { reorderNoteTray } from '../services/trayOrder.js';
import { reorderNoteTraySchema } from '../validators/trayOrder.js';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createNoteBlockSchema,
  createNoteSchema,
  discardClientNoteBlockCreateSchema,
  reorderNoteBlocksSchema,
  updateNoteBlockPlacementSchema,
  updateNoteSchema,
} from '../validators/index.js';
import { mergeRuntimeNoteBlockTemplateMetadata } from '../services/templateDefinitions.js';
import {
  assertSourceProjectionNoteContentWriteAllowed,
  assertSourceProjectionNoteUpdateAllowed,
} from '../services/sourceProjectionPolicy.js';
import {
  createClientNoteBlock,
  discardClientNoteBlockCreate,
} from '../services/noteBlockLifecycle.js';
import {
  getNote,
  listNoteBlocks,
  listNotes,
  restoreNoteAsUser,
  trashNoteAsUser,
} from '../services/notes.js';
import { hydrateBlock, hydrateNote } from '../services/noteHydration.js';
import { assertItemRefBlockContent } from '../services/itemRefBlocks.js';
import { createNoteMetadataRouter } from './noteMetadata.js';
import { mergeNoteSkin } from '../services/skin.js';

export { hydrateNote };

const router = Router();
router.use(createNoteMetadataRouter());
const LEGACY_NOTE_LAYOUT_KEY = 'better_notebook_layout';

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function stripLegacyLayoutOverride(value: Record<string, unknown> | undefined): Record<string, unknown> {
  const next = { ...(value || {}) };
  delete next[LEGACY_NOTE_LAYOUT_KEY];
  return next;
}

export function getOwnedCourse(courseId: string, userId: string): { id: string } {
  const course = getDb()
    .prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string } | undefined;
  if (!course) throw new AppError(404, 'Course not found');
  return course;
}

export function getOwnedNote(
  noteId: string,
  userId: string,
): { id: string; course_id: string; note_class: string; status: string } {
  const note = getDb()
    .prepare('SELECT id, course_id, note_class, status FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as {
      id: string;
      course_id: string;
      note_class: string;
      status: string;
    } | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function createOperationBatch(userId: string, courseId: string, label: string): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO operation_batches (id, user_id, course_id, source_type, label, status, applied_at)
      VALUES (?, ?, ?, 'manual', ?, 'applied', ?)
    `)
    .run(id, userId, courseId, label, now);
  return id;
}

// GET /api/notes?course_id=...
router.get('/', (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;
  const status = req.query.status as string | undefined;
  res.json(listNotes({ userId: req.userId!, courseId, status }));
});

// POST /api/notes
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createNoteSchema.parse(req.body);
    const db = getDb();
    getOwnedCourse(data.course_id, req.userId!);

    const id = uuidv4();
    const now = new Date().toISOString();
    const operationBatchId = createOperationBatch(req.userId!, data.course_id, `Create note: ${data.title}`);

    db.prepare(`
      INSERT INTO notes (
        id, user_id, course_id, title, description, page_format, metadata,
        operation_batch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.userId!,
      data.course_id,
      data.title,
      data.description || null,
      data.page_format,
      stringifyJson(mergeNoteSkin({}, data.metadata, data.skin), {}),
      operationBatchId,
      now,
      now
    );

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json(hydrateNote(note));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/notes/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const noteId = req.params.id as string;
  res.json(getNote({ userId: req.userId!, noteId }));
});

// PUT /api/notes/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    getOwnedNote(noteId, req.userId!);
    const data = updateNoteSchema.parse(req.body);
    assertSourceProjectionNoteUpdateAllowed(getDb(), req.userId!, noteId, data);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.page_format !== undefined) { fields.push('page_format = ?'); values.push(data.page_format); }
    if (data.metadata !== undefined || data.skin !== undefined) {
      const current = getDb().prepare('SELECT metadata FROM notes WHERE id = ? AND user_id = ?')
        .get(noteId, req.userId!) as { metadata: string };
      const metadata = mergeNoteSkin(JSON.parse(current.metadata || '{}'), data.metadata, data.skin);
      fields.push('metadata = ?');
      values.push(stringifyJson(metadata, {}));
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      fields.push('trashed_at = ?');
      values.push(data.status === 'trashed' ? new Date().toISOString() : null);
    }

    if (fields.length === 0) throw new AppError(400, 'No fields to update');

    fields.push('updated_at = ?');
    values.push(new Date().toISOString(), noteId, req.userId!);

    const db = getDb();
    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
    res.json(hydrateNote(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/notes/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const noteId = req.params.id as string;
  const result = trashNoteAsUser({ userId: req.userId!, noteId });
  if (result.outcome === 'missing') throw new AppError(404, 'Note not found');
  if (result.outcome === 'skipped' && result.reason === 'read_only_projection') {
    throw new AppError(409, 'Source projection content is read-only', {
      code: 'source_projection_read_only',
      operation: 'delete_note',
    });
  }
  res.json({ message: 'Note moved to trash' });
});

// POST /api/notes/:id/restore
router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  const noteId = req.params.id as string;
  const result = restoreNoteAsUser({ userId: req.userId!, noteId });
  if (result.outcome === 'missing') throw new AppError(404, 'Note not found');
  res.json({ message: 'Note restored' });
});

// GET /api/notes/:id/blocks
router.get('/:id/blocks', (req: AuthRequest, res: Response) => {
  const noteId = req.params.id as string;
  const requestedStatus = req.query.status;
  const hasMalformedStatusKey = Object.keys(req.query)
    .some((key) => key.startsWith('status['));
  const status = requestedStatus === undefined ? 'active' : requestedStatus;
  if (
    hasMalformedStatusKey
    || typeof status !== 'string'
    || (status !== 'active' && status !== 'trashed')
  ) {
    throw new AppError(400, 'Unsupported note block status');
  }
  res.json(listNoteBlocks({ userId: req.userId!, noteId, status }));
});

// POST /api/notes/:id/blocks
router.post('/:id/blocks', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const note = getOwnedNote(noteId, req.userId!);
    assertSourceProjectionNoteContentWriteAllowed(getDb(), req.userId!, noteId, 'create_note_block');
    const data = createNoteBlockSchema.parse(req.body);
    const db = getDb();
    if (data.client_create_key) {
      const result = createClientNoteBlock(db, req.userId!, noteId, note.course_id, {
        ...data,
        client_create_key: data.client_create_key,
      });
      if (result.status === 'canceled') {
        res.status(409).json({
          status: 'canceled',
          client_create_key: result.client_create_key,
        });
        return;
      }
      res.status(result.created ? 201 : 200).json({
        ...hydrateBlock(result.block),
        client_create_receipt: {
          client_create_key: data.client_create_key,
          status: 'applied',
          reused: !result.created,
        },
      });
      return;
    }
    assertItemRefBlockContent(db, req.userId!, data);
    const id = uuidv4();
    const placementId = uuidv4();
    const now = new Date().toISOString();
    const operationBatchId = createOperationBatch(req.userId!, note.course_id, `Create ${data.block_type} block`);

    const nextOrder = (db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM note_block_placements WHERE note_id = ?'
    ).get(note.id) as { next_order: number }).next_order;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO note_blocks (
          id, user_id, course_id, block_type, title, content_json, plain_text,
          metadata, operation_batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        req.userId!,
        note.course_id,
        data.block_type,
        data.title || null,
        stringifyJson(data.content_json, {}),
        data.plain_text || null,
        stringifyJson(data.block_type === 'item_ref' ? data.metadata : mergeRuntimeNoteBlockTemplateMetadata(db, req.userId!, data.metadata, data.block_type).metadata, {}),
        operationBatchId,
        now,
        now
      );

      db.prepare(`
        INSERT INTO note_block_placements (
          id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(placementId, note.id, id, nextOrder, stringifyJson(stripLegacyLayoutOverride(data.display_overrides_json), {}), now, now);

      for (const ref of data.source_references || []) {
        if (ref.document_id) {
          const document = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ? AND course_id = ?')
            .get(ref.document_id, req.userId!, note.course_id);
          if (!document) throw new AppError(400, 'Source document not found in this course');
        }
        if (ref.document_chunk_id) {
          const chunk = db.prepare(`
            SELECT dc.id
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.id = ? AND d.user_id = ? AND d.course_id = ?
          `).get(ref.document_chunk_id, req.userId!, note.course_id);
          if (!chunk) throw new AppError(400, 'Source document chunk not found in this course');
        }
        db.prepare(`
          INSERT INTO note_block_sources (
            id, block_id, document_id, document_chunk_id, source_page_start,
            source_page_end, source_excerpt, reference_type, confidence, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          id,
          ref.document_id || null,
          ref.document_chunk_id || null,
          ref.source_page_start || null,
          ref.source_page_end || null,
          ref.source_excerpt || null,
          ref.reference_type,
          ref.confidence ?? null,
          stringifyJson(ref.metadata, {})
        );
      }
    })();

    const created = db.prepare(`
      SELECT nbp.id AS placement_id, nbp.order_index, nbp.display_overrides_json, nb.*
      FROM note_block_placements nbp
      JOIN note_blocks nb ON nb.id = nbp.block_id
      WHERE nb.id = ?
    `).get(id) as Record<string, unknown>;

    res.status(201).json(hydrateBlock({ ...created, source_references: stringifyJson(data.source_references || [], []) }));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/notes/:id/block-placements/:placementId
router.put('/:id/block-placements/:placementId', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const placementId = req.params.placementId as string;
    const note = getOwnedNote(noteId, req.userId!);
    const data = updateNoteBlockPlacementSchema.parse(req.body);
    const db = getDb();

    const placement = db.prepare(`
      SELECT nbp.id, nbp.block_id
      FROM note_block_placements nbp
      JOIN note_blocks nb ON nb.id = nbp.block_id
      WHERE nbp.id = ?
        AND nbp.note_id = ?
        AND nb.user_id = ?
        AND nb.status = 'active'
    `).get(placementId, note.id, req.userId!) as { id: string; block_id: string } | undefined;

    if (!placement) throw new AppError(404, 'Note block placement not found');

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE note_block_placements
      SET display_overrides_json = ?, updated_at = ?
      WHERE id = ? AND note_id = ?
    `).run(stringifyJson(stripLegacyLayoutOverride(data.display_overrides_json), {}), now, placementId, note.id);

    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(now, note.id);

    res.json({
      id: placementId,
      block_id: placement.block_id,
      display_overrides_json: stripLegacyLayoutOverride(data.display_overrides_json),
      updated_at: now,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/notes/:id/blocks/discard-client-create
router.post('/:id/blocks/discard-client-create', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const note = getOwnedNote(noteId, req.userId!);
    assertSourceProjectionNoteContentWriteAllowed(
      getDb(),
      req.userId!,
      noteId,
      'discard_client_note_block_create',
    );
    const data = discardClientNoteBlockCreateSchema.parse(req.body);
    res.json(discardClientNoteBlockCreate(
      getDb(),
      req.userId!,
      noteId,
      note.course_id,
      data.client_create_key,
    ));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/notes/:id/blocks/reorder
router.put('/:id/blocks/reorder', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const note = getOwnedNote(noteId, req.userId!);
    assertSourceProjectionNoteContentWriteAllowed(getDb(), req.userId!, noteId, 'reorder_note_blocks');
    const data = reorderNoteBlocksSchema.parse(req.body);
    const db = getDb();
    const now = new Date().toISOString();
    createOperationBatch(req.userId!, note.course_id, 'Reorder note blocks');

    db.transaction(() => {
      const update = db.prepare('UPDATE note_block_placements SET order_index = ?, updated_at = ? WHERE id = ? AND note_id = ?');
      for (const placement of data.placements) {
        const existing = db.prepare('SELECT id FROM note_block_placements WHERE id = ? AND note_id = ?')
          .get(placement.placement_id, note.id);
        if (!existing) throw new AppError(400, 'Placement does not belong to note');
        update.run(placement.order_index, now, placement.placement_id, note.id);
      }
      db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(now, note.id);
    })();

    res.json({ message: 'Blocks reordered' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

router.put('/:id/tray/order', (req: AuthRequest, res: Response) => {
  const data = reorderNoteTraySchema.safeParse(req.body);
  if (!data.success) { res.status(400).json({ error: 'Validation error', details: data.error.errors }); return; }
  res.json(reorderNoteTray(getDb(), req.userId!, req.params.id as string, data.data));
});

router.post('/:id/tray/split', (req: AuthRequest, res: Response) => {
  const data = z.object({
    placement_ids: z.array(z.string().min(1).max(220)).min(1),
    title: z.string().trim().min(1).max(500),
  }).safeParse(req.body);
  if (!data.success) { res.status(400).json({ error: 'Validation error', details: data.error.errors }); return; }
  res.status(201).json(splitTrayNote(getDb(), req.userId!, req.params.id as string, data.data));
});

router.post('/:id/tray/split/:batchId', (req: AuthRequest, res: Response) => {
  const data = z.object({ applied: z.boolean() }).safeParse(req.body);
  if (!data.success) { res.status(400).json({ error: 'Validation error', details: data.error.errors }); return; }
  res.json(setTraySplitApplied(getDb(), req.userId!, req.params.id as string, req.params.batchId as string, data.data.applied));
});

export default router;
