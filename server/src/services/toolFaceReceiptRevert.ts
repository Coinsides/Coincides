import { AppError } from '../middleware/errorHandler.js';
import { createHash } from 'node:crypto';
import { getDb } from '../db/init.js';
import { recordEvent } from '../db/recordEvent.js';
import { restoreNoteAsUser } from './notes.js';
import {
  AGENT_CHAT_RECEIPT_SOURCE_TYPE,
  readToolFaceReceipt,
  revertToolFaceReceipt,
  type ToolFaceReceipt,
  type ToolFaceReceiptResource,
} from './toolFaceReceipts.js';

export function goalReceiptHash(goal: object): string {
  return createHash('sha256').update(JSON.stringify(Object.entries(goal).sort(([a], [b]) => a.localeCompare(b)))).digest('hex');
}

function revertCreatedGoalReceipt({ userId, receiptId }: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const db = getDb();
  return db.transaction(() => {
    const receipt = readToolFaceReceipt(receiptId, db);
    if (receipt.user_id !== userId) throw new AppError(403, 'Tool face receipt is not owned by user');
    if (receipt.source_type !== AGENT_CHAT_RECEIPT_SOURCE_TYPE || receipt.metadata.tool !== 'create_goal') {
      throw new AppError(409, 'Tool face receipt is not for agent create_goal');
    }
    if (receipt.status !== 'applied') throw new AppError(409, 'Only an applied create_goal receipt can be reverted');
    const [resource] = receipt.metadata.resources;
    if (receipt.metadata.resources.length !== 1 || resource?.kind !== 'goal'
      || resource.outcome !== 'created' || typeof resource.id !== 'string') {
      throw new AppError(409, 'Goal receipt resources are invalid');
    }
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(resource.id, userId) as object | undefined;
    if (!goal || goalReceiptHash(goal) !== resource.state_hash) {
      throw new AppError(409, 'Created goal changed or is missing; cannot revert creation');
    }
    // Undo removes exactly the created row, never subsequent work attached to it.
    const referenced = db.prepare(`
      SELECT 1 FROM goals WHERE parent_id = ?
      UNION ALL SELECT 1 FROM tasks WHERE goal_id = ?
      UNION ALL SELECT 1 FROM recurring_task_groups WHERE goal_id = ?
      UNION ALL SELECT 1 FROM goal_dependencies WHERE goal_id = ? OR depends_on_goal_id = ?
      LIMIT 1
    `).get(resource.id, resource.id, resource.id, resource.id, resource.id);
    if (referenced) throw new AppError(409, 'Created goal has subsequent references; cannot revert creation');
    db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(resource.id, userId);
    const seq = recordEvent(db, {
      user_id: userId, actor_kind: 'human', channel: 'ui', verb: 'rolled_back',
      objects: [{ kind: 'goal', id: resource.id }], summary: 'Reverted agent goal creation',
      meta: { receipt_id: receipt.id, tool: 'create_goal' },
    });
    return revertToolFaceReceipt(receipt.id, {
      outcome: 'complete', details: { deleted: [resource.id], failed: [], event_seq: Number(seq) },
    }, db);
  }).immediate();
}

// Admission and dispatch share the same executable coverage inventory.
const agentActionReverts = new Map<string, typeof revertCreatedGoalReceipt>([
  ['create_goal', revertCreatedGoalReceipt],
]);

export function hasAgentActionRevert(tool: string): boolean {
  return agentActionReverts.has(tool);
}

export function revertToolReceipt(input: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(input.receiptId);
  if (receipt.user_id !== input.userId) throw new AppError(403, 'Tool face receipt is not owned by user');
  if (receipt.source_type === AGENT_CHAT_RECEIPT_SOURCE_TYPE) {
    const revert = agentActionReverts.get(receipt.metadata.tool);
    if (!revert) throw new AppError(409, 'Agent action has no revert handler');
    return revert(input);
  }
  return revertTrashNotesReceipt(input);
}

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
