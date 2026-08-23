import { Router, type Response } from 'express';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { trashNoteAsUser } from '../services/notes.js';
import { revertTrashNotesReceipt } from '../services/toolFaceReceiptRevert.js';
import {
  dismissToolFaceReceipt,
  listToolFaceReceipts,
  markToolFaceReceiptApplied,
  readToolFaceReceipt,
  type ToolFaceReceipt,
  type ToolFaceReceiptResource,
} from '../services/toolFaceReceipts.js';
import { trashNotesInputSchema } from '../toolFace/registry.js';

export interface ToolReceiptsRouterOptions {
  trashNoteExecutor?: typeof trashNoteAsUser;
  revertReceipt?: typeof revertTrashNotesReceipt;
}

function assertOwnedProposedTrashReceipt(
  receipt: ToolFaceReceipt,
  userId: string,
): void {
  if (receipt.user_id !== userId) {
    throw new AppError(403, 'Tool face receipt is not owned by user');
  }
  if (receipt.metadata.tool !== 'trash_notes') {
    throw new AppError(409, 'Tool face receipt is not for trash_notes');
  }
  if (receipt.status !== 'proposed') {
    throw new AppError(409, 'Only a proposed trash_notes receipt can be applied');
  }
}

function intendedInputSummary(receipt: ToolFaceReceipt): string {
  const noteIds = receipt.metadata.intended_input?.note_ids;
  if (Array.isArray(noteIds)) {
    return `${noteIds.length} note${noteIds.length === 1 ? '' : 's'}`;
  }
  return 'Stored tool input';
}

function queueItem(receipt: ToolFaceReceipt) {
  return {
    id: receipt.id,
    tool: receipt.metadata.tool,
    tier: receipt.metadata.tier,
    resources: receipt.metadata.resources,
    intended_input_summary: intendedInputSummary(receipt),
    created_at: receipt.created_at,
  };
}

function applyTrashNotesReceipt(
  userId: string,
  receiptId: string,
  trashNoteExecutor: typeof trashNoteAsUser,
) {
  const apply = getDb().transaction(() => {
    const receipt = readToolFaceReceipt(receiptId);
    assertOwnedProposedTrashReceipt(receipt, userId);

    const parsedInput = trashNotesInputSchema.safeParse(receipt.metadata.intended_input);
    if (!parsedInput.success) {
      throw new AppError(409, 'Tool face receipt intended_input is invalid');
    }

    const results = parsedInput.data.note_ids.map((noteId) => ({
      note_id: noteId,
      ...trashNoteExecutor({ userId, noteId }),
    }));
    const resources: ToolFaceReceiptResource[] = results.map(({ note_id: noteId, ...result }) => ({
      kind: 'note',
      id: noteId,
      ...result,
    }));

    return {
      receipt: markToolFaceReceiptApplied(receipt.id, { resources }),
      results,
    };
  });

  return apply.immediate();
}

export function createToolReceiptsRouter(
  options: ToolReceiptsRouterOptions = {},
) {
  const router = Router();
  const trashNoteExecutor = options.trashNoteExecutor ?? trashNoteAsUser;
  const revertReceipt = options.revertReceipt ?? revertTrashNotesReceipt;

  router.get('/', (req: AuthRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'proposed';
    if (status !== 'proposed') {
      throw new AppError(400, 'Only proposed tool face receipts can be listed');
    }
    const receipts = listToolFaceReceipts({ userId: req.userId!, status: 'proposed' });
    res.json({ receipts: receipts.map(queueItem) });
  });

  router.post('/:id/apply', (req: AuthRequest, res: Response) => {
    res.json(applyTrashNotesReceipt(
      req.userId!,
      String(req.params.id),
      trashNoteExecutor,
    ));
  });

  router.post('/:id/dismiss', (req: AuthRequest, res: Response) => {
    res.json(dismissToolFaceReceipt({
      userId: req.userId!,
      receiptId: String(req.params.id),
    }));
  });

  router.post('/:id/revert', (req: AuthRequest, res: Response) => {
    res.json(revertReceipt({
      userId: req.userId!,
      receiptId: String(req.params.id),
    }));
  });

  return router;
}

export default createToolReceiptsRouter();
