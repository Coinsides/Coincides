import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { runRecordedAction, type RecordedActionEvent } from '../middleware/recordedAction.js';
import {
  deleteContentGroupMember,
  getContentGroup,
  listContentGroupItemIds,
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

type ContentGroupWriter<T> = (db: ReturnType<typeof getDb>, userId: string) => T;

// A group save replaces its whole roster, so only Items new to a group count as
// cited: saving the same group again must not add to the ledger.
function citedItemEvents(
  before: Map<string, Set<string>>,
  after: Map<string, Set<string>>,
): RecordedActionEvent[] {
  return [...after].flatMap(([groupId, itemIds]) => [...itemIds]
    .filter((itemId) => !before.get(groupId)?.has(itemId))
    .map((itemId) => ({
      verb: 'item_cited' as const,
      objects: [{ kind: 'item', id: itemId }, { kind: 'content_group', id: groupId }],
      summary: 'Added item to content group',
      meta: { via: 'content_group' },
    })));
}

function saveGroupWithCitations<T extends { id: string }>(req: AuthRequest, channel: string, groupId: string | undefined, write: ContentGroupWriter<T>): T {
  return runRecordedAction(getDb(), req, channel, (db, userId) => {
    const before = listContentGroupItemIds(db, userId, groupId ? [groupId] : []);
    const value = write(db, userId);
    return { value, events: citedItemEvents(before, listContentGroupItemIds(db, userId, [value.id])) };
  });
}

function replaceNoteGroupsWithCitations(req: AuthRequest, channel: string, noteId: string, groups: Array<Record<string, any>>) {
  const incomingIds = groups.map((group) => group.id).filter((id): id is string => typeof id === 'string');
  return runRecordedAction(getDb(), req, channel, (db, userId) => {
    const before = listContentGroupItemIds(db, userId, incomingIds);
    const value = replaceNoteContentGroups(db, userId, noteId, groups);
    return { value, events: citedItemEvents(before, listContentGroupItemIds(db, userId, value.map((group) => group.id))) };
  });
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
    res.status(201).json(saveGroupWithCitations(req, 'POST /api/content-groups', data.id,
      (db, userId) => upsertContentGroup(db, userId, data)));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/by-note/:noteId', (req: AuthRequest, res: Response) => {
  try {
    const data = replaceNoteContentGroupsSchema.parse(req.body);
    res.json(replaceNoteGroupsWithCitations(req, 'PUT /api/content-groups/by-note/:noteId', String(req.params.noteId), data.groups));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

// Moves legacy metadata into entity rows when a note is read. Nobody cited anything
// today, so it records nothing; the moved rows become the baseline for later edits.
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
    res.json(saveGroupWithCitations(req, 'PUT /api/content-groups/:id', String(req.params.id),
      (db, userId) => upsertContentGroup(db, userId, data)));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

export default router;
