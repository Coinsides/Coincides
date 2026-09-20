import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { getBoard } from './boards.js';
import { BOARD_ACTION_TOOLS } from '../toolFace/boardActions.js';
import { listToolFaceReceipts, type ToolFaceReceipt } from './toolFaceReceipts.js';
import { revertToolReceipt } from './toolFaceReceiptRevert.js';

function boardReceipts(userId: string): ToolFaceReceipt[] {
  return ['applied', 'reverted'].flatMap(status => listToolFaceReceipts({ userId, status: status as 'applied' | 'reverted' })).filter(receipt =>
    receipt.source_type === 'agent_chat' && receipt.metadata.agent_context?.batch_id
    && BOARD_ACTION_TOOLS.some(tool => tool.name === receipt.metadata.tool))
    .sort((a, b) => b.metadata.agent_context!.event_seq - a.metadata.agent_context!.event_seq);
}
export function latestBoardAgentBatch(userId: string, boardId: string) {
  getBoard(getDb(), userId, boardId);
  const receipts = boardReceipts(userId);
  const batchId = receipts.find(receipt => receipt.metadata.agent_context?.board_id === boardId)?.metadata.agent_context?.batch_id;
  if (!batchId) return null;
  const batch = receipts.filter(receipt => receipt.metadata.agent_context!.batch_id === batchId);
  return { batch_id: batchId, receipt_count: batch.filter(receipt => receipt.status === 'applied').length,
    board_ids: [...new Set(batch.map(receipt => receipt.metadata.agent_context!.board_id!))] };
}

/** A conversation is one batch across boards and turns. No second batch store. */
export function revertBoardAgentBatch(userId: string, boardId: string, batchId: string) {
  const db = getDb();
  return db.transaction(() => {
    getBoard(db, userId, boardId);
    const receipts = boardReceipts(userId).filter(receipt => receipt.status === 'applied' && receipt.metadata.agent_context!.batch_id === batchId);
    if (!receipts.some(receipt => receipt.metadata.agent_context!.board_id === boardId)) {
      throw new AppError(409, 'board_agent_batch_not_applied');
    }
    // Already-reverted individual receipts are absent. Failure of any inverse
    // rolls back the whole batch, including its events and receipt statuses.
    const reverted = receipts.map(receipt => revertToolReceipt({ userId, receiptId: receipt.id }));
    return { batch_id: batchId, receipt_ids: reverted.map(receipt => receipt.id), status: 'reverted' as const };
  }).immediate();
}
