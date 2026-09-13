import { AppError } from '../middleware/errorHandler.js';
import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
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
    if (receipt.source_type !== AGENT_CHAT_RECEIPT_SOURCE_TYPE
      || !['create_goal', 'create_sub_goal'].includes(receipt.metadata.tool)) {
      throw new AppError(409, 'Tool face receipt is not for agent goal creation');
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
      meta: { receipt_id: receipt.id, tool: receipt.metadata.tool },
    });
    return revertToolFaceReceipt(receipt.id, {
      outcome: 'complete', details: { deleted: [resource.id], failed: [], event_seq: Number(seq) },
    }, db);
  }).immediate();
}

interface CreatedResourceSpec {
  kind: string;
  table: string;
  outcome: 'created' | 'linked';
  references?: string;
  referenceBindings?: number;
  multiple?: boolean;
}

// Table names and reference queries are code-owned, never receipt-supplied SQL.
const createdResourceSpecs: Record<string, CreatedResourceSpec> = {
  create_task: {
    kind: 'task', table: 'tasks', outcome: 'created',
    references: `SELECT 1 FROM task_cards WHERE task_id = ?
      UNION ALL SELECT 1 FROM study_activity_log WHERE entity_type = 'task' AND entity_id = ? LIMIT 1`,
    referenceBindings: 2,
  },
  create_deck: {
    kind: 'deck', table: 'card_decks', outcome: 'created',
    references: `SELECT 1 FROM card_sections WHERE deck_id = ?
      UNION ALL SELECT 1 FROM cards WHERE deck_id = ? LIMIT 1`,
    referenceBindings: 2,
  },
  create_section: {
    kind: 'section', table: 'card_sections', outcome: 'created',
    references: 'SELECT 1 FROM cards WHERE section_id = ? LIMIT 1',
    referenceBindings: 1,
  },
  create_time_blocks: {
    kind: 'time_block', table: 'time_blocks', outcome: 'created', multiple: true,
    references: 'SELECT 1 FROM tasks WHERE time_block_id = ? LIMIT 1',
    referenceBindings: 1,
  },
  link_task_cards: { kind: 'task_card', table: 'task_cards', outcome: 'linked', multiple: true },
};

function appliedAgentReceipt(db: Database.Database, input: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const receipt = readToolFaceReceipt(input.receiptId, db);
  if (receipt.user_id !== input.userId) throw new AppError(403, 'Tool face receipt is not owned by user');
  if (receipt.source_type !== AGENT_CHAT_RECEIPT_SOURCE_TYPE || receipt.status !== 'applied') {
    throw new AppError(409, 'Only an applied agent action receipt can be reverted');
  }
  return receipt;
}

function changedResource(message: string): never {
  throw new AppError(409, message);
}

function finishAgentRevert(
  db: Database.Database, receipt: ToolFaceReceipt, userId: string,
  details: Record<string, unknown>,
): ToolFaceReceipt {
  const seq = recordEvent(db, {
    user_id: userId, actor_kind: 'human', channel: 'ui', verb: 'rolled_back',
    objects: receipt.metadata.resources.map((resource) => ({ kind: resource.kind as string, id: resource.id as string })),
    summary: `Reverted chat ${receipt.metadata.tool}`,
    meta: { receipt_id: receipt.id, tool: receipt.metadata.tool },
  });
  return revertToolFaceReceipt(receipt.id, {
    outcome: 'complete', details: { ...details, failed: [], event_seq: Number(seq) },
  }, db);
}

function revertCreatedResources(input: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const db = getDb();
  return db.transaction(() => {
    const receipt = appliedAgentReceipt(db, input);
    const spec = createdResourceSpecs[receipt.metadata.tool];
    const resources = receipt.metadata.resources;
    if (!spec || !resources.length || (!spec.multiple && resources.length !== 1)
      || new Set(resources.map((resource) => resource.id)).size !== resources.length) {
      changedResource('Created resource receipt is invalid');
    }
    for (const resource of resources) {
      if (resource.kind !== spec.kind || resource.outcome !== spec.outcome
        || typeof resource.id !== 'string') changedResource('Created resource receipt is invalid');
      const row = spec.table === 'task_cards'
        ? db.prepare(`SELECT tc.* FROM task_cards tc JOIN tasks t ON t.id = tc.task_id
            WHERE tc.id = ? AND t.user_id = ?`).get(resource.id, input.userId)
        : db.prepare(`SELECT * FROM ${spec.table} WHERE id = ? AND user_id = ?`).get(resource.id, input.userId);
      if (!row || goalReceiptHash(row) !== resource.state_hash) {
        changedResource(`Created ${spec.kind} ${resource.id} changed or is missing; cannot revert creation`);
      }
      if (spec.references && db.prepare(spec.references).get(...Array(spec.referenceBindings).fill(resource.id))) {
        changedResource(`Created ${spec.kind} ${resource.id} has subsequent references; cannot revert creation`);
      }
    }
    // Validate the whole receipt before deleting. Any write/event/receipt failure
    // still rolls the complete batch back through this transaction.
    for (const resource of resources) {
      db.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).run(resource.id);
    }
    return finishAgentRevert(db, receipt, input.userId, { deleted: resources.map((resource) => resource.id) });
  }).immediate();
}

