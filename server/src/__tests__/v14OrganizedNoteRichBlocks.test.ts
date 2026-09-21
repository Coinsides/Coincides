import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test, { type TestContext } from 'node:test';
import { initDb, closeDb } from '../db/init.js';
import { createNoteBlockSchema } from '../validators/index.js';
import { normalizeOrganizedNoteBlock, deterministicRichContent } from '../services/organizedNoteBlocks.js';
import { applyOrganizedNoteProposal } from '../services/organizedNoteProposals.js';
import { createProposal, HUMAN_PROPOSAL_CONTEXT } from '../services/proposals.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { ORGANIZED_NOTE_BASE_PROMPT, ORGANIZED_NOTE_GENERATION_PROMPT, ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT } from '../services/organizedNotePrompt.js';

const userId = 'rich-user';
const courseId = '11111111-1111-4111-8111-111111111111';
type Row = Record<string, any>;
const table = { headers: ['新法', '作用'], rows: [['青苗法', '借贷'], ['募役法', '差役']] };
const timeline = { component_kind: 'timeline', params: { entries: [{ year: '1069', label: '新法' }] } };
const chart = { x_labels: ['A', 'B'], series: [{ name: '数量', values: [1, 2] }] };
async function fixture(t: TestContext) {
  const db = await initDb(':memory:'); t.after(() => closeDb());
  db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,?,'synthetic','Rich blocks')").run(userId, 'rich@local.invalid');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, '宋史');
  return { db, normalize: (value: unknown, index = 0) => normalizeOrganizedNoteBlock(db, userId, value, index) };
}

test('all five families normalize with the exact human creation payload semantics', async t => {
  const { normalize } = await fixture(t);
  const specimens = [
    { block_type: 'table', content_json: table },
    { block_type: 'component', content_json: timeline },
    ...['chart_bar', 'chart_line'].map(component_kind => ({ block_type: 'component', content_json: { component_kind, params: chart } })),
    { block_type: 'toc', content_json: {} },
    { block_type: 'paragraph', plain_text: '原文', content_json: { body: '原文' }, display_overrides_json: { paragraph_furniture_v1: { variant: 'quote', source: '原书' } } },
    { block_type: 'paragraph', plain_text: '提示', display_overrides_json: { paragraph_furniture_v1: { variant: 'callout', label: '注意' } } },
    { block_type: 'heading', plain_text: '第一章' },
  ];
  for (const specimen of specimens) {
    assert.equal(createNoteBlockSchema.safeParse(specimen).success, true);
    const normalized = normalize(specimen);
    assert.deepEqual(normalized.warnings, []);
    assert.deepEqual(normalize(normalized), normalized, 'apply revalidation is idempotent');
    if (['table', 'component', 'toc'].includes(specimen.block_type)) {
      assert.equal(normalized.block_type, specimen.block_type);
      assert.deepEqual(normalized.content_json, specimen.content_json);
    }
  }
});

test('table and component limits match human validators at their exact accepted boundaries', async t => {
  const { normalize } = await fixture(t);
  const specimens = [
    { block_type: 'table', content_json: { headers: Array(64).fill(''), rows: Array.from({ length: 64 }, () => Array(64).fill('')) } },
    { block_type: 'table', content_json: { headers: [], rows: [['字'.repeat(65536)]] } },
    { block_type: 'component', content_json: { component_kind: 'timeline', params: { entries: Array.from({ length: 64 }, () => ({ year: '1', label: '' })) } } },
    { block_type: 'component', content_json: { component_kind: 'chart_bar', params: {
      x_labels: Array(32).fill('x'), series: Array.from({ length: 4 }, () => ({ name: '', values: Array(32).fill(1) })),
    } } },
  ];
  for (const specimen of specimens) {
    assert.equal(createNoteBlockSchema.safeParse(specimen).success, true);
    assert.equal(normalize(specimen).block_type, specimen.block_type);
    assert.deepEqual(normalize(specimen).warnings, []);
  }
});

