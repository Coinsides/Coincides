import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteRoutes from '../routes/notes.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import { createNoteBlockSchema, noteBlockTypeSchema } from '../validators/index.js';
import { tocBlockContentSchema } from '../validators/tocBlock.js';
import { createClientNoteBlock, discardClientNoteBlockCreate } from '../services/noteBlockLifecycle.js';
import { updateNoteBlockContent } from '../services/noteBlockContent.js';
import { listNoteBlocks } from '../services/notes.js';
import { saveBlockCanvasPlacement, savePageFrameCollection } from '../services/canvasObjects.js';
import { getNoteBindingSettings, updateNoteBindingSettings } from '../services/noteBinding.js';
import { upgradeNoteBindingSettings } from '../services/noteBindingModel.js';
import { tocBlockPlainText } from '../services/tocBlocks.js';
import { readNoteForAgent } from '../services/agentReadSurfaces.js';
import { executeTool } from '../agent/tools/executor.js';
import { TOOL_REGISTRY } from '../toolFace/registry.js';

function content(text: string, role = 'heading_1') {
  return { text_flow: { textflow_version: 'TextBlockContentV1', units: [{
    id: 'tu-1', text, writing_role: role, order_index: 0, indent_level: 0, metadata: {}, status: 'active',
  }], inline_structures: [], metadata: {} } };
}

async function fixture(t: TestContext) {
  const db = await initDb(':memory:');
  t.after(closeDb);
  const userId = 'toc-user';
  const courseId = randomUUID();
  const noteId = randomUUID();
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(userId, 'toc@local.invalid', 'synthetic', 'TOC test');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, 'TOC project');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)').run(noteId, userId, courseId, '章节笔记');
  const create = (blockType = 'toc', body: Record<string, unknown> = {}, key: string = randomUUID()) => {
    const result = createClientNoteBlock(db, userId, noteId, courseId, {
      client_create_key: key, block_type: blockType, content_json: body,
    });
    assert.equal(result.status, 'applied');
    if (result.status !== 'applied') throw new Error('Expected a block');
    return result;
  };
  const read = (pageIndex = 0) => {
    const before = db.serialize();
    const output = readNoteForAgent({ userId, noteId, pageIndex });
    TOOL_REGISTRY.find(entry => entry.name === 'read_note')!.output_schema.parse(output);
    assert.deepEqual(db.serialize(), before);
    return output;
  };
  return { db, userId, courseId, noteId, create, read };
}

test('toc is a native projection block with only an empty content object', () => {
  assert.equal(noteBlockTypeSchema.parse('toc'), 'toc');
  assert.deepEqual(createNoteBlockSchema.parse({ block_type: 'toc' }).content_json, {});
  assert.deepEqual(tocBlockContentSchema.parse({}), {});
  assert.equal(tocBlockContentSchema.safeParse({ chapters: [] }).success, false);
  assert.equal(createNoteBlockSchema.safeParse({ block_type: 'toc', plain_text: '目录副本' }).success, false);
  assert.equal(createNoteBlockSchema.safeParse({ block_type: 'toc', title: '目录副本' }).success, false);
});

test('TOC creation, replay, update, restore and discard preserve zero chapter data and no text template', async t => {
  const f = await fixture(t);
  const created = f.create('toc', {}, 'toc-create');
  assert.equal(f.create('toc', {}, 'toc-create').created, false);
  assert.equal(f.create('toc', {}, 'toc-create').block.id, created.block.id);
  const block = listNoteBlocks({ userId: f.userId, noteId: f.noteId })[0];
  assert.equal(block.block_type, 'toc');
  assert.deepEqual(block.content_json, {});
  assert.equal(block.plain_text, null);
  assert.equal(block.title, null);
  assert.deepEqual(block.metadata, {});
  const id = String(created.block.id);
  assert.deepEqual(updateNoteBlockContent(f.db, f.userId, id, { content_json: {}, metadata: {} }).metadata, {});
  assert.throws(() => updateNoteBlockContent(f.db, f.userId, id, { content_json: { chapters: ['章一'] } }));
  assert.throws(() => updateNoteBlockContent(f.db, f.userId, id, { plain_text: '章一' }));
  updateNoteBlockContent(f.db, f.userId, id, { status: 'trashed' });
  assert.deepEqual(updateNoteBlockContent(f.db, f.userId, id, { status: 'active' }).content_json, {});
  const discarded = f.create('toc', {}, 'toc-discard');
  assert.equal(discardClientNoteBlockCreate(f.db, f.userId, f.noteId, f.courseId, 'toc-discard').discarded, true);
  assert.equal(listNoteBlocks({ userId: f.userId, noteId: f.noteId }).some(entry => entry.id === discarded.block.id), false);
});

test('flat TOC follows the A4 first live heading per block across heading levels and excludes deleted units', () => {
  const multi = content('已删除', 'heading');
  multi.text_flow.units[0].status = 'deleted';
  multi.text_flow.units.push({ ...multi.text_flow.units[0], id: 'tu-2', text: '第一\n章',
    writing_role: 'heading_1', order_index: 1, status: 'active' });
  multi.text_flow.units.push({ ...multi.text_flow.units[1], id: 'tu-3', text: '同块不重复', order_index: 2 });
  const inputs = [multi, content('第二节', 'heading_2'), content('第三层', 'heading_3'),
    content('旧标题角色', 'heading'), content('正文', 'paragraph')].map(content_json => ({ content_json }));
  assert.equal(tocBlockPlainText(inputs), '目录: 第一 章 / 第二节 / 第三层 / 旧标题角色');
  assert.equal(tocBlockPlainText([{ content_json: content('正文', 'paragraph') }]), '目录: 暂无章节');
  assert.equal(tocBlockPlainText([]), '目录: 暂无章节');
});

