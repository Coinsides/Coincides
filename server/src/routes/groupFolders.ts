import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveOrDeleteGroupFolder,
  getGroupFolder,
  importNoteGroupFolders,
  listGroupFolders,
  replaceNoteGroupFolders,
  upsertGroupFolder,
} from '../services/groupFolders.js';
import {
  importNoteGroupFoldersSchema,
  replaceNoteGroupFoldersSchema,
  upsertGroupFolderSchema,
} from '../validators/index.js';

const router = Router();

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listGroupFolders(getDb(), req.userId!, {
    course_id: typeof req.query.course_id === 'string' ? req.query.course_id : undefined,
    note_id: typeof req.query.note_id === 'string' ? req.query.note_id : undefined,
    scope_kind: typeof req.query.scope_kind === 'string' ? req.query.scope_kind as any : undefined,
    include_archived: req.query.include_archived === 'true',
  }));
});

router.put('/by-note/:noteId', (req: AuthRequest, res: Response) => {
  try {
    const payload = replaceNoteGroupFoldersSchema.parse(req.body);
    res.json(replaceNoteGroupFolders(getDb(), req.userId!, String(req.params.noteId), payload.folders));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/import-note-metadata', (req: AuthRequest, res: Response) => {
  try {
    const payload = importNoteGroupFoldersSchema.parse(req.body);
    res.status(201).json(importNoteGroupFolders(getDb(), req.userId!, payload.note_id, payload.folders));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getGroupFolder(getDb(), req.userId!, String(req.params.id)));
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const payload = upsertGroupFolderSchema.parse(req.body);
    res.status(201).json(upsertGroupFolder(getDb(), req.userId!, payload));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const payload = upsertGroupFolderSchema.parse({ ...req.body, id: req.params.id });
    res.json(upsertGroupFolder(getDb(), req.userId!, payload));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  res.json(archiveOrDeleteGroupFolder(getDb(), req.userId!, String(req.params.id)));
});

export default router;
