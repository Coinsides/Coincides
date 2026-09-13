import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { recordEvent, type EventVerb } from '../db/recordEvent.js';
import { AppError } from '../middleware/errorHandler.js';
import { TOOL_REGISTRY, type ToolRegistryEntry } from '../toolFace/registry.js';
import type { AgentActionContext } from './recordAgentAction.js';
import { hasAgentActionRevert } from './toolFaceReceiptRevert.js';
import { AGENT_CHAT_RECEIPT_SOURCE_TYPE, writeToolFaceReceipt, type ToolFaceReceiptResource } from './toolFaceReceipts.js';

interface ChatTranscription<T> {
  tool: ToolRegistryEntry;
  input: Record<string, unknown>;
  verb: EventVerb;
  summary: string;
  execute: (input: unknown) => T;
  resources: (result: T) => ToolFaceReceiptResource[];
  courseId: (result: T) => string | null;
}

/** Human judgment transcribed through chat; the executor and receipt remain agent-owned. */
export function recordChatTranscription<T>(
  db: Database.Database,
  userId: string,
  context: AgentActionContext | undefined,
  action: ChatTranscription<T>,
) {
  if (context?.actor !== 'agent' || context.channel !== 'chat' || !context.conversationId?.trim()) {
    throw new AppError(400, 'Agent action context is required');
  }
  const anchor = action.input.user_utterance_anchor;
  if (typeof anchor !== 'string' || !anchor.trim()) {
    throw new AppError(400, 'user_utterance_anchor is required for chat transcription');
  }
  if (!TOOL_REGISTRY.includes(action.tool) || action.tool.tier !== 'immediate'
    || !hasAgentActionRevert(action.tool.name)) {
    throw new AppError(409, 'Chat transcription requires a registered immediate tool with revert coverage');
  }
  const input = action.tool.input_schema.parse(action.input);
  return db.transaction(() => {
    const result = action.execute(input);
    if (result instanceof Promise) throw new TypeError('Chat transcriptions must be synchronous');
    const resources = action.resources(result);
    if (!resources.length || resources.some((resource) => (
      typeof resource.kind !== 'string' || !resource.kind.trim()
      || typeof resource.id !== 'string' || !resource.id.trim()
    ))) throw new TypeError('Chat transcription must return actual object IDs');
    const eventSeq = recordEvent(db, {
      user_id: userId,
      actor_kind: 'human',
      channel: 'chat',
      verb: action.verb,
      objects: resources.map((resource) => ({ kind: resource.kind as string, id: resource.id as string })),
      summary: action.summary,
      meta: {
        conversation_id: context.conversationId,
        tool: action.tool.name,
        user_utterance_anchor: anchor,
        via: 'chat',
      },
    });
    const receipt = writeToolFaceReceipt({
      userId,
      courseId: action.courseId(result),
      sourceType: AGENT_CHAT_RECEIPT_SOURCE_TYPE,
      callId: context.callId ?? uuidv4(),
      tool: action.tool.name,
      tier: 'immediate',
      harness: 'agent_chat',
      inputDigest: `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`,
      humanEntry: action.tool.human_entry,
      resources,
      agentContext: {
        actor: context.actor, channel: context.channel,
        conversation_id: context.conversationId, event_seq: Number(eventSeq),
      },
    }, db);
    return { result, receipt };
  }).immediate();
}