test('invalid rich payloads downgrade without losing text and account for each failed block', async t => {
  const { normalize } = await fixture(t);
  const invalid = [
    { block_type: 'table', content_json: { headers: ['A'], rows: [['A', 'B']] } },
    { block_type: 'table', content_json: { headers: Array(65).fill('A'), rows: [] } },
    { block_type: 'table', content_json: { headers: [], rows: Array(65).fill(['A']) } },
    { block_type: 'table', content_json: { headers: [], rows: [['A'.repeat(65537)]] } },
    { block_type: 'component', content_json: { component_kind: 'timeline', params: { entries: Array(65).fill({ year: '1', label: 'A' }) } } },
    { block_type: 'component', content_json: { component_kind: 'timeline', params: { entries: [{ year: '1', label: 'A'.repeat(65536) }] } } },
    { block_type: 'component', content_json: { component_kind: 'chart_bar', params: { x_labels: ['A'], series: [{ name: 'N', values: [1, 2] }] } } },
    { block_type: 'component', content_json: { component_kind: 'chart_line', params: { x_labels: Array(33).fill('A'), series: [{ name: 'N', values: Array(33).fill(1) }] } } },
    { block_type: 'component', content_json: { component_kind: 'chart_bar', params: { x_labels: ['A'], series: Array(5).fill({ name: 'N', values: [1] }) } } },
    { block_type: 'toc', content_json: { entries: ['章'] } },
    { block_type: 'toc', content_json: {}, title: '目录正文' },
    { block_type: 'paragraph', display_overrides_json: { paragraph_furniture_v1: { variant: 'other' } } },
    { block_type: 'paragraph', display_overrides_json: { paragraph_furniture_v1: { variant: 'quote', source: 1 } } },
  ];
  for (const specimen of invalid) {
    assert.equal(createNoteBlockSchema.safeParse(specimen).success, false);
    const normalized = normalize({ ...specimen, plain_text: '完整原文' });
    assert.equal(normalized.block_type, 'paragraph'); assert.equal(normalized.plain_text, '完整原文');
    assert.equal(normalized.content_json.body, '完整原文'); assert.match(normalized.warnings.join('\n'), /downgraded to paragraph/);
  }
});

test('excluded families and unknown component envelopes cannot enter through type or template aliases', async t => {
  const { normalize } = await fixture(t);
  for (const block_type of ['media', 'item_ref', 'note_ref', 'quote', 'callout', 'other']) {
    const block = normalize({ block_type, plain_text: '保留原文' });
    assert.equal(block.block_type, 'paragraph'); assert.equal(block.plain_text, '保留原文');
    assert.match(block.warnings.join('\n'), /unsupported block_type/);
  }
  const unknown = normalize({ block_type: 'component', content_json: { component_kind: 'future', params: { label: '原文' } } });
  assert.equal(unknown.block_type, 'paragraph'); assert.match(unknown.plain_text, /原文/);
  assert.match(unknown.warnings.join('\n'), /unsupported component_kind/);
  assert.equal(normalize({ block_type: 'paragraph', template_id: 'media.image', plain_text: '原文' }).block_type, 'paragraph');
  const empty = normalize({ block_type: 'other' });
  assert.equal(empty.block_type, 'paragraph'); assert.ok(empty.warnings.length);
});

test('proposal appearance contains only furniture semantics and text headings survive apply normalization', async t => {
  const { normalize } = await fixture(t);
  const normalized = normalize({ block_type: 'heading', plain_text: '第一章', metadata: { fontFamily: 'custom' },
    content_json: { body: '第一章', fontSize: 24 }, display_overrides_json: { spacing: 24 } });
  assert.equal(normalized.metadata.fontFamily, undefined);
  assert.equal(normalized.content_json.fontSize, undefined);
  assert.deepEqual(normalized.display_overrides_json, {});
  assert.equal((normalize(normalized).content_json.text_flow as Row).units[0].writing_role, 'heading');
  for (const role of ['heading_1', 'heading_2', 'heading_3']) {
    const block = normalize({ block_type: 'paragraph', plain_text: '子章节', content_json: { text_flow: { units: [
      { text: '已删标题', writing_role: 'heading', status: 'deleted', order_index: 0 },
      { text: '子章节', writing_role: role, status: 'active', order_index: 1 },
    ] } } });
    assert.equal((normalize(block).content_json.text_flow as Row).units[0].writing_role, role);
  }
});

