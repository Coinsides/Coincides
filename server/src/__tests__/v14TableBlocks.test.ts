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
import { TABLE_MAX_TEXT_LENGTH, tableBlockContentSchema } from '../validators/tableBlock.js';
import { createClientNoteBlock, discardClientNoteBlockCreate } from '../services/noteBlockLifecycle.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { hydrateBlock } from '../services/noteHydration.js';
import { listNoteBlocks } from '../services/notes.js';
import { tableBlockPlainText } from '../services/tableBlocks.js';
import { readNoteForAgent } from '../services/agentReadSurfaces.js';
import { TOOL_REGISTRY } from '../toolFace/registry.js';
import { assertCoverResident } from '../services/noteCoverRules.js';

// Nine data rows / three columns: the B1 positive Song-history specimen.
const songTable = {
  caption: '熙宁新法表',
  headers: ['新法', '内容', '作用'],
  rows: [
    ['青苗法', '青黄不接时贷给农户钱粮', '减轻高利贷负担'],
    ['募役法', '纳钱代役并雇人服役', '调节差役负担'],
    ['方田均税法', '丈量土地并按肥瘠定税', '整顿田赋'],
    ['农田水利法', '兴修水利并鼓励垦田', '改善农业生产'],
    ['市易法', '设市易务收购滞销货物', '稳定市场流通'],
    ['均输法', '按需求与价格调配采购', '节省运输成本'],
    ['保甲法', '编户为保并组织训练', '加强基层组织'],
    ['保马法', '由民户养马并给予补助', '补充军马'],
    ['将兵法', '固定将领与部队隶属', '改善军事训练'],
  ],
};

async function fixture() {
  const db = await initDb(':memory:');
  const userId = 'table-user';
  const courseId = randomUUID();
  const noteId = randomUUID();
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(userId, 'table@local.invalid', 'synthetic', 'Table test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'Song history');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(noteId, userId, courseId, '熙宁新法');
  const create = (content: Record<string, unknown> = songTable, key = 'table-create') => {
    const result = createClientNoteBlock(db, userId, noteId, courseId, {
      client_create_key: key, block_type: 'table', content_json: content,
    });
    assert.equal(result.status, 'applied');
    if (result.status !== 'applied') throw new Error('Expected a table');
    return result;
  };
  return { db, userId, courseId, noteId, create };
}

test('table is a media template with an aligned shared definition and valid default payload', async () => {
  const { NOTE_BLOCK_TEMPLATES: shared } = await import(new URL('../../../shared/types/index.ts', import.meta.url).href);
  const template = NOTE_BLOCK_TEMPLATES.find(entry => entry.legacy_block_type === 'table');
  assert.deepEqual(template, shared.find((entry: { legacy_block_type: string }) => entry.legacy_block_type === 'table'));
  assert.equal(template?.system_type, 'media');
  assert.equal(inferNoteBlockTemplateMetadata('table').template_id, 'media.table');
  assert.equal(noteBlockTypeSchema.parse('table'), 'table');
  assert.equal(tableBlockContentSchema.safeParse(template?.default_content).success, true);
  assert.equal(createNoteBlockSchema.safeParse({ block_type: 'table', content_json: songTable }).success, true);
});

test('table dimensions allow a header-only or headerless grid and enforce a rectangular 64 by 64 boundary', () => {
  for (const content of [
    { headers: ['A'], rows: [] },
    { headers: [], rows: [['A']] },
    { headers: Array(64).fill(''), rows: Array.from({ length: 64 }, () => Array(64).fill('')) },
  ]) assert.equal(tableBlockContentSchema.safeParse(content).success, true);
  for (const content of [
    {}, { headers: [], rows: [] }, { headers: ['A'], rows: [[]] },
    { headers: ['A'], rows: [['one', 'two']] },
    { headers: [], rows: [['one', 'two'], ['one']] },
    { headers: Array(65).fill(''), rows: [] },
    { headers: ['A'], rows: Array.from({ length: 65 }, () => ['']) },
    { headers: ['A'], rows: [[3]] },
  ]) assert.equal(createNoteBlockSchema.safeParse({ block_type: 'table', content_json: content }).success, false);
});

test('the existing cover presentation rule accepts native media tables without a rule change', () => {
  assert.doesNotThrow(() => assertCoverResident('paragraph_block_projection', 'table',
    { system_type: 'media', template_id: 'media.table' }, songTable));
});

test('caption, headers and all cells share a 65536 UTF-16 code-unit budget without truncation', () => {
  const content = { caption: '表', headers: ['头'], rows: [['字'.repeat(TABLE_MAX_TEXT_LENGTH - 2)]] };
  assert.deepEqual(tableBlockContentSchema.parse(content), content);
  assert.equal(tableBlockContentSchema.safeParse({ ...content, caption: '表格' }).success, false);
  assert.equal(tableBlockContentSchema.safeParse({ headers: [], rows: [['😀'.repeat(TABLE_MAX_TEXT_LENGTH / 2)]] }).success, true);
  assert.equal(tableBlockContentSchema.safeParse({ headers: [], rows: [['😀'.repeat(TABLE_MAX_TEXT_LENGTH / 2) + '字']] }).success, false);
});

test('client creation, replay, hydration and discard preserve the native Song table payload', async () => {
  const f = await fixture();
  try {
    const first = f.create();
    assert.deepEqual(hydrateBlock(first.block).content_json, songTable);
    assert.equal(hydrateBlock(first.block).metadata.system_type, 'media');
    const repeated = f.create();
    assert.equal(repeated.created, false);
    assert.equal(repeated.block.id, first.block.id);
    const reopened = listNoteBlocks({ userId: f.userId, noteId: f.noteId });
    assert.deepEqual(reopened[0].content_json, songTable);
    assert.equal(reopened[0].content_json.rows.length, 9);
    assert.equal(reopened[0].content_json.headers.length, 3);
    assert.equal(discardClientNoteBlockCreate(f.db, f.userId, f.noteId, f.courseId, 'table-create').discarded, true);
    assert.deepEqual(listNoteBlocks({ userId: f.userId, noteId: f.noteId }), []);
  } finally { closeDb(); }
});

test('table updates validate against the stored block type and preserve valid edits through restore', async () => {
  const f = await fixture();
  try {
    const first = f.create();
    const blockId = String(first.block.id);
    assert.throws(() => updateNoteBlockContent(f.db, f.userId, blockId, { content_json: { headers: [], rows: [] } }));
    assert.deepEqual(hydrateBlock(f.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(blockId)).content_json, songTable);
    const edited = { caption: '新法对照', headers: [], rows: [['青苗法', '农户贷款'], ['市易法', '市场流通']] };
    assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { content_json: edited }).content_json, edited);
    assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { title: 'Comparison' }).content_json, edited);
    updateNoteBlockContent(f.db, f.userId, blockId, { status: 'trashed' });
    assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { status: 'active' }).content_json, edited);
    assert.deepEqual(updateNoteBlockContent(f.db, f.userId, blockId, { content_json: songTable }).content_json, songTable);
    assert.throws(() => f.create({ headers: ['A'], rows: [['one', 'two']] }, 'bad-table'));
  } finally { closeDb(); }
});

