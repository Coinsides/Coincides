import assert from 'node:assert/strict';
import { classifyDirectInstruction, renderDirectInstructionPrompt } from '../../../src/agent/intentRules.js';
import { answer, results, tool } from '../helpers.js';
import type { Scenario } from '../types.js';

const content = '我喜欢先看材料目录，再逐段阅读。';
const user = `请记住：${content}`;

export default {
  name: '09-memory-directive',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup() {},
  turns: [{
    user,
    *script(ctx) {
      if (ctx.round === 0) {
        ctx.state.prompt = ctx.prompt;
        // Provider is scripted; the real route/orchestrator/dispatcher/save and receipt run unchanged.
        assert.equal(classifyDirectInstruction(user), 'memory');
        assert.ok(ctx.prompt.includes(renderDirectInstructionPrompt()));
        yield* tool('direct-memory', 'save_memory', { category: 'preference', content });
      } else yield* answer('偏好已保存。');
    },
  }],
  async assertions(ctx) {
    const turn = ctx.turns[0];
    await ctx.check('natural user wording contains no tool instruction and actual prompt includes the two-family amendment', () => {
      assert.equal(turn.user, user);
      assert.doesNotMatch(turn.user, /save_memory|create_proposal/);
      assert.ok(ctx.state.prompt.includes(renderDirectInstructionPrompt()));
    });
    await ctx.check('save_memory executes once successfully and yields the persisted successful turn receipt', () => {
      const ends = turn.events.filter(event => event.type === 'tool_end');
      assert.deepEqual(ends.map(event => ({ name: event.data.name, ok: event.data.ok })), [{ name: 'save_memory', ok: true }]);
      assert.equal(results(turn)[0].message, 'Memory saved successfully');
      const receipts = turn.events.filter(event => event.type === 'turn_receipt');
      assert.equal(receipts.length, 1);
      assert.deepEqual(receipts[0].data.write_calls, [{ name: 'save_memory', ok: true }]);
      assert.equal(receipts[0].data.write_ok_count, 1);
      assert.equal(receipts[0].data.write_fail_count, 0);
      assert.deepEqual(turn.api.history.filter(row => row.turn_receipt).at(-1)?.turn_receipt, receipts[0].data);
    });
    await ctx.check('the real memory store and memory API contain the exact naturally requested preference', () => {
      const memories = turn.tables.agent_memories.filter(row => row.user_id === ctx.userId);
      assert.equal(memories.length, 1);
      assert.equal(memories[0].content, content);
      assert.equal(memories[0].category, 'preference');
      assert.equal(turn.api.memories.length, 1);
      assert.equal(turn.api.memories[0].id, memories[0].id);
      assert.equal(turn.api.memories[0].content, content);
    });
    await ctx.check('the natural memory directive has zero claim_without_receipt flags and no note or proposal writes', () => {
      assert.equal(turn.tables.events.filter(row => row.verb === 'claim_without_receipt').length, 0);
      assert.equal(turn.ledger.filter(row => row.verb === 'claim_without_receipt').length, 0);
      for (const table of ['notes', 'note_blocks', 'proposals', 'operation_batches']) assert.deepEqual(turn.tables[table], []);
    });
  },
} satisfies Scenario;
