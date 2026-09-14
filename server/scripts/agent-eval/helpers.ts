import type { StreamChunk } from '../../src/agent/providers/types.js';
import type { Row, TurnRecord } from './types.js';

export function tool(id: string, name: string, args: Row = {}): StreamChunk[] {
  const tool_call = { id, name, arguments: args };
  return [
    { type: 'tool_call_start', tool_call },
    { type: 'tool_call_delta', tool_call, text: JSON.stringify(args) },
    { type: 'tool_call_end', tool_call },
    { type: 'done' },
  ];
}
export function answer(text: string): StreamChunk[] {
  return [{ type: 'text', text }, { type: 'done' }];
}
export function results(turn: TurnRecord): Row[] {
  const ids = new Set(turn.events.filter(e => e.type === 'tool_end').map(e => e.data.id));
  return turn.api.history.flatMap(row => row.tool_results ? JSON.parse(row.tool_results) : [])
    .filter((result: Row) => ids.has(result.tool_call_id))
    .map((result: Row) => ({ ...JSON.parse(result.content), callId: result.tool_call_id }));
}
