import { isDeepStrictEqual } from 'node:util';
import { getDb } from '../db/init.js';
import { recordEvent } from '../db/recordEvent.js';
import { AppError } from '../middleware/errorHandler.js';
import { getBoard, updateBoardMember, unmountBoardMember, updateBoardSticky,
  deleteBoardSticky, deleteBoardEdge, updateBoardVisual } from './boards.js';
import { AGENT_CHAT_RECEIPT_SOURCE_TYPE, readToolFaceReceipt, revertToolFaceReceipt } from './toolFaceReceipts.js';
import { boardActionSnapshot, boardPatchFields, findBoardActionObject, pickBoardFields, type BoardActionKind } from './boardActionSnapshots.js';

export function revertBoardAction({ userId, receiptId }: { userId: string; receiptId: string }) {
  const db = getDb();
  return db.transaction(() => {
    const receipt = readToolFaceReceipt(receiptId, db);
    if (receipt.user_id !== userId) throw new AppError(403, 'Tool face receipt is not owned by user');
    const resource = receipt.metadata.resources[0];
    const context = receipt.metadata.agent_context;
    if (receipt.source_type !== AGENT_CHAT_RECEIPT_SOURCE_TYPE || receipt.status !== 'applied'
      || receipt.metadata.resources.length !== 1 || !context?.batch_id
      || typeof resource?.board_id !== 'string' || typeof resource.id !== 'string'
      || context.board_id !== resource.board_id || resource.batch_id !== context.batch_id
      || !Object.prototype.hasOwnProperty.call(boardPatchFields, String(resource.kind))) {
      throw new AppError(409, 'board_action_receipt_invalid');
    }
    const kind = resource.kind as BoardActionKind;
    const detail = getBoard(db, userId, resource.board_id);
    const current = findBoardActionObject(detail, kind, resource.id);
    if (!current || !isDeepStrictEqual(boardActionSnapshot(kind, current), resource.after)) {
      throw new AppError(409, 'board_action_target_changed');
    }
    if (resource.before === null) {
      // Never cascade away work attached after this creation. Batch reversal
      // removes its own edges first through this same receipt handler.
      if (kind === 'board_member' || kind === 'board_sticky') {
        const endpointKind = kind === 'board_member' ? 'member' : 'sticky';
        if (detail.edges.some(edge => [edge.from, edge.to].some(end => end.kind === endpointKind && end.id === resource.id))) {
          throw new AppError(409, 'board_action_target_has_edges');
        }
      }
      if (kind === 'board_member') unmountBoardMember(db, userId, resource.board_id, resource.id);
      else if (kind === 'board_sticky') deleteBoardSticky(db, userId, resource.board_id, resource.id);
      else if (kind === 'board_edge') deleteBoardEdge(db, userId, resource.board_id, resource.id);
      else throw new AppError(409, 'board_action_receipt_invalid');
    } else {
      if (!resource.before || typeof resource.before !== 'object' || Array.isArray(resource.before)) throw new AppError(409, 'board_action_receipt_invalid');
      const patch = pickBoardFields(resource.before, boardPatchFields[kind]);
      if (kind === 'board_member') updateBoardMember(db, userId, resource.board_id, resource.id, patch);
      else if (kind === 'board_sticky') updateBoardSticky(db, userId, resource.board_id, resource.id, patch);
      else if (kind === 'board_visual') updateBoardVisual(db, userId, resource.board_id, resource.id, patch);
      else throw new AppError(409, 'board_action_receipt_invalid');
    }
    const seq = recordEvent(db, { user_id: userId, actor_kind: 'human', channel: 'ui', verb: 'rolled_back',
      objects: [{ kind, id: resource.id }], summary: `Reverted ${receipt.metadata.tool}`,
      meta: { receipt_id: receipt.id, batch_id: context.batch_id, board_id: resource.board_id, tool: receipt.metadata.tool } });
    return revertToolFaceReceipt(receipt.id, { outcome: 'complete', details: {
      ...(resource.before === null ? { deleted: [resource.id] } : { restored: [resource.id] }),
      failed: [], event_seq: Number(seq),
    } }, db);
  }).immediate();
}