test('read_note returns current TOC flat text in the existing strict schema after chapter rename and removal', async t => {
  const f = await fixture(t);
  const toc = f.create();
  assert.equal(f.read().blocks[0].text, '目录: 暂无章节');
  const first = f.create('paragraph', content('章一'));
  f.create('paragraph', content('第二节', 'heading_2'));
  const projected = f.read().blocks.find(entry => entry.id === toc.block.id)!;
  assert.equal(projected.kind, 'toc');
  assert.equal(projected.text, '目录: 章一 / 第二节');
  assert.deepEqual(Object.keys(projected).sort(), ['id', 'kind', 'placement_id', 'role', 'text']);
  updateNoteBlockContent(f.db, f.userId, String(first.block.id), { content_json: content('重命名章') });
  assert.equal(f.read().blocks[0].text, '目录: 重命名章 / 第二节');
  updateNoteBlockContent(f.db, f.userId, String(first.block.id), { status: 'trashed' });
  assert.equal(f.read().blocks[0].text, '目录: 第二节');
  const stored = f.db.prepare('SELECT content_json,plain_text,title FROM note_blocks WHERE id=?').get(toc.block.id);
  assert.deepEqual(stored, { content_json: '{}', plain_text: null, title: null });
  const toolOutput = JSON.parse(await executeTool('read_note', { note_id: f.noteId }, f.userId));
  assert.equal(toolOutput.blocks[0].text, '目录: 第二节');
  TOOL_REGISTRY.find(entry => entry.name === 'read_note')!.output_schema.parse(toolOutput);
});

test('a paged TOC projects the whole current block sequence while excluding cover and outside-page headings', async t => {
  const f = await fixture(t);
  const frame = (id: string, y: number) => ({ id, x: 0, y, width: 800, height: 1100,
    contentInset: { top: 72, right: 72, bottom: 72, left: 72 }, exportable: true });
  const base = { pageFrames: [frame('content', 1200), frame('later', 2400)], primaryFrameId: 'content',
    selectedFrameId: 'content', pageStacks: [{ id: 'content-stack', frameIds: ['content', 'later'] }] };
  savePageFrameCollection(f.db, f.userId, f.noteId, base);
  const settings = upgradeNoteBindingSettings(getNoteBindingSettings(f.db, f.userId, f.noteId).binding_settings);
  settings.coverPage.frameId = 'cover';
  updateNoteBindingSettings(f.db, f.userId, f.noteId, settings, { ...base,
    pageFrames: [frame('cover', 0), ...base.pageFrames],
    pageStacks: [{ id: 'cover-stack', frameIds: ['cover'] }, ...base.pageStacks] });
  const place = (block: Record<string, unknown>, frameId: string, surface = 'formal_page', y = 0) =>
    saveBlockCanvasPlacement(f.db, f.userId, f.noteId, String(block.placement_id), {
      block_id: String(block.id), layout: { frame_id: frameId, x: 0, y, width: 300, height: 100,
        coordinate_space: 'page_frame_local', surface, boundary_role: 'inside', width_mode: 'manual' },
    });
  const toc = f.create(); place(toc.block, 'content');
  place(f.create('paragraph', content('封面标题')).block, 'cover');
  place(f.create('paragraph', content('章一')).block, 'later', 'formal_page', 200);
  place(f.create('paragraph', content('第二节', 'heading_2')).block, 'content', 'formal_page', 100);
  const outside = f.create('paragraph', content('纸外标题'));
  // Existing legacy layout reader's outside-page branch; no new coordinate contract.
  f.db.prepare('UPDATE note_block_placements SET display_overrides_json=? WHERE id=?')
    .run(JSON.stringify({ better_notebook_layout: { frame_id: 'later', surface: 'tray' } }), outside.block.placement_id);
  const output = f.read(1);
  assert.equal(output.blocks.find(entry => entry.id === toc.block.id)?.text, '目录: 章一 / 第二节');
  assert.equal(output.omitted_blocks.outside_page, 1);
  assert.equal(output.note.page_count, 3);
});

test('ordinary HTTP TOC create, update and reopen use existing NoteBlock doors with empty content', async t => {
  const f = await fixture(t);
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = f.userId; next(); });
  app.use('/api/notes', noteRoutes);
  app.use('/api/note-blocks', noteBlockRoutes);
  app.use(errorHandler);
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const request = async (method: string, path: string, body?: unknown, expected = 200) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    assert.equal(response.status, expected, `${method} ${path}`);
    return response.json() as Promise<any>;
  };
  const toc = await request('POST', `/notes/${f.noteId}/blocks`, { block_type: 'toc', content_json: {} }, 201);
  assert.equal(toc.block_type, 'toc');
  assert.deepEqual(toc.content_json, {});
  assert.deepEqual(toc.metadata, {});
  const updated = await request('PUT', `/note-blocks/${toc.id}`, { content_json: {}, metadata: {}, plain_text: null });
  assert.deepEqual(updated.content_json, {});
  assert.deepEqual(updated.metadata, {});
  const reopened = await request('GET', `/notes/${f.noteId}/blocks`);
  assert.equal(reopened[0].block_type, 'toc');
  assert.deepEqual(reopened[0].content_json, {});
  await request('DELETE', `/note-blocks/${toc.id}`);
  assert.deepEqual(await request('GET', `/notes/${f.noteId}/blocks`), []);
});