function previousValues(resource: ToolFaceReceiptResource): Record<string, unknown> {
  if (!resource.before || typeof resource.before !== 'object' || Array.isArray(resource.before)) {
    changedResource('Updated resource receipt has no original values');
  }
  return resource.before as Record<string, unknown>;
}

function revertUpdatedTimeBlock(input: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const db = getDb();
  return db.transaction(() => {
    const receipt = appliedAgentReceipt(db, input);
    const [resource] = receipt.metadata.resources;
    if (receipt.metadata.tool !== 'update_time_block' || receipt.metadata.resources.length !== 1
      || resource?.kind !== 'time_block' || resource.outcome !== 'updated' || typeof resource.id !== 'string') {
      changedResource('Time block update receipt is invalid');
    }
    const row = db.prepare('SELECT * FROM time_blocks WHERE id = ? AND user_id = ?').get(resource.id, input.userId);
    if (!row || goalReceiptHash(row) !== resource.state_hash) {
      changedResource('Updated time block changed or is missing; cannot restore original values');
    }
    const before = previousValues(resource);
    const fields = ['label', 'type', 'start_time', 'end_time', 'color', 'updated_at'];
    if (fields.some((field) => before[field] === undefined)) changedResource('Time block original values are incomplete');
    db.prepare(`UPDATE time_blocks SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...fields.map((field) => before[field]), resource.id, input.userId);
    return finishAgentRevert(db, receipt, input.userId, { restored: [resource.id] });
  }).immediate();
}

function completionSnapshot(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    changedResource('Task completion side effect receipt is invalid');
  }
  return value as Record<string, unknown>;
}

function revertCompletedTask(input: RevertTrashNotesReceiptInput): ToolFaceReceipt {
  const db = getDb();
  return db.transaction(() => {
    const receipt = appliedAgentReceipt(db, input);
    const [resource] = receipt.metadata.resources;
    if (receipt.metadata.tool !== 'complete_task' || receipt.metadata.resources.length !== 1
      || resource?.kind !== 'task' || resource.outcome !== 'completed' || typeof resource.id !== 'string') {
      changedResource('Task completion receipt is invalid');
    }
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(resource.id, input.userId);
    if (!task || goalReceiptHash(task) !== resource.state_hash) {
      changedResource('Completed task changed or is missing; cannot restore original status');
    }
    const before = previousValues(resource);
    if (typeof before.status !== 'string' || typeof before.updated_at !== 'string'
      || (before.completed_at !== null && typeof before.completed_at !== 'string')) {
      changedResource('Task completion original values are incomplete');
    }
    const activity = completionSnapshot(resource.activity);
    const groupBefore = completionSnapshot(resource.recurring_group_before);
    const groupAfter = completionSnapshot(resource.recurring_group_after);
    if (activity) {
      const current = db.prepare('SELECT * FROM study_activity_log WHERE id = ? AND user_id = ?')
        .get(activity.id, input.userId);
      if (activity.entity_type !== 'task' || activity.entity_id !== resource.id
        || !current || goalReceiptHash(current) !== goalReceiptHash(activity)) {
        changedResource('Task completion activity changed or is missing; cannot revert');
      }
    }
    if (Boolean(groupBefore) !== Boolean(groupAfter)) changedResource('Task completion group receipt is incomplete');
    if (groupBefore && groupAfter) {
      const current = db.prepare('SELECT * FROM recurring_task_groups WHERE id = ? AND user_id = ?')
        .get(groupAfter.id, input.userId);
      if (groupBefore.id !== groupAfter.id || typeof groupBefore.completed_tasks !== 'number'
        || !current || goalReceiptHash(current) !== goalReceiptHash(groupAfter)) {
        changedResource('Task completion recurring group changed or is missing; cannot revert');
      }
    }
    if (activity) db.prepare('DELETE FROM study_activity_log WHERE id = ? AND user_id = ?').run(activity.id, input.userId);
    if (groupBefore) {
      db.prepare('UPDATE recurring_task_groups SET completed_tasks = ? WHERE id = ? AND user_id = ?')
        .run(groupBefore.completed_tasks, groupBefore.id, input.userId);
    }
    db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(before.status, before.completed_at, before.updated_at, resource.id, input.userId);
    return finishAgentRevert(db, receipt, input.userId, {
      restored: [resource.id], deleted_activity_ids: activity ? [activity.id] : [],
      restored_recurring_group_ids: groupBefore ? [groupBefore.id] : [],
    });
  }).immediate();
}

// Admission and dispatch share the same executable coverage inventory.
const agentActionReverts = new Map<string, typeof revertCreatedGoalReceipt>([
  ['create_goal', revertCreatedGoalReceipt],
  ['create_sub_goal', revertCreatedGoalReceipt],
  ['create_task', revertCreatedResources],
  ['create_deck', revertCreatedResources],
  ['create_section', revertCreatedResources],
  ['create_time_blocks', revertCreatedResources],
  ['update_time_block', revertUpdatedTimeBlock],
  ['link_task_cards', revertCreatedResources],
  ['complete_task', revertCompletedTask],
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
