import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import { NOTE_BLOCK_TEMPLATES, inferNoteBlockTemplateMetadata } from '../lib/noteBlockTemplates.js';
import { createNoteBlockSchema, noteBlockTypeSchema } from '../validators/index.js';
import { BUILTIN_COMPONENT_PARAMS_SCHEMAS, COMPONENT_MAX_TEXT_LENGTH, componentBlockContentSchema } from '../validators/componentBlock.js';
import { createClientNoteBlock, discardClientNoteBlockCreate } from '../services/noteBlockLifecycle.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { hydrateBlock } from '../services/noteHydration.js';
import { listNoteBlocks } from '../services/notes.js';
import { componentBlockPlainText } from '../services/componentBlocks.js';
import { readNoteForAgent } from '../services/agentReadSurfaces.js';
import { TOOL_REGISTRY } from '../toolFace/registry.js';
import { assertCoverResident } from '../services/noteCoverRules.js';

// Self-cast positive fixtures: 13 entries and a three-period/two-series comparison.
const songTimeline = { component_kind: 'timeline', params: {
  title: '宋初年表 960–997', entries: [
    { year: '960', label: '北宋建立', detail: '赵匡胤即位' },
    { year: '961', label: '整顿禁军', detail: '集中军事指挥' },
    { year: '963', label: '荆湖归宋' },
    { year: '965', label: '后蜀归宋' },
    { year: '969', label: '北伐北汉' },
    { year: '971', label: '南汉归宋' },
    { year: '974', label: '进军江南' },
    { year: '975', label: '南唐归宋' },
    { year: '976', label: '太宗即位' },
    { year: '978', label: '吴越纳土' },
    { year: '979', label: '北汉归宋' },
    { year: '986', label: '雍熙北伐' },
    { year: '997', label: '真宗即位' },
  ],
} };
const songChart = { component_kind: 'chart_bar', params: {
  title: '岁入的换血', x_labels: ['宋初', '中期', '后期'], y_label: '示意份额',
  series: [{ name: '农业', values: [70, 55, 40] }, { name: '商税', values: [30, 45, 60] }],
} };
const unknown = { component_kind: 'future_diagram', params: { title: 'Retained', points: [1, 2] } };

async function fixture() {
  const db = await initDb(':memory:');
  const userId = 'component-user';
  const courseId = randomUUID();
  const noteId = randomUUID();
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(userId, 'component@local.invalid', 'synthetic', 'Component test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Song history');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(noteId, userId, courseId, '宋史组件');
  const create = (content: Record<string, unknown> = songTimeline, key = 'component-create') => {
    const result = createClientNoteBlock(db, userId, noteId, courseId, {
      client_create_key: key, block_type: 'component', content_json: content,
    });
    assert.equal(result.status, 'applied');
    if (result.status !== 'applied') throw new Error('Expected a component');
    return result;
  };
  return { db, userId, courseId, noteId, create };
}

test('component is the fourth family with precisely three manual built-in templates and aligned shared definitions', async () => {
  const { NOTE_BLOCK_TEMPLATES: shared } = await import(new URL('../../../shared/types/index.ts', import.meta.url).href);
  const templates = NOTE_BLOCK_TEMPLATES.filter(entry => entry.legacy_block_type === 'component');
  assert.deepEqual(templates, shared.filter((entry: { legacy_block_type: string }) => entry.legacy_block_type === 'component'));
  assert.deepEqual(Object.keys(BUILTIN_COMPONENT_PARAMS_SCHEMAS), ['timeline', 'chart_bar', 'chart_line']);
  assert.deepEqual(templates.map(entry => entry.template_id), ['component.timeline', 'component.chart_bar', 'component.chart_line']);
  assert.equal(inferNoteBlockTemplateMetadata('component').system_type, 'component');
  assert.equal(noteBlockTypeSchema.parse('component'), 'component');
  for (const template of templates) assert.equal(componentBlockContentSchema.safeParse(template.default_content).success, true);
});

test('timeline params preserve order and optional fields while enforcing one to 64 entries', () => {
  for (const content of [songTimeline, { component_kind: 'timeline', params: { entries: [{ year: '', label: '' }] } },
    { component_kind: 'timeline', params: { entries: Array.from({ length: 64 }, (_, index) => ({ year: `${index}`, label: '' })) } },
  ]) assert.deepEqual(componentBlockContentSchema.parse(content), content);
  for (const params of [
    {}, { entries: [] }, { entries: Array.from({ length: 65 }, () => ({ year: '', label: '' })) },
    { entries: [{ year: 960, label: '宋' }] }, { entries: [{ year: '960' }] },
    { entries: [{ year: '960', label: '宋', detail: null }] },
    { entries: [{ year: '960', label: '宋', expanded: true }] },
    { ...songTimeline.params, expanded: true },
  ]) assert.equal(createNoteBlockSchema.safeParse({ block_type: 'component', content_json: { component_kind: 'timeline', params } }).success, false);
});

