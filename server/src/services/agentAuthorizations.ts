import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { recordEvent } from '../db/recordEvent.js';
import { AppError } from '../middleware/errorHandler.js';
import { DELETE_TIME_BLOCK_TOOL, TOOL_REGISTRY } from '../toolFace/registry.js';
import type { AgentActionContext } from './recordAgentAction.js';
import { hasAgentActionRevert } from './toolFaceReceiptRevert.js';
import { deleteTimeBlock, getTimeBlockDeleteConsequences, type TimeBlockDeleteConsequences } from './timeBlocks.js';
import { AGENT_CHAT_RECEIPT_SOURCE_TYPE, writeToolFaceReceipt, type ToolFaceReceiptResource } from './toolFaceReceipts.js';

interface DeleteAuthorizationRow {
  id: string;
  user_id: string;
  kind: 'time_block_delete';
  object_ids: string;
  consequence_hash: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

interface DeleteTimeBlockInput {
  block_id: string;
  authorization_id?: string;
  user_confirmation_anchor?: string;
}

/** Versioned canonical payload: full row keys and affected IDs sorted by code point. */
export function timeBlockConsequenceHash(consequences: TimeBlockDeleteConsequences): string {
  const row = consequences.block;
  const block = Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key as keyof typeof row]]));
  const payload = {
    version: 1,
    block,
    affected_task_ids: consequences.taskBindings.map(task => task.id).sort(),
  };
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

const deletionConsequences = '将永久删除此时间块，并解绑下列全部任务；任务本身保留。普通删除不可恢复，本次操作另留收据供条件满足时撤销。请完整转呈此清单，等待用户明确确认后再执行。';

/**
 * Parallel to A1/A2 recording services: a single existing verb has two phases.
 * No authorization mutation is exposed except creation and single consumption.
 */
export function deleteTimeBlockWithAuthorization(
  db: Database.Database,
  userId: string,
  context: AgentActionContext | undefined,
  args: Record<string, unknown>,
) {
  if (context?.actor !== 'agent' || context.channel !== 'chat' || !context.conversationId?.trim()) {
    throw new AppError(400, 'Agent action context is required');
  }
  if (!TOOL_REGISTRY.includes(DELETE_TIME_BLOCK_TOOL) || DELETE_TIME_BLOCK_TOOL.tier !== 'immediate'
    || !hasAgentActionRevert(DELETE_TIME_BLOCK_TOOL.name)) {
    throw new AppError(409, 'Deletion requires a registered immediate tool with revert coverage');
  }
  if (args.authorization_id !== undefined
    && (typeof args.user_confirmation_anchor !== 'string' || !args.user_confirmation_anchor.trim())) {
    throw new AppError(400, 'user_confirmation_anchor is required for deletion confirmation');
  }
  const input = DELETE_TIME_BLOCK_TOOL.input_schema.parse(args) as DeleteTimeBlockInput;
  return db.transaction(() => {
    const now = new Date();
    const timestamp = now.toISOString();
    if (input.authorization_id === undefined) {
      const consequences = getTimeBlockDeleteConsequences(db, userId, input.block_id);
      const authorizationId = uuidv4();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const taskIds = consequences.taskBindings.map(task => task.id).sort();
      db.prepare(`INSERT INTO agent_authorizations
        (id, user_id, kind, object_ids, consequence_hash, created_at, expires_at, consumed_at)
        VALUES (?, ?, 'time_block_delete', ?, ?, ?, ?, NULL)`)
        .run(authorizationId, userId, JSON.stringify([consequences.block.id, ...taskIds]),
          timeBlockConsequenceHash(consequences), timestamp, expiresAt);
      return DELETE_TIME_BLOCK_TOOL.output_schema.parse({
        authorization_id: authorizationId,
        restatement: { block: consequences.block, affected_task_ids: taskIds, consequences: deletionConsequences },
        expires_at: expiresAt,
      });
    }

    const authorization = db.prepare('SELECT * FROM agent_authorizations WHERE id = ? AND user_id = ?')
      .get(input.authorization_id, userId) as DeleteAuthorizationRow | undefined;
    if (!authorization) throw new AppError(404, 'authorization_not_found: Deletion authorization not found');
    if (authorization.consumed_at !== null) {
      throw new AppError(409, 'authorization_consumed: Deletion authorization has already been used');
    }
    if (Date.parse(authorization.expires_at) <= now.getTime()) {
      throw new AppError(409, 'authorization_expired: Request a new deletion restatement');
    }
    const objectIds = JSON.parse(authorization.object_ids) as string[];
    if (authorization.kind !== 'time_block_delete' || objectIds[0] !== input.block_id) {
      throw new AppError(409, 'authorization_object_mismatch: Authorization is for a different time block');
    }
    let consequences: TimeBlockDeleteConsequences;
    try {
      consequences = getTimeBlockDeleteConsequences(db, userId, input.block_id);
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== 404) throw error;
      throw new AppError(409, 'authorization_consequences_changed: Time block is no longer available');
    }
    if (timeBlockConsequenceHash(consequences) !== authorization.consequence_hash) {
      throw new AppError(409, 'authorization_consequences_changed: Request confirmation of the updated deletion list');
    }

    const deleted = deleteTimeBlock(db, userId, input.block_id);
    const consumed = db.prepare(`UPDATE agent_authorizations SET consumed_at = ?
      WHERE id = ? AND user_id = ? AND consumed_at IS NULL`).run(timestamp, authorization.id, userId);
    if (consumed.changes !== 1) throw new AppError(409, 'authorization_consumed: Deletion authorization has already been used');
    const resources: ToolFaceReceiptResource[] = [
      { kind: 'time_block', id: deleted.block.id, outcome: 'deleted', before: deleted.block },
      ...deleted.taskBindings.map(task => ({
        kind: 'task', id: task.id, outcome: 'unbound', before: { time_block_id: task.time_block_id },
      })),
    ];
    const eventSeq = recordEvent(db, {
      user_id: userId, actor_kind: 'human', channel: 'chat', verb: 'time_block_deleted',
      objects: resources.map(resource => ({ kind: resource.kind as string, id: resource.id as string })),
      summary: 'Confirmed deletion of a time block and unbinding of its tasks',
      meta: {
        via: 'chat', conversation_id: context.conversationId, tool: DELETE_TIME_BLOCK_TOOL.name,
        authorization_id: authorization.id, user_confirmation_anchor: input.user_confirmation_anchor!,
        consequence_hash: authorization.consequence_hash, block_count: 1,
        affected_task_count: deleted.taskBindings.length,
      },
    });
    const receipt = writeToolFaceReceipt({
      userId, courseId: null, sourceType: AGENT_CHAT_RECEIPT_SOURCE_TYPE,
      callId: context.callId ?? uuidv4(), tool: DELETE_TIME_BLOCK_TOOL.name,
      tier: 'immediate', harness: 'agent_chat',
      inputDigest: `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`,
      humanEntry: DELETE_TIME_BLOCK_TOOL.human_entry, resources,
      agentContext: { actor: context.actor, channel: context.channel,
        conversation_id: context.conversationId, event_seq: Number(eventSeq) },
    }, db);
    return DELETE_TIME_BLOCK_TOOL.output_schema.parse({
      message: 'Time block deleted', receipt_id: receipt.id, deleted_block_id: deleted.block.id,
      unbound_task_ids: deleted.taskBindings.map(task => task.id),
    });
  }).immediate();
}
