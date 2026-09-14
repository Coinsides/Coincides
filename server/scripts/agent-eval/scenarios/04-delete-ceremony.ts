import assert from 'node:assert/strict';
import { hasAgentActionRevert } from '../../../src/services/toolFaceReceiptRevert.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario, ScriptContext } from '../types.js';

const blockId = 'eval-delete-block';
const taskIds = ['eval-delete-task-a', 'eval-delete-task-b'];
const confirmation = '确认删除上述时间块，任务解绑，我已了解不可恢复的后果。';

function latestResult(ctx: ScriptContext): Row {
  const result = ctx.messages.flatMap(message => message.tool_results ?? []).at(-1);
  return result ? JSON.parse(result.content) : {};
}

export default {
  name: 'delete-ceremony',
  dimensions: ['task_completion', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    ctx.db.prepare(`INSERT INTO time_blocks
      (id,user_id,label,type,date,start_time,end_time,color,created_at,updated_at)
      VALUES (?,?,'晚间复习','study','2026-10-01','18:00','19:00','#445566',?,?)`)
      .run(blockId, ctx.userId, '2026-09-14T00:00:00.000Z', '2026-09-14T01:00:00.000Z');
    for (const id of [...taskIds].reverse()) {
      ctx.db.prepare(`INSERT INTO tasks (id,user_id,course_id,title,date,time_block_id)
        VALUES (?,?,?,?,'2026-10-01',?)`).run(id, ctx.userId, ctx.courseId, id, blockId);
    }
    ctx.state.originalBlock = ctx.db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(blockId);
    ctx.state.originalTasks = ctx.db.prepare('SELECT * FROM tasks WHERE time_block_id = ? ORDER BY id').all(blockId);
  },
  turns: [
    {
      user: `请删除时间块 ${blockId}。先向我完整复述影响范围，等待我确认。`,
      *script(ctx) {
        if (ctx.round === 0) yield* tool('delete-prepare', 'delete_time_block', { block_id: blockId });
        else {
          const prepared = latestResult(ctx);
          ctx.state.authorizationId = prepared.authorization_id;
          yield* answer(`请核对删除清单，尚未执行删除：${JSON.stringify(prepared.restatement)}`);
        }
      },
    },
    {
      user: confirmation,
      *script(ctx) {
        if (ctx.round === 0) {
          // The provider carries the authorization returned by the real first tool result.
          const prepared = results(ctx.turns[0]).find(result => result.authorization_id);
          yield* tool('delete-confirm', 'delete_time_block', {
            block_id: blockId,
            authorization_id: prepared?.authorization_id,
            user_confirmation_anchor: confirmation,
          });
        } else yield* answer('时间块删除操作完成，任务已解绑并保留。');
      },
    },
  ],
  async assertions(ctx) {
    await ctx.check('two complete SSE turns preserve tool start/end IDs and saved receipt projections', () => {
      assert.equal(ctx.turns.length, 2);
      for (const [index, turn] of ctx.turns.entries()) {
        assert.equal(turn.events.filter(event => event.type === 'done').length, 1);
        assert.deepEqual(turn.events.filter(event => event.type === 'error'), []);
        const start = turn.events.filter(event => event.type === 'tool_start');
        const end = turn.events.filter(event => event.type === 'tool_end');
        assert.equal(start.length, 1);
        assert.equal(end.length, 1);
        assert.equal(end[0].data.name, 'delete_time_block');
        assert.deepEqual(end[0].data, { ...start[0].data, ok: true });
        const receipts = turn.events.filter(event => event.type === 'turn_receipt');
        assert.equal(receipts.length, 1);
        assert.deepEqual(receipts[0].data, {
          write_calls: [{ name: 'delete_time_block', ok: index === 1 }], read_calls: [],
          write_ok_count: index === 1 ? 1 : 0, write_fail_count: index === 1 ? 0 : 1,
        });
        const projected = turn.api.history.filter(row => row.turn_receipt).at(-1)?.turn_receipt;
        assert.deepEqual(projected, receipts[0].data);
      }
    });
    await ctx.check('unconfirmed call returns complete system restatement and a 24-hour unconsumed authorization', () => {
      const first = ctx.turns[0];
      const prepared = results(first)[0];
      assert.deepEqual(prepared.restatement.block, ctx.state.originalBlock);
      assert.deepEqual(prepared.restatement.affected_task_ids, taskIds);
      assert.match(prepared.restatement.consequences, /不可恢复/);
      assert.match(prepared.restatement.consequences, /解绑/);
      assert.equal(prepared.receipt_id, undefined);
      const presented = first.events.filter(event => event.type === 'text').map(event => event.data.content).join('');
      assert.ok(presented.includes(JSON.stringify(prepared.restatement)), 'the complete system restatement is presented before confirmation');
      const authorizations = first.tables.agent_authorizations;
      assert.equal(authorizations.length, 1);
      const authorization = authorizations[0];
      assert.equal(authorization.id, prepared.authorization_id);
      assert.equal(authorization.user_id, ctx.userId);
      assert.equal(authorization.kind, 'time_block_delete');
      assert.deepEqual(JSON.parse(authorization.object_ids), [blockId, ...taskIds]);
      assert.match(authorization.consequence_hash, /^[a-f0-9]{64}$/);
      assert.equal(authorization.consumed_at, null);
      assert.equal(Date.parse(authorization.expires_at) - Date.parse(authorization.created_at), 86_400_000);
      assert.equal(prepared.expires_at, authorization.expires_at);
    });
    await ctx.check('unconfirmed call leaves block/tasks unchanged with zero deletion events or door receipts', () => {
      const first = ctx.turns[0];
      assert.deepEqual(first.tables.time_blocks, [ctx.state.originalBlock]);
      assert.deepEqual([...first.tables.tasks].sort((a, b) => a.id.localeCompare(b.id)), ctx.state.originalTasks);
      assert.equal(first.tables.events.filter(row => row.verb === 'time_block_deleted').length, 0);
      assert.equal(first.tables.operation_batches.length, 0);
      assert.equal(first.api.receipts.length, 0);
    });
    await ctx.check('confirmed call deletes only the block, unbinds retained tasks and consumes the same authorization', () => {
      const confirmed = ctx.turns[1];
      const result = results(confirmed)[0];
      assert.equal(result.message, 'Time block deleted');
      assert.equal(result.deleted_block_id, blockId);
      assert.deepEqual(result.unbound_task_ids, taskIds);
      assert.deepEqual(confirmed.tables.time_blocks, []);
      assert.deepEqual([...confirmed.tables.tasks].sort((a, b) => a.id.localeCompare(b.id)),
        ctx.state.originalTasks.map((task: Row) => ({ ...task, time_block_id: null })));
      assert.equal(confirmed.tables.agent_authorizations.length, 1);
      assert.equal(confirmed.tables.agent_authorizations[0].id, results(ctx.turns[0])[0].authorization_id);
      assert.ok(confirmed.tables.agent_authorizations[0].consumed_at);
    });
    await ctx.check('deletion event ledger and applied door receipt reconcile exact confirmation and affected resources', () => {
      const confirmed = ctx.turns[1];
      const result = results(confirmed)[0];
      const events = confirmed.tables.events.filter(row => row.verb === 'time_block_deleted');
      assert.equal(events.length, 1);
      const event = events[0];
      assert.equal(event.user_id, ctx.userId);
      assert.equal(event.actor_kind, 'human');
      assert.equal(event.channel, 'chat');
      assert.deepEqual(JSON.parse(event.objects), [{ kind: 'time_block', id: blockId }, ...taskIds.map(id => ({ kind: 'task', id }))]);
      const authorization = confirmed.tables.agent_authorizations[0];
      assert.deepEqual(JSON.parse(event.meta), {
        via: 'chat', conversation_id: ctx.conversationId, tool: 'delete_time_block',
        authorization_id: authorization.id, user_confirmation_anchor: confirmation,
        consequence_hash: authorization.consequence_hash, block_count: 1, affected_task_count: 2,
      });
      assert.equal(confirmed.ledger.filter(row => row.seq === event.seq && row.verb === event.verb).length, 1);
      assert.equal(confirmed.tables.operation_batches.length, 1);
      const receipt = confirmed.tables.operation_batches[0];
      assert.equal(receipt.id, result.receipt_id);
      assert.equal(receipt.source_type, 'agent_chat');
      assert.equal(receipt.status, 'applied');
      const metadata = JSON.parse(receipt.metadata);
      assert.equal(metadata.tool, 'delete_time_block');
      assert.equal(metadata.agent_context.conversation_id, ctx.conversationId);
      assert.equal(metadata.agent_context.event_seq, event.seq);
      assert.deepEqual(metadata.resources, [
        { kind: 'time_block', id: blockId, outcome: 'deleted', before: ctx.state.originalBlock },
        ...taskIds.map(id => ({ kind: 'task', id, outcome: 'unbound', before: { time_block_id: blockId } })),
      ]);
      assert.equal(confirmed.api.receipts.filter(row => row.id === receipt.id).length, 1);
      assert.equal(hasAgentActionRevert('delete_time_block'), true);
    });
    await ctx.check('existing human receipt API actually restores block and bindings without resetting consumed authorization', async () => {
      const result = results(ctx.turns[1])[0];
      const response = await ctx.request(`/api/tool-receipts/${result.receipt_id}/revert`, {}, 'POST');
      assert.equal(response.status, 200);
      assert.equal(response.body.status, 'reverted');
      assert.deepEqual(ctx.db.prepare('SELECT * FROM time_blocks WHERE user_id = ? ORDER BY id').all(ctx.userId), [ctx.state.originalBlock]);
      assert.deepEqual(ctx.db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id').all(ctx.userId), ctx.state.originalTasks);
      const authorization = ctx.db.prepare('SELECT consumed_at FROM agent_authorizations WHERE id = ?')
        .get(results(ctx.turns[0])[0].authorization_id) as Row;
      assert.ok(authorization.consumed_at);
      assert.equal((ctx.db.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND verb = 'rolled_back'")
        .get(ctx.userId) as Row).n, 1);
    });
  },
} satisfies Scenario;