test('both chart kinds accept 1 to 4 series and 1 to 32 points with matching finite values', () => {
  for (const component_kind of ['chart_bar', 'chart_line']) {
    const boundary = { component_kind, params: { x_labels: Array(32).fill(''),
      series: Array.from({ length: 4 }, () => ({ name: '', values: Array.from({ length: 32 }, (_, index) => index - 10.5) })) } };
    assert.deepEqual(componentBlockContentSchema.parse(boundary), boundary);
    assert.equal(componentBlockContentSchema.safeParse({ ...songChart, component_kind }).success, true);
    for (const params of [
      { x_labels: [], series: [] }, { x_labels: ['A'], series: [] },
      { x_labels: ['A'], series: [{ name: 'S', values: [] }] },
      { x_labels: ['A'], series: [{ name: 'S', values: [1, 2] }] },
      { x_labels: ['A', 'B'], series: [{ name: 'S', values: [1] }] },
      { x_labels: ['A'], series: Array.from({ length: 5 }, () => ({ name: '', values: [1] })) },
      { x_labels: Array(33).fill(''), series: [{ name: '', values: Array(33).fill(0) }] },
      ...[Infinity, -Infinity, NaN, '1', null].map(value => ({ x_labels: ['A'], series: [{ name: 'S', values: [value] }] })),
      { ...songChart.params, legend: false },
      { x_labels: ['A'], series: [{ name: 'S', values: [1], color: 'accent' }] },
    ]) assert.equal(componentBlockContentSchema.safeParse({ component_kind, params }).success, false);
  }
});

test('known component text has the B1 65536 UTF-16 budget across all domain fields', () => {
  const timeline = { component_kind: 'timeline', params: { title: '题', entries: [
    { year: '年', label: '标', detail: '字'.repeat(COMPONENT_MAX_TEXT_LENGTH - 3) },
  ] } };
  assert.deepEqual(componentBlockContentSchema.parse(timeline), timeline);
  assert.equal(componentBlockContentSchema.safeParse({ ...timeline, params: { ...timeline.params, title: '标题' } }).success, false);
  const chart = { component_kind: 'chart_line', params: { title: '题', y_label: '轴', x_labels: ['期'],
    series: [{ name: '字'.repeat(COMPONENT_MAX_TEXT_LENGTH - 3), values: [0] }] } };
  assert.deepEqual(componentBlockContentSchema.parse(chart), chart);
  assert.equal(componentBlockContentSchema.safeParse({ ...chart, params: { ...chart.params, y_label: '纵轴' } }).success, false);
  assert.equal(componentBlockContentSchema.safeParse({ component_kind: 'timeline', params: {
    entries: [{ year: '', label: '😀'.repeat(COMPONENT_MAX_TEXT_LENGTH / 2) }],
  } }).success, true);
});

test('unknown kinds retain opaque object params and render a named placeholder projection', () => {
  assert.deepEqual(componentBlockContentSchema.parse(unknown), unknown);
  assert.equal(componentBlockPlainText(unknown), 'future_diagram\n未注册组件');
  for (const content of [{}, { params: {} }, { component_kind: '', params: {} }, { component_kind: ' ', params: {} },
    { component_kind: 'x'.repeat(129), params: {} }, { component_kind: 'future', params: [] },
    { component_kind: 'future', params: null }, { ...unknown, title: 'outside envelope' },
  ]) assert.equal(componentBlockContentSchema.safeParse(content).success, false);
});

test('the existing cover presentation classification excludes the new component family', () => {
  assert.throws(() => assertCoverResident('paragraph_block_projection', 'component',
    { system_type: 'component', template_id: 'component.timeline' }, songTimeline), /Cover pages accept/);
});

test('creation, replay, hydration and discard preserve timeline, both charts and unknown payloads', async () => {
  const f = await fixture();
  try {
    for (const content of [songTimeline, songChart, { ...songChart, component_kind: 'chart_line' }, unknown]) {
      const key = `create-${content.component_kind}`;
      const first = f.create(content, key);
      assert.deepEqual(hydrateBlock(first.block).content_json, content);
      assert.equal(hydrateBlock(first.block).metadata.system_type, 'component');
      const repeated = f.create(content, key);
      assert.equal(repeated.created, false);
      assert.equal(repeated.block.id, first.block.id);
      assert.deepEqual(listNoteBlocks({ userId: f.userId, noteId: f.noteId })[0].content_json, content);
      assert.equal(discardClientNoteBlockCreate(f.db, f.userId, f.noteId, f.courseId, key).discarded, true);
      assert.deepEqual(listNoteBlocks({ userId: f.userId, noteId: f.noteId }), []);
    }
  } finally { closeDb(); }
});