test('apply revalidates persisted payloads, writes placement furniture, persists warnings and supports existing trash/restore', async t => {
  const { db } = await fixture(t);
  const inputs = [
    { block_type: 'table', content_json: table }, { block_type: 'component', content_json: timeline },
    { block_type: 'component', content_json: { component_kind: 'chart_line', params: chart } },
    { block_type: 'toc', content_json: {} },
    { block_type: 'paragraph', plain_text: '引文', display_overrides_json: { paragraph_furniture_v1: { variant: 'quote', source: '史料' } } },
    { block_type: 'table', plain_text: '不齐的表格原文', content_json: { headers: ['A'], rows: [['A', 'B']] } },
  ].map((value, order_index) => ({ ...value, order_index, source_references: [], warnings: [] }));
  const proposal = createProposal(db, userId, { type: 'organized_note', context: HUMAN_PROPOSAL_CONTEXT,
    data: { proposal_kind: 'organized_note', course_id: courseId, title: '五族', description: '', source_material_ids: [], blocks: inputs, warnings: [] } });
  const row = db.prepare('SELECT * FROM proposals WHERE id=?').get(proposal.id) as any;
  const applied = db.transaction(() => applyOrganizedNoteProposal(db, userId, row))();
  const blocks = db.prepare(`SELECT b.*,p.display_overrides_json FROM note_blocks b JOIN note_block_placements p ON p.block_id=b.id
    WHERE p.note_id=? ORDER BY p.order_index`).all(applied.note_id) as Row[];
  assert.equal(blocks.length, inputs.length);
  assert.deepEqual(JSON.parse(blocks[0].content_json), table);
  assert.deepEqual(JSON.parse(blocks[1].content_json), timeline);
  assert.equal(JSON.parse(blocks[2].content_json).component_kind, 'chart_line');
  assert.equal(blocks[3].title, null); assert.equal(blocks[3].plain_text, null); assert.equal(blocks[3].content_json, '{}');
  assert.deepEqual(JSON.parse(blocks[4].display_overrides_json), { paragraph_furniture_v1: { variant: 'quote', source: '史料' } });
  assert.equal(blocks[5].block_type, 'paragraph'); assert.equal(blocks[5].plain_text, '不齐的表格原文');
  assert.ok(applied.warnings.some(warning => warning.includes('downgraded')));
  const stored = JSON.parse((db.prepare('SELECT data FROM proposals WHERE id=?').get(proposal.id) as Row).data);
  assert.deepEqual(stored.warnings, applied.warnings); assert.ok(stored.blocks[5].warnings.length);
  for (const block of blocks) {
    updateNoteBlockContent(db, userId, block.id, { status: 'trashed' });
    updateNoteBlockContent(db, userId, block.id, { status: 'active' });
    assert.equal((db.prepare('SELECT status FROM note_blocks WHERE id=?').get(block.id) as Row).status, 'active');
  }
});

test('deterministic source grammar preserves tabular, chronological, quote and caution content without a model', () => {
  const blocks = deterministicRichContent('| A | B |\n| --- | --- |\n| one | two |\n\n1069年：新法\n1072年：方田\n\n> 原文\n\n> [!NOTE]\n> 注意事项');
  assert.deepEqual(blocks.map(block => block.block_type), ['table', 'component', 'paragraph', 'paragraph']);
  assert.deepEqual(blocks[0].content_json, { headers: ['A', 'B'], rows: [['one', 'two']] });
  assert.match(JSON.stringify(blocks), /注意事项/);
});

test('T2 generator amendment removal recovers the original 569-byte SHA-256 without changing C2 prompt', () => {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(ORGANIZED_NOTE_BASE_PROMPT), '2a330527f4d46fff0f1e6bcde4fe308c10b667480a575026c7e6789042cc9274');
  assert.equal(Buffer.byteLength(ORGANIZED_NOTE_BASE_PROMPT), 569);
  assert.equal(ORGANIZED_NOTE_GENERATION_PROMPT.split(ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT).length, 2);
  assert.equal(hash(ORGANIZED_NOTE_GENERATION_PROMPT.replace(ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT, '')), hash(ORGANIZED_NOTE_BASE_PROMPT));
  for (const word of ['table', 'timeline', 'chart_bar', 'chart_line', 'quote', 'callout', 'toc', 'three or more chapters', 'human inbox apply']) {
    assert.ok(ORGANIZED_NOTE_RICH_BLOCK_AMENDMENT.includes(word), word);
  }
});
