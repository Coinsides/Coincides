import assert from 'node:assert/strict';
import { executeTool } from '../../../src/agent/tools/executor.js';
import { OpenAIProvider } from '../../../src/agent/providers/openai.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../../../src/services/courseMaterials.js';
import { tocBlockPlainText } from '../../../src/services/tocBlocks.js';
import type { Row, Scenario } from '../types.js';

const documentId = '44444444-4444-4444-8444-444444444444';
const table = '| 新法 | 作用 |\n| --- | --- |\n| 青苗法 | 调节借贷 |\n| 募役法 | 调节差役 |';
const chronology = '1069年：新法开始\n1072年：方田均税法';
const quotation = '> 以天下之财，供天下之费。\n\n> [!NOTE]\n> 比较施行背景。';

export default {
  name: '14-rich-block-pipeline', scriptedOnly: true,
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  async setup(ctx) {
    delete process.env.OPENAI_API_KEY;
    ctx.state.providerCalls = 0;
    ctx.mock.method(OpenAIProvider.prototype, 'chat', async function* () {
      ctx.state.providerCalls++;
      throw new Error('Rich-block fixture must use deterministic fallback');
    });
    ctx.db.prepare(`INSERT INTO documents
      (id,user_id,course_id,filename,file_path,file_type,parse_status,extracted_text,page_count,document_type,chunk_count)
      VALUES (?,?,?,?,?,'pdf','completed',?,3,'slides',3)`)
      .run(documentId, ctx.userId, ctx.courseId, 'synthetic-song.pdf', 'synthetic/song.pdf', [table, chronology, quotation].join('\n\n'));
    for (const [index, content] of [table, chronology, quotation].entries()) {
      ctx.db.prepare(`INSERT INTO document_chunks
        (id,document_id,chunk_index,content,page_start,page_end,heading) VALUES (?,?,?,?,?,?,?)`)
        .run(`rich-chunk-${index}`, documentId, index, content, index + 1, index + 1, ['新法对照', '施行时间', '财用摘录'][index]);
    }
    for (const material of listCourseMaterials(ctx.db, ctx.userId, ctx.courseId) as Row[]) {
      ensureSegmentsForMaterial(ctx.db, ctx.userId, material.id);
    }
    ctx.state.segmentIds = (ctx.db.prepare("SELECT id FROM material_segments WHERE segment_type='heading' ORDER BY order_index").all() as Row[]).map(row => row.id);
    ctx.state.result = JSON.parse(await executeTool('create_proposal', { type: 'organized_note',
      data: { course_id: ctx.courseId, segment_ids: ctx.state.segmentIds, note_title: '宋代财用' } }, ctx.userId,
    { actor: 'agent', channel: 'chat', conversationId: ctx.conversationId, callId: 'rich-proposal' }));
  },
  turns: [],
  async assertions(ctx) {
    const id = ctx.state.result.id;
    const pending = await ctx.request(`/api/proposals/${id}`);
    await ctx.check('zero provider turns; deterministic pending proposal spans all five families without note writes', () => {
      assert.equal(ctx.state.providerCalls, 0); assert.equal(ctx.turns.length, 0);
      assert.equal(pending.status, 200); assert.equal(pending.body.status, 'pending');
      assert.equal(pending.body.data.generation_mode, 'deterministic_fallback');
      const blocks = pending.body.data.blocks as Row[];
      for (const type of ['table', 'component', 'toc', 'paragraph']) assert.ok(blocks.some(block => block.block_type === type), type);
      assert.ok(blocks.some(block => block.display_overrides_json.paragraph_furniture_v1?.variant === 'quote'));
      assert.ok(blocks.some(block => block.display_overrides_json.paragraph_furniture_v1?.variant === 'callout'));
      for (const tableName of ['notes', 'note_blocks', 'note_block_placements', 'operation_batches']) {
        assert.equal((ctx.db.prepare(`SELECT count(*) AS n FROM ${tableName}`).get() as Row).n, 0);
      }
    });
    // A persisted, imperfect generated block exercises apply-time downgrade bookkeeping.
    const data = pending.body.data;
    data.blocks.push({ temp_id: 'unsupported', block_type: 'unsupported', plain_text: '保留这段材料',
      content_json: { body: '保留这段材料' }, order_index: data.blocks.length, source_references: [], warnings: [] });
    ctx.db.prepare('UPDATE proposals SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
    const applied = await ctx.request(`/api/proposals/${id}/apply`, {}, 'POST');
    await ctx.check('only human apply writes the note with native table/component/furniture and truth-free TOC rows', () => {
      assert.equal(applied.status, 200);
      const rows = ctx.db.prepare(`SELECT b.*,p.display_overrides_json FROM note_blocks b
        JOIN note_block_placements p ON p.block_id=b.id WHERE p.note_id=? ORDER BY p.order_index`).all(applied.body.note_id) as Row[];
      assert.equal(rows.length, data.blocks.length);
      const contents = (type: string) => rows.filter(row => row.block_type === type).map(row => JSON.parse(row.content_json));
      assert.deepEqual(contents('table'), [{ headers: ['新法', '作用'], rows: [['青苗法', '调节借贷'], ['募役法', '调节差役']] }]);
      assert.deepEqual(contents('component'), [{ component_kind: 'timeline', params: { entries: [
        { year: '1069', label: '新法开始' }, { year: '1072', label: '方田均税法' },
      ] } }]);
      const furniture = rows.map(row => JSON.parse(row.display_overrides_json).paragraph_furniture_v1).filter(Boolean);
      assert.deepEqual(furniture, [{ variant: 'quote', source: '' }, { variant: 'callout', label: '注意' }]);
      const toc = rows.find(row => row.block_type === 'toc')!;
      assert.deepEqual(JSON.parse(toc.content_json), {}); assert.equal(toc.title, null); assert.equal(toc.plain_text, null);
      assert.deepEqual(JSON.parse(toc.display_overrides_json), {});
      assert.equal((ctx.db.prepare('SELECT count(*) AS n FROM note_block_sources WHERE block_id=?').get(toc.id) as Row).n, 0);
      assert.equal(tocBlockPlainText(rows.map(row => ({ ...row, content_json: JSON.parse(row.content_json) }))), '目录: 新法对照 / 施行时间 / 财用摘录');
      const fallback = rows[rows.length - 1];
      assert.equal(fallback.block_type, 'paragraph'); assert.equal(fallback.plain_text, '保留这段材料');
      const stored = JSON.parse((ctx.db.prepare('SELECT data FROM proposals WHERE id=?').get(id) as Row).data);
      assert.match(stored.blocks[stored.blocks.length - 1].warnings.join('\n'), /unsupported.*downgraded/);
      assert.ok(applied.body.warnings.some((warning: string) => warning.includes('unsupported')));
      assert.equal(ctx.state.providerCalls, 0);
    });
    await ctx.check('discard remains the existing whole-proposal human action', async () => {
      const second = JSON.parse(await executeTool('create_proposal', { type: 'organized_note',
        data: { course_id: ctx.courseId, segment_ids: ctx.state.segmentIds } }, ctx.userId,
      { actor: 'agent', channel: 'chat', conversationId: ctx.conversationId, callId: 'rich-discard' }));
      const discarded = await ctx.request(`/api/proposals/${second.id}/discard`, {}, 'POST');
      assert.equal(discarded.status, 200);
      assert.equal((ctx.db.prepare('SELECT count(*) AS n FROM notes').get() as Row).n, 1);
    });
  },
} satisfies Scenario;