test('updates validate the stored component type and retain edits through trash, restore and undo-shaped updates', async () => {
  const f = await fixture();
  try {
    const first = f.create();
    const blockId = String(first.block.id);
    assert.throws(() => updateNoteBlockContent(f.db, f.userId, blockId,
      { content_json: { component_kind: 'timeline', params: { entries: [] } } }));
    assert.deepEqual(hydrateBlock(f.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId)).content_json, songTimeline);
    for (const content of [songChart, unknown, songTimeline]) {
      assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { content_json: content }).content_json, content);
      assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { title: 'History' }).content_json, content);
      updateNoteBlockContent(f.db, f.userId, blockId, { status: 'trashed' });
      assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { status: 'active' }).content_json, content);
    }
    assert.throws(() => f.create({ component_kind: 'chart_bar', params: {} }, 'bad-component'));
  } finally { closeDb(); }
});

test('read_note keeps component kind and only existing text keys for both positive specimens and unknown kinds', async () => {
  const f = await fixture();
  try {
    for (const content of [songTimeline, songChart, { ...songChart, component_kind: 'chart_line' }, unknown]) f.create(content, content.component_kind);
    const output = readNoteForAgent({ userId: f.userId, noteId: f.noteId });
    TOOL_REGISTRY.find(entry => entry.name === 'read_note')!.output_schema.parse(output);
    assert.equal(output.blocks.length, 4);
    for (const block of output.blocks) {
      assert.equal(block.kind, 'component');
      assert.deepEqual(Object.keys(block).sort(), ['id', 'kind', 'placement_id', 'role', 'text']);
    }
    assert.equal(output.blocks[0].text, ['宋初年表 960–997', ...songTimeline.params.entries.map(entry =>
      [entry.year, entry.label, ...(entry.detail !== undefined ? [entry.detail] : [])].join('\t'))].join('\n'));
    assert.equal(output.blocks[1].text, '岁入的换血\n示意份额\n宋初\t中期\t后期\n农业\t70\t55\t40\n商税\t30\t45\t60');
    assert.equal(output.blocks[2].text, output.blocks[1].text);
    assert.equal(output.blocks[3].text, 'future_diagram\n未注册组件');
  } finally { closeDb(); }
});

test('plain-text projections flatten embedded whitespace while retaining every timeline and chart label', () => {
  assert.equal(componentBlockPlainText({ component_kind: 'timeline', params: { title: '宋\r\n史',
    entries: [{ year: '960\t年', label: '北\n宋', detail: '建\r立' }] } }), '宋 史\n960 年\t北 宋\t建 立');
  assert.equal(componentBlockPlainText({ component_kind: 'chart_bar', params: {
    x_labels: ['时\t期'], series: [{ name: '系\n列', values: [-2.5] }],
  } }), '时 期\n系 列\t-2.5');
});

test('ordinary HTTP component create, update, reopen and delete use the existing NoteBlock routes', async () => {
  const f = await fixture();
  let server: Server | undefined;
  try {
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = f.userId; next(); });
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use(errorHandler);
    server = await new Promise<Server>(resolveServer => {
      const listener = app.listen(0, '127.0.0.1', () => resolveServer(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const request = async (method: string, path: string, body?: unknown, expected = 200) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
        method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      assert.equal(response.status, expected, `${method} ${path}`);
      return response.json() as Promise<any>;
    };
    const block = await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'component', content_json: songTimeline }, 201);
    assert.equal(block.metadata.system_type, 'component');
    assert.deepEqual(block.content_json, songTimeline);
    await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'component', content_json: { component_kind: 'timeline', params: {} } }, 400);
    await request('PUT', `/note-blocks/${block.id}`, { content_json: { component_kind: 'chart_line', params: {} } }, 400);
    for (const content_json of [songChart, unknown]) {
      assert.deepEqual((await request('PUT', `/note-blocks/${block.id}`, { content_json })).content_json, content_json);
      assert.deepEqual((await request('GET', `/notes/${f.noteId}/blocks`))[0].content_json, content_json);
    }
    await request('DELETE', `/note-blocks/${block.id}`);
    assert.deepEqual(await request('GET', `/notes/${f.noteId}/blocks`), []);
  } finally {
    if (server) await new Promise<void>((resolveServer, reject) => server!.close(error => error ? reject(error) : resolveServer()));
    closeDb();
  }
});
