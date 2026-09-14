import assert from 'node:assert/strict';
import { hasAgentActionRevert } from '../../../src/services/toolFaceReceiptRevert.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const titles = ['掌握极限', '理解单侧极限', '完成极限练习'];
const names = ['create_goal', 'create_sub_goal', 'create_task'];

export default {
  name: '01-goal-task-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup() {},
  turns: [
    {
      user: ctx => `在项目 ${ctx.courseId} 建目标“${titles[0]}”，截止 2026-10-01。`,
      script(ctx) {
        return ctx.round === 0
          ? tool('goal-call', names[0], { course_id: ctx.courseId, title: titles[0], deadline: '2026-10-01' })
          : answer('已创建目标。');
      },
    },
    {
      user: ctx => `在目标 ${ctx.turns[0].tables.goals[0]?.id} 下建子目标“${titles[1]}”。`,
      script(ctx) {
        return ctx.round === 0
          ? tool('subgoal-call', names[1], { parent_id: ctx.turns[0].tables.goals[0]?.id, title: titles[1] })
          : answer('已创建子目标。');
      },
    },
    {
      user: ctx => `为项目 ${ctx.courseId} 的子目标 ${ctx.turns[1].tables.goals.find(row => row.parent_id)?.id} 建任务“${titles[2]}”，日期 2026-10-01。`,
      script(ctx) {
        return ctx.round === 0
          ? tool('task-call', names[2], { course_id: ctx.courseId,
            goal_id: ctx.turns[1].tables.goals.find(row => row.parent_id)?.id,
            title: titles[2], date: '2026-10-01' })
          : answer('已创建任务。');
      },
    },
  ],
  async assertions(ctx) {
    for (const [index, turn] of ctx.turns.entries()) {
      const name = names[index];
      const prefix = `turn ${index + 1}`;
      await ctx.check(`${prefix}: exact domain rows and parent links`, () => {
        assert.equal(turn.tables.goals.length, Math.min(index + 1, 2));
        assert.equal(turn.tables.tasks.length, index === 2 ? 1 : 0);
        const parent = turn.tables.goals.find(row => row.parent_id === null)!;
        assert.ok(parent);
        assert.equal(parent.title, titles[0]);
        assert.equal(parent.course_id, ctx.courseId);
        assert.equal(parent.user_id, ctx.userId);
        assert.equal(parent.deadline, '2026-10-01');
        assert.equal(parent.status, 'active');
        if (index > 0) {
          const child = turn.tables.goals.find(row => row.parent_id === parent.id)!;
          assert.ok(child);
          assert.equal(child.title, titles[1]);
          assert.equal(child.course_id, parent.course_id);
          assert.equal(child.user_id, ctx.userId);
          assert.equal(child.status, 'active');
          if (index === 2) {
            const task = turn.tables.tasks[0];
            assert.equal(task.title, titles[2]);
            assert.equal(task.goal_id, child.id);
            assert.equal(task.course_id, ctx.courseId);
            assert.equal(task.user_id, ctx.userId);
            assert.equal(task.date, '2026-10-01');
            assert.equal(task.status, 'pending');
          }
        }
        // Earlier turns remain byte-for-byte stable while the next entity is added.
        if (index > 0) for (const prior of ctx.turns[index - 1].tables.goals) {
          assert.deepEqual(turn.tables.goals.find(row => row.id === prior.id), prior);
        }
      });
      await ctx.check(`${prefix}: SSE tool result and persisted receipt agree`, () => {
        const writes = turn.events.filter(event => event.type === 'tool_end' && event.data.name === name);
        assert.equal(writes.length, 1);
        const callId = writes[0].data.id;
        assert.deepEqual(writes[0].data, { id: callId, name, ok: true });
        assert.deepEqual(turn.events.filter(event => event.type === 'tool_start' && event.data.id === callId)
          .map(event => event.data), [{ id: callId, name }]);
        assert.equal(turn.events.filter(event => event.type === 'error').length, 0);
        const receipts = turn.events.filter(event => event.type === 'turn_receipt');
        assert.equal(receipts.length, 1);
        const receipt = receipts[0].data;
        assert.deepEqual(receipt.write_calls, [{ name, ok: true }]);
        assert.equal(receipt.write_ok_count, 1);
        assert.equal(receipt.write_fail_count, 0);
        assert.equal(receipt.unclassified_calls, undefined);
        const projected = turn.api.history.filter(row => row.turn_receipt);
        assert.equal(projected.length, index + 1);
        assert.deepEqual(projected.at(-1)?.turn_receipt, receipt);
        for (let prior = 0; prior < index; prior++) {
          assert.deepEqual(projected[prior].turn_receipt,
            ctx.turns[prior].events.find(event => event.type === 'turn_receipt')?.data);
        }
      });
      await ctx.check(`${prefix}: actual IDs reconcile result, ledger, receipt API and undo registration`, () => {
        const result = results(turn).find(row => row.receipt_id);
        assert.ok(result);
        const entity = (index === 2 ? turn.tables.tasks : turn.tables.goals).find(row => row.id === result.id);
        assert.ok(entity);
        assert.equal(entity.title, titles[index]);
        assert.equal(turn.tables.operation_batches.length, index + 1);
        const batch = turn.tables.operation_batches.find(row => row.id === result.receipt_id)!;
        assert.ok(batch);
        assert.equal(batch.source_type, 'agent_chat');
        assert.equal(batch.source_id, result.callId);
        assert.equal(batch.status, 'applied');
        assert.ok(batch.applied_at);
        const metadata = JSON.parse(batch.metadata);
        assert.equal(metadata.tool, name);
        assert.equal(metadata.tier, 'immediate');
        assert.equal(metadata.harness, 'agent_chat');
        assert.equal(hasAgentActionRevert(name), true);
        assert.match(metadata.input_digest, /^sha256:[a-f0-9]{64}$/);
        assert.equal(metadata.resources.length, 1);
        const resource = metadata.resources[0];
        assert.equal(resource.id, entity.id);
        assert.equal(resource.kind, index === 2 ? 'task' : 'goal');
        assert.equal(resource.outcome, 'created');
        assert.ok(resource.state_hash);
        assert.equal(turn.tables.events.length, index + 1);
        const event = turn.tables.events.find(row => row.seq === metadata.agent_context.event_seq)!;
        assert.ok(event);
        assert.equal(event.verb, index === 2 ? 'task_created' : 'goal_created');
        assert.equal(event.actor_kind, 'agent');
        assert.equal(event.channel, 'chat');
        assert.equal(event.user_id, ctx.userId);
        assert.deepEqual(JSON.parse(event.objects), [{ kind: resource.kind, id: entity.id }]);
        assert.deepEqual(JSON.parse(event.meta), { conversation_id: ctx.conversationId, tool: name });
        assert.deepEqual(metadata.agent_context, { actor: 'agent', channel: 'chat',
          conversation_id: ctx.conversationId, event_seq: event.seq });
        assert.equal(turn.api.receipts.length, index + 1);
        const queue = turn.api.receipts.find((row: Row) => row.id === batch.id)!;
        assert.ok(queue);
        assert.equal(queue.status, 'applied');
        assert.equal(queue.tool, name);
        assert.deepEqual(queue.resources, metadata.resources);
      });
    }
  },
} satisfies Scenario;
