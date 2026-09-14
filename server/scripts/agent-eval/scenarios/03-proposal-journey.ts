import assert from 'node:assert/strict';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../../../src/services/courseMaterials.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const documentId = '33333333-3333-4333-8333-333333333333';
const noteTitle = '极限整理笔记';
const sourceText = '极限描述自变量接近给定值时，函数值趋近的值。';

export default {
  name: '03-proposal-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    // Parsed synthetic material, using the real material/segment builder. No files or remote parser.
    ctx.db.prepare(`INSERT INTO documents
      (id,user_id,course_id,filename,file_path,file_type,parse_status,extracted_text,page_count,document_type,chunk_count)
      VALUES (?,?,?,?,?,'pdf','completed',?,1,'slides',1)`)
      .run(documentId, ctx.userId, ctx.courseId, 'synthetic-limits.pdf', 'synthetic/limits.pdf', sourceText);
    ctx.db.prepare(`INSERT INTO document_chunks
      (id,document_id,chunk_index,content,page_start,page_end,heading) VALUES (?,?,0,?,1,1,'极限')`)
      .run('eval-limits-chunk', documentId, sourceText);
    for (const material of listCourseMaterials(ctx.db, ctx.userId, ctx.courseId) as Row[]) {
      ensureSegmentsForMaterial(ctx.db, ctx.userId, material.id);
    }
    ctx.state.nestedGenerationCalls = 0;
  },
  turns: [{
    user: ctx => `为项目 ${ctx.courseId} 的材料 ${documentId} 生成 organized_note 提案，标题“${noteTitle}”，留在提案收件箱等待我采纳。`,
    script(ctx) {
      if (ctx.definitions.length === 0) {
        ctx.state.nestedGenerationCalls++;
        // Only the provider response is synthetic; organizedNoteProposals still validates,
        // attaches real source references, persists pending data and records issuance.
        return answer(JSON.stringify({ blocks: [{ block_type: 'paragraph', template_id: 'text.paragraph',
          learning_role: 'note', title: '极限', content_json: { body: sourceText },
          plain_text: sourceText, confidence: 0.8, warnings: [] }] }));
      }
      return ctx.round === 0
        ? tool('proposal-call', 'create_proposal', { type: 'organized_note',
          data: { course_id: ctx.courseId, document_ids: [documentId], note_title: noteTitle } })
        : answer('已创建整理笔记提案，请在提案收件箱查看并采纳。');
    },
  }],
  async assertions(ctx) {
    const turn = ctx.turns[0];
    await ctx.check('organized_note pending data comes from the real service with source references', () => {
      const result = results(turn).find(row => row.type === 'organized_note');
      assert.ok(result);
      assert.equal(result.status, 'pending');
      assert.equal(result.course_id, ctx.courseId);
      assert.equal(result.receipt_id, undefined);
      assert.equal(turn.tables.proposals.length, 1);
      const proposal = turn.tables.proposals[0];
      assert.equal(proposal.id, result.id);
      assert.equal(proposal.type, 'organized_note');
      assert.equal(proposal.status, 'pending');
      assert.equal(proposal.resolved_at, null);
      assert.equal(proposal.user_id, ctx.userId);
      assert.equal(proposal.conversation_id, ctx.conversationId);
      const data = JSON.parse(proposal.data);
      assert.equal(data.title, noteTitle);
      assert.equal(data.proposal_kind, 'organized_note');
      assert.equal(data.course_id, ctx.courseId);
      assert.equal(data.blocks.length, result.blocks_count);
      assert.ok(data.blocks.length > 0);
      assert.ok(data.blocks.every((block: Row) => block.source_references.length > 0
        && block.source_references.every((reference: Row) => reference.document_id === documentId)));
      if (ctx.mode === 'scripted') {
        assert.equal(ctx.state.nestedGenerationCalls, 1);
        assert.equal(data.generation_mode, 'ai');
        assert.equal(data.blocks.length, 1);
        assert.equal(data.blocks[0].plain_text, sourceText);
      }
    });
    await ctx.check('proposal_issued ledger event identifies the pending object and chat conversation', () => {
      assert.equal(turn.tables.events.length, 1);
      const event = turn.tables.events[0];
      assert.equal(event.verb, 'proposal_issued');
      assert.equal(event.actor_kind, 'agent');
      assert.equal(event.channel, 'chat');
      assert.equal(event.user_id, ctx.userId);
      assert.deepEqual(JSON.parse(event.objects), [{ kind: 'proposal', id: turn.tables.proposals[0].id }]);
      assert.equal(JSON.parse(event.meta).proposal_type, 'organized_note');
      assert.equal(JSON.parse(event.meta).conversation_id, ctx.conversationId);
    });
    await ctx.check('existing inbox list and detail APIs expose the same pending proposal', async () => {
      assert.equal(turn.api.proposals.length, 1);
      const inbox = turn.api.proposals[0];
      const stored = turn.tables.proposals[0];
      assert.equal(inbox.id, stored.id);
      assert.equal(inbox.status, 'pending');
      assert.equal(inbox.conversation_id, ctx.conversationId);
      assert.deepEqual(inbox.data, JSON.parse(stored.data));
      const detail = await ctx.request(`/api/proposals/${stored.id}`);
      assert.equal(detail.status, 200);
      assert.equal(detail.body.id, stored.id);
      assert.deepEqual(detail.body.data, inbox.data);
    });
    await ctx.check('channel-write SSE and history receipt report proposal creation only', () => {
      assert.equal(turn.events.filter(event => event.type === 'error').length, 0);
      const ends = turn.events.filter(event => event.type === 'tool_end' && event.data.name === 'create_proposal');
      assert.equal(ends.length, 1);
      assert.equal(ends[0].data.ok, true);
      assert.deepEqual(turn.events.filter(event => event.type === 'tool_start' && event.data.id === ends[0].data.id)
        .map(event => event.data), [{ id: ends[0].data.id, name: 'create_proposal' }]);
      const receipts = turn.events.filter(event => event.type === 'turn_receipt');
      assert.equal(receipts.length, 1);
      assert.deepEqual(receipts[0].data.write_calls, [{ name: 'create_proposal', ok: true }]);
      assert.equal(receipts[0].data.write_ok_count, 1);
      assert.equal(receipts[0].data.write_fail_count, 0);
      assert.deepEqual(turn.api.history.filter(row => row.turn_receipt).map(row => row.turn_receipt), [receipts[0].data]);
    });
    await ctx.check('pending proposal does not directly write notes, blocks, placements or door receipts', () => {
      for (const table of ['notes', 'note_blocks', 'note_block_placements', 'operation_batches']) {
        assert.deepEqual(turn.tables[table], [], table);
        assert.equal((ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as Row).n, 0, table);
      }
      assert.deepEqual(turn.api.receipts, []);
      assert.equal((ctx.db.prepare("SELECT status FROM proposals WHERE id = ?").get(turn.tables.proposals[0].id) as Row).status, 'pending');
    });
  },
} satisfies Scenario;
