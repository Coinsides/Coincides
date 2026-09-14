import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import { classifyToolEffect } from './tools/effectClassification.js';

export interface PersistedAgentMessage {
  id: string;
  role: string;
  content: string;
  tool_calls: unknown;
  tool_results: unknown;
  turn_id?: string | null;
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function array(value: unknown): unknown[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

function succeeded(result: unknown): boolean {
  if (!object(result) || typeof result.content !== 'string') return false;
  let content: unknown;
  try { content = JSON.parse(result.content); } catch { return true; }
  if (!object(content)) return true;
  if (content.error || content.ok === false || content.success === false) return false;
  // A delete restatement is a request for confirmation, not a completed deletion.
  if (content.authorization_id && content.restatement && !content.receipt_id) return false;
  return true;
}

/** One runAgent turn, including every internal tool round, from saved evidence only. */
export function projectTurnReceipt(messages: readonly PersistedAgentMessage[]): AgentTurnReceipt {
  const receipt: AgentTurnReceipt = { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 };
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    // Pair locally, so reused call IDs in later rounds cannot steal an earlier result.
    const next = messages[index + 1];
    const results = next?.role === 'user' ? array(next.tool_results) : [];
    const calls = array(message.tool_calls);
    for (const call of calls) {
      if (!object(call) || typeof call.name !== 'string') continue;
      const effect = classifyToolEffect(call.name);
      const matches = typeof call.id === 'string'
        ? results.filter(result => object(result) && result.tool_call_id === call.id) : [];
      const uniqueCall = calls.filter(other => object(other) && other.id === call.id).length === 1;
      const entry = { name: call.name, ok: uniqueCall && matches.length === 1 && succeeded(matches[0]) };
      if (!effect) (receipt.unclassified_calls ??= []).push(entry);
      else if (effect === 'read') receipt.read_calls.push(entry);
      else {
        receipt.write_calls.push(entry);
        if (entry.ok) receipt.write_ok_count++;
        else receipt.write_fail_count++;
      }
    }
  }
  return receipt;
}

/** Ownership is registered at birth; NULL legacy rows never borrow nearby evidence. */
export function projectMessageReceipts<T extends PersistedAgentMessage>(messages: readonly T[]): Array<T & { turn_receipt?: AgentTurnReceipt }> {
  const projected: Array<T & { turn_receipt?: AgentTurnReceipt }> = messages.map(message => ({ ...message }));
  const turns = new Map<string, { messages: T[]; lastAssistantIndex?: number }>();
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.turn_id == null) continue;
    let turn = turns.get(message.turn_id);
    if (!turn) turns.set(message.turn_id, turn = { messages: [] });
    turn.messages.push(message);
    if (message.role === 'assistant') turn.lastAssistantIndex = index;
  }
  for (const turn of turns.values()) {
    if (turn.lastAssistantIndex !== undefined) {
      projected[turn.lastAssistantIndex].turn_receipt = projectTurnReceipt(turn.messages);
    }
  }
  return projected;
}
