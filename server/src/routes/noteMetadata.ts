import { Router } from 'express';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getNoteMetadata, requireMetadataNote } from '../services/noteMetadata.js';

const addTagSchema = z.object({ label: z.string().trim().min(1).max(48) }).strict();

/** Human note subresources, deliberately separate from the tool registry. */
export function createNoteMetadataRouter(dbProvider: () => Database.Database = getDb) {
  const router = Router();
  router.get('/:id/tags', (req: AuthRequest, res) => {
    const db = dbProvider();
    requireMetadataNote(db, req.userId!, req.params.id as string);
    const tags = db.prepare('SELECT * FROM note_tags WHERE note_id = ? AND user_id = ? ORDER BY created_at, id')
      .all(req.params.id, req.userId);
    res.json({ tags });
  });
  router.post('/:id/tags', (req: AuthRequest, res) => {
    const db = dbProvider();
    const noteId = req.params.id as string;
    requireMetadataNote(db, req.userId!, noteId);
    const parsed = addTagSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
      return;
    }
    const tag = { id: uuidv4(), note_id: noteId, user_id: req.userId!, label: parsed.data.label,
      actor: 'user', created_at: new Date().toISOString() };
    const result = db.prepare(`INSERT INTO note_tags (id, note_id, user_id, label, actor, created_at)
      VALUES (@id, @note_id, @user_id, @label, @actor, @created_at)
      ON CONFLICT(note_id, label) DO NOTHING`).run(tag);
    if (!result.changes) throw new AppError(409, 'Tag already exists');
    res.status(201).json({ tag });
  });
  router.delete('/:id/tags/:tagId', (req: AuthRequest, res) => {
    const db = dbProvider();
    requireMetadataNote(db, req.userId!, req.params.id as string);
    const result = db.prepare('DELETE FROM note_tags WHERE id = ? AND note_id = ? AND user_id = ?')
      .run(req.params.tagId, req.params.id, req.userId);
    if (!result.changes) throw new AppError(404, 'Tag not found');
    res.json({ message: 'Tag deleted' });
  });
  router.get('/:id/metadata', (req: AuthRequest, res) => {
    res.json(getNoteMetadata(dbProvider(), req.userId!, req.params.id as string));
  });
  return router;
}
