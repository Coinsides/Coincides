import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createProjectionSchema } from '../validators/index.js';

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

function hydrateProjection(row: any) {
  return {
    ...row,
    snapshot_json: parseJson(row.snapshot_json, {}),
    source_refs_json: parseJson(row.source_refs_json, []),
    source_versions_json: parseJson(row.source_versions_json, {}),
    metadata: parseJson(row.metadata, {}),
  };
}

function getOwnedCourse(courseId: string, userId: string): void {
  const course = getDb()
    .prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
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

function buildSnapshotFromNote(noteId: string, userId: string, courseId: string) {
  const db = getDb();
  const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ? AND course_id = ?')
    .get(noteId, userId, courseId);
  if (!note) throw new AppError(404, 'Source note not found');

  const blocks = db.prepare(`
    SELECT nb.id, nb.block_type, nb.title, nb.content_json, nb.plain_text, nb.updated_at, nbp.order_index
    FROM note_block_placements nbp
    JOIN note_blocks nb ON nb.id = nbp.block_id
    WHERE nbp.note_id = ? AND nb.user_id = ? AND nb.status = 'active'
    ORDER BY nbp.order_index ASC
  `).all(noteId, userId) as any[];

  return {
    snapshot: {
      source_note_id: noteId,
      blocks: blocks.map((block) => ({
        id: block.id,
        block_type: block.block_type,
        title: block.title,
        content_json: parseJson(block.content_json, {}),
        plain_text: block.plain_text,
        order_index: block.order_index,
      })),
    },
    versions: Object.fromEntries(blocks.map((block) => [block.id, block.updated_at])),
  };
}

// GET /api/projections?course_id=...&type=organized_note
router.get('/', (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;
  if (!courseId) throw new AppError(400, 'course_id query parameter is required');

  getOwnedCourse(courseId, req.userId!);

  const type = req.query.type as string | undefined;
  const params: unknown[] = [req.userId!, courseId, 'active'];
  let sql = 'SELECT * FROM projections WHERE user_id = ? AND course_id = ? AND status = ?';
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY updated_at DESC';

  const projections = getDb().prepare(sql).all(...params).map(hydrateProjection);
  res.json(projections);
});

// POST /api/projections
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createProjectionSchema.parse(req.body);
    getOwnedCourse(data.course_id, req.userId!);

    const built = data.source_note_id
      ? buildSnapshotFromNote(data.source_note_id, req.userId!, data.course_id)
      : { snapshot: data.snapshot_json || {}, versions: data.source_versions_json || {} };

    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const operationBatchId = createOperationBatch(req.userId!, data.course_id, `Create projection: ${data.title}`);

    db.prepare(`
      INSERT INTO projections (
        id, user_id, course_id, type, title, snapshot_json, source_refs_json,
        source_versions_json, operation_batch_id, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.userId!,
      data.course_id,
      data.type,
      data.title,
      stringifyJson(data.snapshot_json || built.snapshot, {}),
      stringifyJson(data.source_refs_json, []),
      stringifyJson(data.source_versions_json || built.versions, {}),
      operationBatchId,
      stringifyJson(data.metadata, {}),
      now,
      now
    );

    const projection = db.prepare('SELECT * FROM projections WHERE id = ?').get(id);
    res.status(201).json(hydrateProjection(projection));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/projections/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const projection = getDb()
    .prepare('SELECT * FROM projections WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!);
  if (!projection) throw new AppError(404, 'Projection not found');
  res.json(hydrateProjection(projection));
});

export default router;
