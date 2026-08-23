import { AppError } from '../middleware/errorHandler.js';
import { restoreNoteAsUser } from './notes.js';
import {
  readToolFaceReceipt,
  revertToolFaceReceipt,
  type ToolFaceReceipt,
  type ToolFaceReceiptResource,
} from './toolFaceReceipts.js';

interface RevertTrashNotesReceiptInput {
  userId: string;
  receiptId: string;
}

function trashedNoteResourceId(resource: ToolFaceReceiptResource): string | null {
  return resource.kind === 'note'
    && resource.outcome === 'trashed'
    && typeof resource.id === 'string'
    ? resource.id
    : null;
}

export function revertTrashNotesReceipt({
  userId,
  receiptId,
}: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(receiptId);
  if (receipt.user_id !== userId) {
    throw new AppError(403, 'Tool face receipt is not owned by user');
  }
  if (receipt.metadata.tool !== 'trash_notes') {
    throw new AppError(409, 'Tool face receipt is not for trash_notes');
  }
  if (receipt.status !== 'applied') {
    throw new AppError(409, 'Only an applied trash_notes receipt can be reverted');
  }

  const restored: string[] = [];
  const failed: string[] = [];
  for (const resource of receipt.metadata.resources) {
    const noteId = trashedNoteResourceId(resource);
    if (!noteId) continue;

    const result = restoreNoteAsUser({ userId, noteId });
    if (
      result.outcome === 'restored'
      || (result.outcome === 'skipped' && result.reason === 'already_active')
    ) {
      restored.push(noteId);
    } else {
      failed.push(noteId);
    }
  }

  return revertToolFaceReceipt(receipt.id, {
    outcome: failed.length === 0 ? 'complete' : 'partial',
    details: { restored, failed },
  });
}
