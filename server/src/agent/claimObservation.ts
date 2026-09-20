import type Database from 'better-sqlite3';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import { recordEvent } from '../db/recordEvent.js';
import { projectTurnReceipt, type PersistedAgentMessage } from './turnReceipt.js';

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

type ClaimMessage = Pick<PersistedAgentMessage, 'id' | 'role' | 'content'>
  & Partial<Pick<PersistedAgentMessage, 'tool_calls' | 'tool_results' | 'turn_id'>>;

// Explicit memory-reference forms only. Unsupported forms retain the old flags.
const quotedMemory = String.raw`(「[^」\r\n]+」|『[^』\r\n]+』|“[^”\r\n]+”|"[^"\r\n]+"|'[^'\r\n]+')`;
const memoryReferences = [
  new RegExp(String.raw`(?:我)?(?:之前|此前|先前)?(?:已记住|已保存|已记录)(?:的)?(?:你的)?(?:偏好|习惯|记忆)\s*[:：]\s*${quotedMemory}`, 'gu'),
  new RegExp(String.raw`\b(?:I\s+)?(?:previously\s+)?(?:remembered|saved|recorded)\s+(?:your\s+)?(?:preference|habit|memory)\s*:\s*${quotedMemory}`, 'giu'),
];

function normalizeMemoryQuote(text: string): string {
  // Literal substring matching: no case folding, tokenization or semantic lookup.
  return text.replace(/[「」『』“”"'，,。.!！?？:：;；、]/gu, '').trim().replace(/\s+/gu, ' ');
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

function memoryEvidence(messages: readonly ClaimMessage[], name: 'save_memory' | 'search_memories'): string[] {
  const evidence: string[] = [];
  for (let index = 0; index < messages.length - 1; index++) {
    const message = messages[index];
    const next = messages[index + 1];
    if (message.role !== 'assistant' || next.role !== 'user' || message.turn_id !== next.turn_id) continue;
    const calls = parsed(message.tool_calls);
    const results = parsed(next.tool_results);
    if (!Array.isArray(calls) || !Array.isArray(results)) continue;
    // Reuse the receipt projector's local ID pairing, duplicate and failure rules.
    const round = projectTurnReceipt([message, next].map(row => ({
      ...row, tool_calls: row.tool_calls ?? null, tool_results: row.tool_results ?? null,
    })));
    const receipts = (name === 'save_memory' ? round.write_calls : round.read_calls).filter(call => call.name === name);
    calls.filter(call => object(call) && call.name === name).forEach((call, callIndex) => {
      if (!receipts[callIndex]?.ok) return;
      const result = results.find(result => object(result) && result.tool_call_id === call.id);
      const payload = parsed(result?.content);
      if (name === 'save_memory') {
        // The write result carries the saved identity; the paired arguments carry its text.
        if (object(payload) && typeof payload.id === 'string' && payload.id
          && object(call.arguments) && typeof call.arguments.content === 'string') {
          evidence.push(call.arguments.content);
        }
      } else if (Array.isArray(payload)) {
        for (const hit of payload) {
          if (object(hit) && typeof hit.id === 'string' && hit.id && typeof hit.content === 'string'
            && (hit.kind === undefined || hit.kind === 'memory')) evidence.push(hit.content);
        }
      }
    });
  }
  return evidence.map(normalizeMemoryQuote).filter(Boolean);
}

function unsupportedClaimTerms(content: string, evidence: readonly string[]): string[] {
  let unmatched = content;
  for (const pattern of memoryReferences) {
    unmatched = unmatched.replace(pattern, (reference: string, quote: string) => {
      const normalized = normalizeMemoryQuote(quote);
      return normalized && evidence.some(memory => memory.includes(normalized)) ? '' : reference;
    });
  }
  return matchClaimTerms(unmatched);
}

/** Call once at the stream tail with this run's persisted messages and receipt. */
export function observeClaimWithoutReceipt(
  db: Database.Database,
  userId: string,
  conversationId: string,
  messages: readonly ClaimMessage[],
  receipt: AgentTurnReceipt,
  previousMessages: readonly ClaimMessage[] = [],
): void {
  if (receipt.write_ok_count !== 0) return;

  // Only supplied transcript receipts count. Never query the memory database here.
  const evidence = [...memoryEvidence(previousMessages, 'save_memory'), ...memoryEvidence(messages, 'search_memories')];
  const matches = messages.filter(({ role }) => role === 'assistant')
    .map(({ id, content }) => ({ id, terms: unsupportedClaimTerms(content, evidence) }))
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
