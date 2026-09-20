import assert from 'node:assert/strict';
import noteBlockRoutes from '../../../src/routes/noteBlocks.js';
import { errorHandler } from '../../../src/middleware/errorHandler.js';
import { answer, results, tool } from '../helpers.js';
import { invoke, RecordedResponse } from '../routes.js';
import type { Fixtures, Row, Scenario } from '../types.js';

const noteId = 'eval-patch-note';
const blockId = 'eval-patch-block';
const original = ['北宋建于 960 年。', '南宋建于 1127 年。'];
const proposed = ['北宋于 960 年建立。', '南宋于 1127 年建立。'];
function blockBody(first = original[0], second = original[1]) {
  const plain_text = `${first}\n${second}`;
  return { plain_text, content_json: { body: plain_text, text_flow: {
    textflow_version: 'TextBlockContentV1', inline_structures: [], metadata: {},
    units: [first, second].map((text, index) => ({ id: `eval-u${index + 1}`, text, writing_role: 'paragraph',
      indent_level: 0, order_index: index, metadata: {}, status: 'active' })),
  } } };
}
function readBlock(ctx: Fixtures): Row {
  return ctx.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId) as Row;
}
async function humanSave(ctx: Fixtures, baseRevision: number, first: string, second: string,
  proposalPatch?: { proposal_id: string; patch_index: number }) {
  // Existing human HTTP handler, same atomic text-save door used by UI history replay.
  try {
    return await invoke(noteBlockRoutes, 'PUT', `/${blockId}/text-save`, ctx.userId, {
      note_id: noteId, base_revision: baseRevision, block: blockBody(first, second),
      annotations: { range_updates: [] }, text_ranges: [], ...(proposalPatch ? { proposal_patch: proposalPatch } : {}),
    });
  } catch (error) {
    // invoke exposes the handler only; complete its normal Express error path with the real middleware.
    const response = new RecordedResponse();
    errorHandler(error as Error, {} as Parameters<typeof errorHandler>[1],
      response as unknown as Parameters<typeof errorHandler>[2], () => {});
    return response;
  }
}
function latestProposal(ctx: Fixtures): Row {
  return ctx.db.prepare("SELECT * FROM proposals WHERE user_id = ? AND type = 'note_patch' ORDER BY rowid DESC LIMIT 1")
    .get(ctx.userId) as Row;
}

