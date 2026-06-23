import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  deleteContentGroupMember,
  getContentGroup,
  listContentGroups,
  replaceNoteContentGroups,
  upsertContentGroup,
} from '../services/contentGroups.js';
import {
  setPrimaryContentGroupFolderPlacement,
} from '../services/groupFolders.js';
import {
  importNoteMetadataContentGroupsSchema,
  replaceNoteContentGroupsSchema,
  updateContentGroupFolderPlacementSchema,
  upsertContentGroupSchema,
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
  res.json(listContentGroups(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    note_id: typeof req.query.note_id === 'string' ? req.query.note_id : undefined,
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = upsertContentGroupSchema.parse(req.body);
    res.status(201).json(upsertContentGroup(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/by-note/:noteId', (req: AuthRequest, res: Response) => {
  try {
    const data = replaceNoteContentGroupsSchema.parse(req.body);
    res.json(replaceNoteContentGroups(getDb(), req.userId!, String(req.params.noteId), data.groups));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/import-note-metadata', (req: AuthRequest, res: Response) => {
  try {
    const data = importNoteMetadataContentGroupsSchema.parse(req.body);
    res.json(replaceNoteContentGroups(getDb(), req.userId!, data.note_id, data.groups));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/:id/folder-placement', (req: AuthRequest, res: Response) => {
  try {
    const data = updateContentGroupFolderPlacementSchema.parse(req.body);
    if (data.placement_role && data.placement_role !== 'primary') {
      throw new AppError(400, 'Only primary folder placement is supported in this version');
    }
    setPrimaryContentGroupFolderPlacement(getDb(), req.userId!, String(req.params.id), {
      folder_id: data.folder_id,
      order_index: data.order_index,
      added_by: data.added_by,
      metadata: data.metadata,
    });
    res.json(getContentGroup(getDb(), req.userId!, String(req.params.id)));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.delete('/:id/members/:memberId', (req: AuthRequest, res: Response) => {
  res.json(deleteContentGroupMember(
    getDb(),
    req.userId!,
    String(req.params.id),
    String(req.params.memberId),
  ));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getContentGroup(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = upsertContentGroupSchema.parse({ ...req.body, id: req.params.id });
    res.json(upsertContentGroup(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

export default router;
