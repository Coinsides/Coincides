import assert from 'node:assert/strict';
import boards from '../../../src/routes/boards.js';
import { conceptMap, boardSnapshot } from './07-board-concept-map.js';
import { invoke } from '../routes.js';
import type { Row, Scenario } from '../types.js';

const normalize = (value: unknown) => JSON.parse(JSON.stringify(value, (key, entry) =>
  ['created_at', 'updated_at'].includes(key) ? undefined : entry));

export default {
  ...conceptMap,
  name: '08-board-batch-revert',
  async assertions(ctx) {
    await conceptMap.assertions(ctx);
    const path = `/${ctx.state.boardId}/agent-batches/${ctx.conversationId}/revert`;
    await ctx.check('human batch API reverses all 9 stickies and 13 edges and preserves the original board', async () => {
      const response = await invoke(boards, 'POST', path, ctx.userId, {});
      assert.equal(response.statusCode, 200);
      const body = response.body as Row;
      assert.equal(body.batch_id, ctx.conversationId); assert.equal(body.status, 'reverted');
      assert.equal(body.receipt_ids.length, 22); assert.equal(new Set(body.receipt_ids).size, 22);
      assert.deepEqual(normalize(boardSnapshot(ctx)), normalize(ctx.state.before));
      (ctx.turns.at(-1)!.api as Row).batch_revert = body;
      Object.assign(ctx.turns.at(-1)!.tables, Object.fromEntries(Object.entries(boardSnapshot(ctx)).map(([key, rows]) => [`${key}_after_revert`, rows])));
    });
    await ctx.check('all 22 undo receipts match human rolled-back events and created-object removals', async () => {
      const response = await ctx.request('/api/tool-receipts?status=reverted');
      assert.equal(response.status, 200);
      const receipts = response.body.receipts ?? response.body;
      assert.equal(receipts.length, 22);
      const batches = ctx.db.prepare('SELECT * FROM operation_batches').all() as Row[];
      const rollbacks = ctx.db.prepare("SELECT * FROM events WHERE verb = 'rolled_back'").all() as Row[];
      assert.equal(rollbacks.length, 22);
      for (const batch of batches) {
        assert.equal(batch.status, 'reverted');
        const meta = JSON.parse(batch.metadata);
        assert.equal(meta.revert_outcome, 'complete'); assert.deepEqual(meta.revert_details.failed, []);
        assert.deepEqual(meta.revert_details.deleted, [meta.resources[0].id]);
        const event = rollbacks.find(row => row.seq === meta.revert_details.event_seq)!;
        assert.ok(event); assert.equal(event.actor_kind, 'human');
        assert.equal(JSON.parse(event.meta).receipt_id, batch.id);
        assert.equal(JSON.parse(event.meta).batch_id, ctx.conversationId);
      }
      (ctx.turns.at(-1)!.api as Row).reverted_receipts = receipts;
    });
    await ctx.check('identical second batch request rejects idempotently with zero new events or changes', async () => {
      const before = boardSnapshot(ctx), ledger = ctx.db.prepare('SELECT * FROM events').all();
      const batches = ctx.db.prepare('SELECT * FROM operation_batches').all();
      await assert.rejects(invoke(boards, 'POST', path, ctx.userId, {}), { statusCode: 409, message: 'board_agent_batch_not_applied' });
      assert.deepEqual(boardSnapshot(ctx), before);
      assert.deepEqual(ctx.db.prepare('SELECT * FROM events').all(), ledger);
      assert.deepEqual(ctx.db.prepare('SELECT * FROM operation_batches').all(), batches);
    });
  },
} satisfies Scenario;