export default {
  name: '10-note-patch-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    ctx.db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)')
      .run(noteId, ctx.userId, ctx.courseId, '合成宋史笔记');
    const body = blockBody();
    ctx.db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,?,'paragraph',?,?)")
      .run(blockId, ctx.userId, ctx.courseId, JSON.stringify(body.content_json), body.plain_text);
    ctx.db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,0)')
      .run('eval-patch-placement', noteId, blockId);
    ctx.state.originalBlock = readBlock(ctx);
  },
  turns: [
    {
      user: '请给选中段落的两句文字提出措辞修改，先留提案让我逐条看。',
      contextHint: { type: 'note_view', data: { note_id: noteId, selection: { note_id: noteId, block_ids: [blockId] } } },
      *script(ctx) {
        if (ctx.round === 0) yield* tool('patch-two-units', 'create_proposal', { type: 'note_patch', data: {
          note_id: noteId, patches: proposed.map((new_text, index) => ({ block_id: blockId, unit_id: `eval-u${index + 1}`, new_text })),
        } });
        else yield* answer('修改提案已登记，请在提案收件箱逐条查看旧文与新文。');
      },
    },
    {
      user: '我在收件箱采纳第一条、丢弃第二条，然后检查撤销和重做。',
      *script() { yield* answer('请在提案收件箱逐条处理，文字修改会进入笔记的撤销栈。'); },
    },
    {
      user: '再给第一句提一条措辞建议，我会先自己改字，再检查旧建议是否失效。',
      *script(ctx) {
        if (ctx.round === 0) yield* tool('patch-conflict', 'create_proposal', { type: 'note_patch', data: {
          note_id: noteId, patches: [{ block_id: blockId, unit_id: 'eval-u1', new_text: '北宋立国于 960 年。' }],
        } });
        else yield* answer('新的修改提案已登记，待你逐条处理。');
      },
    },
  ],
  async afterTurn(ctx, index) {
    if (index === 0) {
      ctx.state.firstProposal = latestProposal(ctx);
    } else if (index === 1) {
      const id = ctx.state.firstProposal.id;
      const applied = await humanSave(ctx, 0, proposed[0], original[1], { proposal_id: id, patch_index: 0 });
      ctx.state.apply = { status: applied.statusCode, response: applied.body, block: readBlock(ctx),
        proposal: await ctx.request(`/api/proposals/${id}`) };
      const beforeDiscard = readBlock(ctx);
      const discarded = await ctx.request(`/api/proposals/${id}/patches/1/discard`, {});
      ctx.state.discard = { response: discarded, before: beforeDiscard, after: readBlock(ctx),
        proposal: await ctx.request(`/api/proposals/${id}`) };
      const undone = await humanSave(ctx, 1, original[0], original[1]);
      ctx.state.undo = { status: undone.statusCode, response: undone.body, block: readBlock(ctx) };
      const redone = await humanSave(ctx, 2, proposed[0], original[1]);
      ctx.state.redo = { status: redone.statusCode, response: redone.body, block: readBlock(ctx) };
      // Extra scenario diagnostics survive JSON serialization; application messages are unchanged.
      (ctx.turns[index] as unknown as Row).humanActions = {
        apply: ctx.state.apply, discard: ctx.state.discard, undo: ctx.state.undo, redo: ctx.state.redo,
      };
    } else {
      const proposal = latestProposal(ctx);
      ctx.state.conflictBefore = { proposal: await ctx.request(`/api/proposals/${proposal.id}`), block: readBlock(ctx) };
      const humanText = '我自己把北宋建立年份写成 960 年。';
      const edited = await humanSave(ctx, 3, humanText, original[1]);
      const changedBlock = readBlock(ctx);
      const stale = await ctx.request(`/api/proposals/${proposal.id}`);
      const attempted = await humanSave(ctx, 4, '北宋立国于 960 年。', original[1], { proposal_id: proposal.id, patch_index: 0 });
      ctx.state.conflict = { editStatus: edited.statusCode, stale, attemptStatus: attempted.statusCode,
        beforeAttempt: changedBlock, afterAttempt: readBlock(ctx) };
      const beforeDiscard = readBlock(ctx);
      const discarded = await ctx.request(`/api/proposals/${proposal.id}/discard`, {});
      ctx.state.fullDiscard = { response: discarded, before: beforeDiscard,
        proposal: await ctx.request(`/api/proposals/${proposal.id}`), after: readBlock(ctx) };
      (ctx.turns[index] as unknown as Row).humanActions = {
        conflictBefore: ctx.state.conflictBefore, conflict: ctx.state.conflict, fullDiscard: ctx.state.fullDiscard,
      };
    }
  },
  async assertions(ctx) {
    await ctx.check('Agent proposal freezes both old/new unit diffs and leaves note text unchanged while pending', () => {
      const turn = ctx.turns[0];
      const result = results(turn)[0];
      assert.equal(result.type, 'note_patch'); assert.equal(result.status, 'pending');
      assert.equal(turn.api.proposals.length, 1);
      const proposal = turn.api.proposals[0];
      assert.equal(proposal.status, 'pending');
      assert.deepEqual(proposal.data.patches.map((patch: Row) => [patch.old_text, patch.new_text, patch.status]),
        original.map((text, index) => [text, proposed[index], 'pending']));
      assert.deepEqual(turn.tables.note_blocks, [ctx.state.originalBlock]);
      assert.deepEqual(turn.tables.operation_batches, []);
    });
    await ctx.check('human text-save accepts one unit only and the remaining patch stays pending', () => {
      const { apply } = ctx.state;
      assert.equal(apply.status, 200); assert.equal(apply.response.revision, 1);
      assert.equal(apply.block.plain_text, blockBody(proposed[0], original[1]).plain_text);
      assert.equal(apply.proposal.status, 200); assert.equal(apply.proposal.body.status, 'pending');
      assert.deepEqual(apply.proposal.body.data.patches.map((patch: Row) => patch.status), ['applied', 'pending']);
    });
    await ctx.check('discarding the remaining patch resolves the partial proposal without changing any block bytes', () => {
      const { discard } = ctx.state;
      assert.equal(discard.response.status, 200);
      assert.deepEqual(discard.after, discard.before);
      assert.equal(discard.proposal.body.status, 'applied');
      assert.deepEqual(discard.proposal.body.data.patches.map((patch: Row) => patch.status), ['applied', 'discarded']);
    });
    await ctx.check('human undo/redo replays exact text snapshots through the real text-save handler with consecutive revisions', () => {
      const { undo, redo } = ctx.state;
      assert.equal(undo.status, 200); assert.equal(undo.response.revision, 2);
      assert.equal(undo.block.plain_text, blockBody().plain_text);
      assert.deepEqual(JSON.parse(undo.block.content_json), blockBody().content_json);
      assert.equal(redo.status, 200); assert.equal(redo.response.revision, 3);
      assert.equal(redo.block.plain_text, blockBody(proposed[0], original[1]).plain_text);
      assert.deepEqual(JSON.parse(redo.block.content_json), blockBody(proposed[0], original[1]).content_json);
    });
    await ctx.check('an intervening human save makes the next diff stale and rejects acceptance without overwriting text', () => {
      const { conflictBefore, conflict } = ctx.state;
      assert.equal(conflictBefore.proposal.body.data.patches[0].status, 'pending');
      assert.equal(conflict.editStatus, 200);
      assert.equal(conflict.stale.status, 200);
      assert.equal(conflict.stale.body.data.patches[0].status, 'stale');
      assert.equal(conflict.attemptStatus, 409);
      assert.deepEqual(conflict.afterAttempt, conflict.beforeAttempt);
    });
    await ctx.check('discarding a stale proposal leaves current human text untouched', () => {
      const { fullDiscard } = ctx.state;
      assert.equal(fullDiscard.response.status, 200);
      assert.deepEqual(fullDiscard.after, fullDiscard.before);
      assert.equal(fullDiscard.proposal.body.status, 'discarded');
    });
    await ctx.check('only proposal creation appears in Agent tool receipts, with zero claim_without_receipt flags', () => {
      assert.deepEqual(ctx.turns.map(turn => turn.events.filter(event => event.type === 'tool_end').map(event => event.data.name)),
        [['create_proposal'], [], ['create_proposal']]);
      assert.ok(ctx.turns.every(turn => turn.events.filter(event => event.type === 'tool_end').every(event => event.data.ok)));
      assert.equal(ctx.turns.at(-1)!.tables.events.filter(event => event.verb === 'claim_without_receipt').length, 0);
    });
  },
} satisfies Scenario;