test('read_note uses the existing strict schema with kind table and caption/header/TSV text only', async () => {
  const f = await fixture();
  try {
    const created = f.create();
    const output = readNoteForAgent({ userId: f.userId, noteId: f.noteId });
    TOOL_REGISTRY.find(entry => entry.name === 'read_note')!.output_schema.parse(output);
    assert.equal(output.blocks[0].id, created.block.id);
    assert.equal(output.blocks[0].kind, 'table');
    assert.equal(output.blocks[0].text, ['熙宁新法表', '新法\t内容\t作用', ...songTable.rows.map(row => row.join('\t'))].join('\n'));
    assert.deepEqual(Object.keys(output.blocks[0]).sort(), ['id', 'kind', 'placement_id', 'role', 'text']);
  } finally { closeDb(); }
});

test('flattened table text has one line per table row and includes headerless cells', () => {
  assert.equal(tableBlockPlainText({ caption: 'Line\r\nbreak', headers: ['A\tB', 'C'], rows: [['one\ntwo', 'three\rfour']] }),
    'Line break\nA B\tC\none two\tthree four');
  assert.equal(tableBlockPlainText({ headers: [], rows: [['农田水利', '兴修水利']] }), '农田水利\t兴修水利');
});

test('ordinary HTTP table create, update and reopen use the existing NoteBlock routes', async () => {
  const f = await fixture();
  let server: Server | undefined;
  try {
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = f.userId; next(); });
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use(errorHandler);
    server = await new Promise<Server>((resolveServer) => {
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
    const block = await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'table', content_json: songTable }, 201);
    assert.equal(block.metadata.system_type, 'media');
    assert.deepEqual(block.content_json, songTable);
    await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'table', content_json: { headers: [], rows: [] } }, 400);
    await request('PUT', `/note-blocks/${block.id}`, { content_json: { headers: [], rows: [] } }, 400);
    const changed = { caption: 'Updated', headers: [], rows: [['农田水利法', '水利建设']] };
    assert.deepEqual((await request('PUT', `/note-blocks/${block.id}`, { content_json: changed })).content_json, changed);
    assert.deepEqual((await request('GET', `/notes/${f.noteId}/blocks`))[0].content_json, changed);
    await request('DELETE', `/note-blocks/${block.id}`);
    assert.deepEqual(await request('GET', `/notes/${f.noteId}/blocks`), []);
  } finally {
    if (server) await new Promise<void>((resolveServer, reject) => server!.close(error => error ? reject(error) : resolveServer()));
    closeDb();
  }
});
