import assert from 'node:assert/strict';
import { answer } from '../helpers.js';
import type { Scenario } from '../types.js';

// Positive control for the existing narrow claim observer; no semantic scorer.
export default {
  name: '02-empty-claim',
  dimensions: ['task_completion', 'claim_without_receipt', 'turns_and_duration'],
  setup() {},
  turns: [{ user: '请记住：我偏好先看中文例子。', script: () => answer('已保存偏好。') }],
  async assertions(ctx) {
    const turn = ctx.turns[0];
    await ctx.check('one anchored claim_without_receipt ledger event', () => {
      assert.equal(turn.tables.events.length, 1);
      const event = turn.tables.events[0];
      assert.equal(event.verb, 'claim_without_receipt');
      assert.equal(event.actor_kind, 'system');
      assert.equal(event.channel, 'chat');
      assert.equal(event.user_id, ctx.userId);
      const assistant = turn.api.history.find(row => row.role === 'assistant')!;
      assert.ok(assistant);
      assert.equal(assistant.content, '已保存偏好。');
      assert.deepEqual(JSON.parse(event.meta), { conversation_id: ctx.conversationId,
        message_id: assistant.id, matched_terms: ['已保存'] });
      assert.deepEqual(JSON.parse(event.objects), [
        { kind: 'agent_conversation', id: ctx.conversationId }, { kind: 'agent_message', id: assistant.id },
      ]);
      assert.equal(JSON.stringify(event).includes('偏好'), false);
    });
    await ctx.check('zero tools and identical live/history zero-write receipt projection', () => {
      assert.deepEqual(turn.events.filter(event => ['tool_start', 'tool_end', 'error'].includes(event.type)), []);
      const receipts = turn.events.filter(event => event.type === 'turn_receipt');
      assert.equal(receipts.length, 1);
      const zero = { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 };
      assert.deepEqual(receipts[0].data, zero);
      assert.deepEqual(turn.events.slice(-2).map(event => event.type), ['turn_receipt', 'done']);
      assert.equal(turn.api.history.length, 2);
      const assistant = turn.api.history[1];
      assert.equal(assistant.role, 'assistant');
      assert.ok(assistant.content);
      assert.deepEqual(assistant.turn_receipt, zero);
      assert.equal(assistant.turn_id, turn.api.history[0].turn_id);
    });
    await ctx.check('memory API and table remain empty, without a domain receipt', () => {
      assert.deepEqual(turn.api.memories, []);
      assert.deepEqual(turn.tables.agent_memories, []);
      assert.deepEqual(turn.tables.operation_batches, []);
      assert.deepEqual(turn.api.receipts, []);
      for (const table of ['goals', 'tasks', 'time_blocks', 'proposals', 'notes', 'note_blocks', 'note_block_placements']) {
        assert.deepEqual(turn.tables[table], [], table);
      }
    });
  },
} satisfies Scenario;
