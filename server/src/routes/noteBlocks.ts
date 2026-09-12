import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertNoteBlockStatusChangeAllowed } from '../services/canvasObjects.js';
import { assertSourceProjectionBlockContentWriteAllowed } from '../services/sourceProjectionPolicy.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { saveAtomicText } from '../services/atomicTextSave.js';
import { saveAtomicTextUnitTransfer } from '../services/atomicTextUnitTransfer.js';

const router = Router();

function getOwnedBlock(blockId: string, userId: string): { id: string; course_id: string; block_type: string; content_json: string; plain_text: string | null; metadata: string; source_kind: string } {
  const block = getDb()
    .prepare('SELECT id, course_id, block_type, content_json, plain_text, metadata, source_kind FROM note_blocks WHERE id = ? AND user_id = ?')
    .get(blockId, userId) as { id: string; course_id: string; block_type: string; content_json: string; plain_text: string | null; metadata: string; source_kind: string } | undefined;
  if (!block) throw new AppError(404, 'Note block not found');
  return block;
}

// PUT /api/note-blocks/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    res.json(updateNoteBlockContent(getDb(), req.userId!, String(req.params.id), req.body));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// One transaction owns body, annotation range edits and board text references.
router.put('/:id/text-save', (req: AuthRequest, res: Response) => {
  try {
    res.json(saveAtomicText(getDb(), req.userId!, String(req.params.id), req.body));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// B10 keeps two block bodies and the moved unit's anchor ownership in one transaction.
router.put('/:id/unit-transfer', (req: AuthRequest, res: Response) => {
  try {
    res.json(saveAtomicTextUnitTransfer(getDb(), req.userId!, String(req.params.id), req.body));
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
  const block = getOwnedBlock(blockId, req.userId!);
  assertSourceProjectionBlockContentWriteAllowed(getDb(), req.userId!, blockId, 'delete_note_block');
  assertNoteBlockStatusChangeAllowed(getDb(), req.userId!, blockId, 'trashed');
  if (block.block_type === 'media') {
    updateNoteBlockContent(getDb(), req.userId!, blockId, { status: 'trashed' });
  } else {
    const now = new Date().toISOString();
    getDb()
      .prepare("UPDATE note_blocks SET status = 'trashed', trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(now, now, blockId, req.userId!);
  }
  res.json({ message: 'Note block moved to trash' });
});

export default router;
