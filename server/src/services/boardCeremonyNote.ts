import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { createCourseSchema, createNoteSchema, notePagePresetSchema, savePageFrameCollectionSchema } from '../validators/index.js';
import { savePageFrameCollection } from './canvasObjects.js';
import { hydrateNote } from './noteHydration.js';

const ceremonyFields = {
  title: createNoteSchema.shape.title.trim().min(1),
  page_format: notePagePresetSchema.optional(),
  collection: savePageFrameCollectionSchema.shape.collection.refine(
    (collection) => Array.isArray(collection.pageFrames) && collection.pageFrames.length > 0,
    'An initial page frame is required',
  ),
};
const ceremonyNoteSchema = z.union([
  z.object({ ...ceremonyFields, project_id: createNoteSchema.shape.course_id }).strict(),
  z.object({ ...ceremonyFields, project: z.object({
    name: createCourseSchema.shape.name.trim().min(1),
  }).strict() }).strict(),
]);

/** The board ceremony owns the outer transaction; frame persistence uses a nested savepoint. */
export function createBoardCeremonyNote(db: Database.Database, userId: string, boardId: string, value: unknown) {
  const input = ceremonyNoteSchema.parse(value);
  return db.transaction(() => {
    if (!db.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId)) {
      throw new AppError(404, 'Board not found');
    }
    const now = new Date().toISOString();
    const projectId = 'project_id' in input ? input.project_id : uuidv4();
    if ('project' in input) {
      // Keep the name-only Project defaults of POST /courses.
      db.prepare(`INSERT INTO courses (id, user_id, name, color, weight, created_at, updated_at)
        VALUES (?, ?, ?, '#6366f1', 2, ?, ?)`).run(projectId, userId, input.project.name, now, now);
    }
    const project = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) throw new AppError(404, 'Course not found');

    const noteId = uuidv4();
    const operationBatchId = uuidv4();
    // Preserve the existing note creation receipt, without adding an event verb.
    db.prepare(`INSERT INTO operation_batches (id, user_id, course_id, source_type, label, status, applied_at)
      VALUES (?, ?, ?, 'manual', ?, 'applied', ?)`)
      .run(operationBatchId, userId, projectId, `Create note: ${input.title}`, now);
    db.prepare(`INSERT INTO notes (
      id, user_id, course_id, title, page_format, metadata, operation_batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?)`)
      .run(noteId, userId, projectId, input.title, input.page_format ?? 'flow', operationBatchId, now, now);
    const collection = savePageFrameCollection(db, userId, noteId, input.collection);
    if (!collection?.pageFrames.length) throw new AppError(400, 'An initial page frame is required');
    const note = hydrateNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId));
    return { project, note, collection };
  })();
}
