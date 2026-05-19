import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createNoteBlockSchema,
  createNoteSchema,
  reorderNoteBlocksSchema,
  updateNoteSchema,
} from '../validators/index.js';

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

function getOwnedCourse(courseId: string, userId: string): { id: string } {
  const course = getDb()
    .prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string } | undefined;
  if (!course) throw new AppError(404, 'Course not found');
  return course;
}

function getOwnedNote(noteId: string, userId: string): { id: string; course_id: string } {
  const note = getDb()
    .prepare('SELECT id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as { id: string; course_id: string } | undefined;
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

function hydrateNote(row: any) {
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
  };
}

function hydrateBlock(row: any) {
  return {
    ...row,
    content_json: parseJson(row.content_json, {}),
    metadata: parseJson(row.metadata, {}),
    display_overrides_json: parseJson(row.display_overrides_json, {}),
    source_references: parseJson(row.source_references, []),
  };
}

// GET /api/notes?course_id=...
router.get('/', (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;
  if (!courseId) throw new AppError(400, 'course_id query parameter is required');

  const status = (req.query.status as string | undefined) || 'active';
  if (!['active', 'archived', 'trashed'].includes(status)) {
    throw new AppError(400, 'Invalid status');
  }

  getOwnedCourse(courseId, req.userId!);

  const notes = getDb()
    .prepare('SELECT * FROM notes WHERE user_id = ? AND course_id = ? AND status = ? ORDER BY updated_at DESC')
    .all(req.userId!, courseId, status)
    .map(hydrateNote);

  res.json(notes);
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
      stringifyJson(data.metadata, {}),
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
  const note = getDb()
    .prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, req.userId!);
  if (!note) throw new AppError(404, 'Note not found');
  res.json(hydrateNote(note));
});

// PUT /api/notes/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    getOwnedNote(noteId, req.userId!);
    const data = updateNoteSchema.parse(req.body);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.page_format !== undefined) { fields.push('page_format = ?'); values.push(data.page_format); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(stringifyJson(data.metadata, {})); }
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
  getOwnedNote(noteId, req.userId!);
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE notes SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, noteId, req.userId!);
  res.json({ message: 'Note moved to trash' });
});

// GET /api/notes/:id/blocks
router.get('/:id/blocks', (req: AuthRequest, res: Response) => {
  const noteId = req.params.id as string;
  getOwnedNote(noteId, req.userId!);

  const blocks = getDb().prepare(`
    SELECT
      nbp.id AS placement_id,
      nbp.note_id,
      nbp.block_id,
      nbp.parent_placement_id,
      nbp.order_index,
      nbp.display_mode,
      nbp.display_overrides_json,
      nb.id,
      nb.user_id,
      nb.course_id,
      nb.block_type,
      nb.title,
      nb.content_json,
      nb.plain_text,
      nb.status,
      nb.source_kind,
      nb.metadata,
      nb.operation_batch_id,
      nb.created_at,
      nb.updated_at,
      nb.trashed_at,
      COALESCE(
        json_group_array(
          CASE
            WHEN nbs.id IS NULL THEN NULL
            ELSE json_object(
              'id', nbs.id,
              'document_id', nbs.document_id,
              'document_chunk_id', nbs.document_chunk_id,
              'source_page_start', nbs.source_page_start,
              'source_page_end', nbs.source_page_end,
              'source_excerpt', nbs.source_excerpt,
              'reference_type', nbs.reference_type,
              'confidence', nbs.confidence,
              'metadata', nbs.metadata
            )
          END
        ),
        '[]'
      ) AS source_references
    FROM note_block_placements nbp
    JOIN note_blocks nb ON nb.id = nbp.block_id
    LEFT JOIN note_block_sources nbs ON nbs.block_id = nb.id
    WHERE nbp.note_id = ? AND nb.user_id = ? AND nb.status = 'active'
    GROUP BY nbp.id, nb.id
    ORDER BY nbp.order_index ASC
  `).all(noteId, req.userId!);

  res.json(blocks.map((block: any) => {
    const hydrated = hydrateBlock(block);
    hydrated.source_references = hydrated.source_references.filter((ref: unknown) => ref !== null);
    return hydrated;
  }));
});

// POST /api/notes/:id/blocks
router.post('/:id/blocks', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const note = getOwnedNote(noteId, req.userId!);
    const data = createNoteBlockSchema.parse(req.body);
    const db = getDb();
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
        stringifyJson(data.metadata, {}),
        operationBatchId,
        now,
        now
      );

      db.prepare(`
        INSERT INTO note_block_placements (id, note_id, block_id, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(placementId, note.id, id, nextOrder, now, now);

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
      SELECT nbp.id AS placement_id, nbp.order_index, nb.*
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

// PUT /api/notes/:id/blocks/reorder
router.put('/:id/blocks/reorder', (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const note = getOwnedNote(noteId, req.userId!);
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

export default router;
