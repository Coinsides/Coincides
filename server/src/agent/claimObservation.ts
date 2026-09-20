import type Database from 'better-sqlite3';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import { recordEvent } from '../db/recordEvent.js';

// A small, deliberately literal observation vocabulary, not a semantic verdict.
export const CLAIM_TERMS_ZH = [
  '已保存', '已创建', '已记住', '已记录', '已更新', '已删除', '已完成',
  '已上件', '已移位', '已连线', '已摆放', '已调整图层',
] as const;
export const CLAIM_TERMS_EN = [
  'saved', 'created', 'remembered', 'recorded', 'updated', 'deleted', 'completed',
  'mounted', 'moved', 'connected', 'arranged',
] as const;

const englishPatterns = CLAIM_TERMS_EN.map((term) => ({ term, pattern: new RegExp(`\\b${term}\\b`, 'i') }));

export function matchClaimTerms(content: string): string[] {
  return [
    ...CLAIM_TERMS_ZH.filter((term) => content.includes(term)),
    ...englishPatterns.filter(({ pattern }) => pattern.test(content)).map(({ term }) => term),
  ];
}

/** Call once at the stream tail with this run's persisted messages and receipt. */
export function observeClaimWithoutReceipt(
  db: Database.Database,
  userId: string,
  conversationId: string,
  messages: ReadonlyArray<{ id: string; role: string; content: string }>,
  receipt: AgentTurnReceipt,
): void {
  if (receipt.write_ok_count !== 0) return;

  const matches = messages.filter(({ role }) => role === 'assistant')
    .map(({ id, content }) => ({ id, terms: matchClaimTerms(content) }))
    .filter(({ terms }) => terms.length > 0);
  if (matches.length === 0) return;

  const messageIds = matches.map(({ id }) => id);
  const matchedTerms = [...new Set(matches.flatMap(({ terms }) => terms))];
  try {
    db.transaction(() => recordEvent(db, {
      user_id: userId,
      actor_kind: 'system',
      channel: 'chat',
      verb: 'claim_without_receipt',
      objects: [
        { kind: 'agent_conversation', id: conversationId },
        ...messageIds.map((id) => ({ kind: 'agent_message', id })),
      ],
      summary: 'Effect-claim term matched without a successful write receipt.',
      meta: {
        conversation_id: conversationId,
        message_id: messageIds[0],
        matched_terms: matchedTerms,
        ...(messageIds.length > 1 ? { message_ids: messageIds } : {}),
      },
    }))();
  } catch {
    // Observation failure must neither block nor rewrite the already-produced reply.
    // Do not log message text, identifiers or database diagnostics.
    console.warn('claim_without_receipt_observation_failed');
  }
}
