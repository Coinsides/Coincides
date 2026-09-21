import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { type TestContext } from 'node:test';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import { loadToolFaceManifest } from '../mcp/manifest.js';
import { TOOL_REGISTRY } from '../toolFace/registry.js';
import { AppError } from '../middleware/errorHandler.js';
import { saveBlockCanvasPlacement, savePageFrameCollection } from '../services/canvasObjects.js';
import { createBoard, createBoardEdge, createBoardVisual, mountBoardMember } from '../services/boards.js';
import { upsertContentGroup } from '../services/contentGroups.js';
import { replaceNoteAnnotationTruths } from '../services/annotationTruths.js';
import { createItem } from '../services/items.js';
import { createRelation, getRelation, revokeRelation } from '../services/relations.js';
import { hasAgentActionRevert } from '../services/toolFaceReceiptRevert.js';
import { AGENT_BOARD_ENTRY_LIMIT, AGENT_NOTE_BLOCK_LIMIT } from '../services/agentReadSurfaces.js';
import {
  READ_ANNOTATION_LIMIT, READ_GROUP_LIMIT, READ_MEMBER_LIMIT, READ_RANGE_LIMIT,
  READ_RELATION_LIMIT, READ_RELATION_SCOPE_LIMIT, READ_SUMMARY_LENGTH,
} from '../services/agentReadKnowledge.js';

type Db = Awaited<ReturnType<typeof initDb>>;
type Row = Record<string, any>;
const USER = 'b1-user';
const OTHER = 'b1-other';
const names = ['read_note', 'read_board', 'read_content_groups', 'read_annotations_relations'] as const;

function seedNote(db: Db, courseId: string, title = 'Three page paper') {
  const id = randomUUID();
  db.prepare('INSERT INTO notes(id,user_id,course_id,title,page_format) VALUES(?,?,?,?,?)')
    .run(id, USER, courseId, title, 'a4_portrait');
  return id;
}

function seedBlock(db: Db, courseId: string, noteId: string, input: {
  id?: string; text?: string; kind?: string; role?: string; order?: number;
  content?: Row; metadata?: Row; frame?: string; x?: number; y?: number;
}) {
  const id = input.id ?? randomUUID();
  const placementId = randomUUID();
  const text = input.text ?? 'A paragraph';
  const content = input.content ?? { text_flow: { textflow_version: 1,
    units: [{ id: `${id}:unit`, text, writing_role: input.role ?? 'paragraph',
      indent_level: 0, order_index: 0, metadata: {}, status: 'active' }],
    inline_structures: [], metadata: {} } };
  db.prepare('INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text,metadata) VALUES(?,?,?,?,?,?,?)')
    .run(id, USER, courseId, input.kind ?? 'paragraph', JSON.stringify(content), text, JSON.stringify(input.metadata ?? {}));
  db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,?)')
    .run(placementId, noteId, id, input.order ?? 0);
  if (input.frame) saveBlockCanvasPlacement(db, USER, noteId, placementId, { block_id: id,
    layout: { frame_id: input.frame, x: input.x ?? 0, y: input.y ?? 0, width: 300, height: 60,
      surface: 'formal_page', boundary_role: 'inside', coordinate_space: 'page_frame_local' } });
  return id;
}

async function fixture(t: TestContext) {
  // A disposable in-memory database; no application bootstrap, environment loader, or credentials.
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  for (const id of [USER, OTHER]) db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run(id, `${id}@example.invalid`, 'synthetic', id);
  const courseId = randomUUID();
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, USER, 'B1 course');
  const noteId = seedNote(db, courseId);
  const pageIds = ['b1-page-first', 'b1-page-second', 'b1-page-empty'];
  // Store frames out of order to verify that paper reads follow vertical page order.
  savePageFrameCollection(db, USER, noteId, {
    primaryFrameId: pageIds[0], selectedFrameId: pageIds[0],
    primaryStackId: 'b1-stack', selectedStackId: 'b1-stack',
    pageStacks: [{ id: 'b1-stack', frameIds: pageIds }],
    pageFrames: [2, 0, 1].map(index => ({ id: pageIds[index], x: 0, y: index * 1200,
      width: 800, height: 1100, contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true })),
  });
  const paragraphId = seedBlock(db, courseId, noteId, {
    text: 'The body paragraph.', frame: pageIds[0], y: 100, order: 0,
  });
  const headingId = seedBlock(db, courseId, noteId, {
    text: 'First heading', role: 'heading', frame: pageIds[0], y: 0, order: 1,
  });
  const firstItem = createItem(db, USER, { plain_text: 'Current Item content',
    origin_note_id: noteId, origin_course_id: courseId, created_by: 'human' });
  const secondItem = createItem(db, USER, { plain_text: 'Supporting Item', origin_note_id: noteId });
  const itemBlockId = seedBlock(db, courseId, noteId, { kind: 'item_ref', text: '',
    content: { item_id: firstItem.id }, frame: pageIds[1], y: 100, order: 2 });
  const assetId = randomUUID();
  db.prepare(`INSERT INTO canvas_assets(id,user_id,course_id,origin_note_id,kind,storage_kind,storage_key,
    filename,mime_type,byte_size,width,height) VALUES(?,?,?,?,'image','local_file',?,'figure.png','image/png',0,800,80)`)
    .run(assetId, USER, courseId, noteId, `${assetId}.png`);
  const mediaBlockId = seedBlock(db, courseId, noteId, { kind: 'media', text: '', content: {},
    metadata: { media: { asset_id: assetId, naturalWidth: 800, naturalHeight: 80, alt: 'A figure' } },
    frame: pageIds[1], y: 0, order: 3 });
  const longText = 'A '.repeat(140).trim();
  const group = upsertContentGroup(db, USER, { id: randomUUID(), project_id: courseId, note_id: noteId,
    title: 'Reading group', members: [
      { id: 'b1-range-member', kind: 'content_range', current_content: longText,
        preview_text: 'Old preview', order_index: 0 },
      { id: 'b1-item-member', kind: 'item', item_id: firstItem.id, order_index: 1 },
    ] });
  replaceNoteAnnotationTruths(db, USER, noteId, [{ id: 'b1-annotation', raw_label: 'Human annotation',
    created_by: 'human', ranges: [{ id: 'b1-range', target_kind: 'text_span', block_id: paragraphId,
      start_offset: 4, end_offset: 8, range_text_cache: 'body', metadata: {} }] }]);
  const activeRelation = createRelation(db, USER, { from_item_id: firstItem.id, to_item_id: secondItem.id,
    relation_type: 'supports', note: 'A human judgment', created_by: 'human' });
  const revokedRelation = createRelation(db, USER, { from_item_id: firstItem.id, to_item_id: secondItem.id,
    relation_type: 'contradicts', note: 'Earlier judgment', created_by: 'human' });
  revokeRelation(db, USER, revokedRelation.id);
  const board = db.transaction(() => {
    const { board: created } = createBoard(db, USER, { title: 'Reading board', purpose: { title: 'Study' },
      viewport: { x: 40, y: -20, zoom: 1.5 } });
    const noteMember = mountBoardMember(db, USER, created.id, { member_kind: 'note', member_id: noteId,
      x: 20, y: 30, scale: 1.25, pinned: true }).member;
    const itemMember = mountBoardMember(db, USER, created.id, { member_kind: 'item', member_id: firstItem.id,
      x: 400, y: 50 }).member;
    const groupMember = mountBoardMember(db, USER, created.id, { member_kind: 'content_group', member_id: group.id }).member;
    const edge = createBoardEdge(db, USER, created.id, { from_member_id: noteMember.id,
      to_member_id: itemMember.id, label: 'Supports' });
    const visual = createBoardVisual(db, USER, created.id, { visual_kind: 'sticky',
      x: 80, y: 90, w: 200, h: 100, rotation: 15, data: { text: 'Board thought' } });
    return { ...created, noteMember, itemMember, groupMember, edge, visual };
  })();
  return { db, courseId, noteId, pageIds, paragraphId, headingId, firstItem, secondItem,
    itemBlockId, mediaBlockId, assetId, group, longText, activeRelation, revokedRelation, board };
}

async function read(t: TestContext, db: Db, name: string, args: Row, userId = USER): Promise<Row> {
  const before = db.serialize();
  const sql: string[] = [];
  const originalPrepare = db.prepare.bind(db);
  const prepare = t.mock.method(db, 'prepare', ((source: string) => {
    sql.push(source);
    return originalPrepare(source);
  }) as typeof db.prepare);
  const transaction = t.mock.method(db, 'transaction');
  const exec = t.mock.method(db, 'exec');
  try {
    const result = JSON.parse(await executeTool(name, args, userId));
    assert.equal('receipt_id' in result, false);
    TOOL_REGISTRY.find(entry => entry.name === name)!.output_schema.parse(result);
    return result;
  } finally {
    assert.deepEqual(db.serialize(), before, `${name} changed database bytes`);
    assert.equal(transaction.mock.callCount(), 0, `${name} opened a transaction`);
    assert.equal(exec.mock.callCount(), 0, `${name} executed raw SQL`);
    assert.ok(sql.every(source => originalPrepare(source).readonly), `${name} prepared a write`);
    prepare.mock.restore();
    transaction.mock.restore();
    exec.mock.restore();
  }
}

test('B1 read verbs project once from the V2 manifest as immediate internal read tools', () => {
  const manifest = loadToolFaceManifest();
  for (const name of names) {
    const registered = TOOL_REGISTRY.find(entry => entry.name === name);
    const projected = toolDefinitions.filter(entry => entry.name === name);
    assert.ok(registered, name);
    assert.equal(registered.exposure, 'internal');
    assert.equal(registered.tier, 'immediate');
    assert.ok(registered.scopes.every(scope => scope.endsWith(':read')), name);
    assert.equal(hasAgentActionRevert(name), false);
    assert.equal(projected.length, 1);
    assert.equal(projected[0].description, registered.description);
    assert.deepEqual(projected[0].parameters, manifest.find(entry => entry.name === name)!.input_schema);
  }
});

test('read_note returns ordered structured blocks page by page, including the empty final page', async t => {
  const f = await fixture(t);
  const first = await read(t, f.db, 'read_note', { note_id: f.noteId });
  assert.deepEqual(first.note, { id: f.noteId, title: 'Three page paper', course_id: f.courseId,
    page_format: 'a4_portrait', page_count: 3 });
  assert.equal(first.page_index, 0);
  assert.equal(first.has_more, true);
  assert.equal(first.next_page_index, 1);
  assert.deepEqual(first.blocks.map((row: Row) => row.id), [f.headingId, f.paragraphId]);
  assert.equal(first.blocks[0].text, 'First heading');
  assert.equal(first.blocks[0].role, 'heading');
  assert.equal(first.blocks[0].kind, 'paragraph');
  const second = await read(t, f.db, 'read_note', { note_id: f.noteId, page_index: 1 });
  assert.equal(second.has_more, true);
  assert.deepEqual(second.blocks.map((row: Row) => row.id), [f.mediaBlockId, f.itemBlockId]);
  assert.equal(second.blocks[0].kind, 'media');
  assert.equal(second.blocks[0].media.asset_id, f.assetId);
  assert.equal(second.blocks[0].media.type, 'image');
  assert.deepEqual(second.blocks[1].item_ref, { item_id: f.firstItem.id });
  const last = await read(t, f.db, 'read_note', { note_id: f.noteId, page_index: 2 });
  assert.equal(last.has_more, false);
  assert.equal(last.next_page_index, null);
  assert.deepEqual(last.blocks, []);
});

test('T6 read_note keeps heading, block and note inline links in the unchanged flat text projection', async t => {
  const f = await fixture(t);
  const before = await read(t, f.db, 'read_note', { note_id: f.noteId });
  const row = f.db.prepare('SELECT content_json FROM note_blocks WHERE id = ?').get(f.paragraphId) as Row;
  const content = JSON.parse(row.content_json);
  content.text_flow.inline_structures = [
    { target_kind: 'heading', block_id: f.headingId, unit_id: `${f.headingId}:unit` },
    { target_kind: 'block', block_id: f.headingId },
    { target_kind: 'note', note_id: f.noteId },
  ].map((target, index) => ({ id: `link-${index}`, semantic_kind: 'inline_link',
    parent_text_unit_id: `${f.paragraphId}:unit`, anchor_text: 'body', anchor_range: { start: 4, end: 8 },
    field_values: target, metadata: {}, status: 'active' }));
  f.db.prepare('UPDATE note_blocks SET content_json = ? WHERE id = ?').run(JSON.stringify(content), f.paragraphId);
  const after = await read(t, f.db, 'read_note', { note_id: f.noteId });
  assert.deepEqual(after, before);
});

test('read_board returns current member summaries, positions, edges, and visual geometry', async t => {
  const f = await fixture(t);
  const result = await read(t, f.db, 'read_board', { board_id: f.board.id });
  assert.deepEqual(result.board, { id: f.board.id, title: 'Reading board', viewport: { x: 40, y: -20, zoom: 1.5 } });
  const note = result.members.find((row: Row) => row.id === f.board.noteMember.id);
  assert.equal(note.member_kind, 'note');
  assert.equal(note.member_id, f.noteId);
  assert.deepEqual([note.x, note.y, note.scale, note.pinned], [20, 30, 1.25, true]);
  assert.equal(note.title_or_summary, 'Three page paper');
  assert.equal(result.members.find((row: Row) => row.id === f.board.itemMember.id).title_or_summary, 'Current Item content');
  assert.equal(result.members.find((row: Row) => row.id === f.board.groupMember.id).title_or_summary, 'Reading group');
  assert.deepEqual(result.edges, [{ id: f.board.edge.id, from_member: f.board.noteMember.id,
    to_member: f.board.itemMember.id, label: 'Supports' }]);
  assert.equal(result.visuals[0].id, f.board.visual.id);
  assert.equal(result.visuals[0].type, 'sticky');
  assert.equal(result.visuals[0].geometry.rotation, 15);
  assert.equal(result.visuals[0].geometry.x, 80);
  assert.equal(result.has_more, false);
});

test('read_content_groups follows course/note filters and current Item content with 200 character summaries', async t => {
  const f = await fixture(t);
  const course = await read(t, f.db, 'read_content_groups', { course_id: f.courseId });
  const note = await read(t, f.db, 'read_content_groups', { note_id: f.noteId });
  const both = await read(t, f.db, 'read_content_groups', { course_id: f.courseId, note_id: f.noteId });
  assert.deepEqual(note, course);
  assert.deepEqual(both, note);
  assert.equal(note.groups.length, 1);
  assert.equal(note.groups[0].id, f.group.id);
  assert.equal(note.groups[0].title, 'Reading group');
  const range = note.groups[0].members.find((row: Row) => row.id === 'b1-range-member');
  assert.equal(range.kind, 'content_range');
  assert.equal(range.plain_text, f.longText.slice(0, READ_SUMMARY_LENGTH));
  assert.equal(range.text_truncated, true);
  const item = note.groups[0].members.find((row: Row) => row.id === 'b1-item-member');
  assert.equal(item.item_id, f.firstItem.id);
  assert.equal(item.plain_text, 'Current Item content');
  assert.equal(item.text_truncated, false);
  assert.equal(note.has_more, false);
  // Match SQLite courseCards substr semantics for astral characters as domain content.
  const unicodeText = '读📖'.repeat(101);
  f.db.prepare('UPDATE items SET plain_text = ? WHERE id = ?').run(unicodeText, f.firstItem.id);
  const revised = await read(t, f.db, 'read_content_groups', { note_id: f.noteId });
  const revisedItem = revised.groups[0].members.find((row: Row) => row.id === 'b1-item-member');
  assert.equal(revisedItem.plain_text, Array.from(unicodeText).slice(0, READ_SUMMARY_LENGTH).join(''));
  assert.equal(revisedItem.text_truncated, true);
});

test('read_annotations_relations preserves human judgments, provenance, snapshots, and explicit scopes', async t => {
  const f = await fixture(t);
  const note = await read(t, f.db, 'read_annotations_relations', { note_id: f.noteId });
  assert.equal(note.annotations_note_id, f.noteId);
  assert.equal(note.annotations.length, 1);
  assert.equal(note.annotations[0].id, 'b1-annotation');
  assert.equal(note.annotations[0].text, 'Human annotation');
  assert.equal(note.annotations[0].created_by, 'human');
  assert.equal(note.annotations[0].ranges[0].block_id, f.paragraphId);
  assert.deepEqual([note.annotations[0].ranges[0].start_offset, note.annotations[0].ranges[0].end_offset], [4, 8]);
  assert.equal(note.annotations[0].ranges[0].range_text_cache, 'body');
  assert.deepEqual(note.relation_scope.item_ids, [f.firstItem.id]);
  assert.deepEqual(new Set(note.relations.map((row: Row) => row.status)), new Set(['active', 'revoked']));
  for (const id of [f.activeRelation.id, f.revokedRelation.id]) {
    const projected = note.relations.find((row: Row) => row.id === id);
    assert.deepEqual(projected, getRelation(f.db, USER, id));
    assert.equal(projected.created_by, 'human');
    assert.ok(projected.affirmed_at);
    assert.ok(projected.from_snapshot.id);
    assert.ok(projected.to_snapshot.id);
  }
  const item = await read(t, f.db, 'read_annotations_relations', { item_id: f.firstItem.id });
  assert.equal(item.annotations_note_id, null);
  assert.deepEqual(item.annotations, []);
  assert.deepEqual(item.relations, note.relations);
  const both = await read(t, f.db, 'read_annotations_relations', { note_id: f.noteId, item_id: f.secondItem.id });
  assert.deepEqual(both.annotations, note.annotations);
  assert.deepEqual(both.relation_scope.item_ids, [f.secondItem.id]);
  assert.deepEqual(both.relations, note.relations);
  assert.equal(both.has_more, false);
});

test('read_note exposes its block cap while a legacy flow note remains readable as one page', async t => {
  const f = await fixture(t);
  const noteId = seedNote(f.db, f.courseId, 'Long legacy flow');
  f.db.prepare("UPDATE notes SET page_format = 'flow' WHERE id = ?").run(noteId);
  for (let index = 0; index <= AGENT_NOTE_BLOCK_LIMIT; index++) {
    seedBlock(f.db, f.courseId, noteId, { text: `Paragraph ${index}`, order: index });
  }
  const result = await read(t, f.db, 'read_note', { note_id: noteId });
  assert.equal(result.note.page_count, 1);
  assert.equal(result.blocks.length, AGENT_NOTE_BLOCK_LIMIT);
  assert.equal(result.total_blocks, AGENT_NOTE_BLOCK_LIMIT + 1);
  assert.equal(result.blocks[0].text, 'Paragraph 0');
  assert.equal(result.blocks.at(-1).text, `Paragraph ${AGENT_NOTE_BLOCK_LIMIT - 1}`);
  assert.equal(result.next_page_index, null);
  assert.equal(result.has_more, true);
  assert.equal(result.truncated, true);
});

test('read_board marks each collection independently when member, edge, and visual caps are reached', async t => {
  const f = await fixture(t);
  f.db.transaction(() => {
    for (let index = 0; index < AGENT_BOARD_ENTRY_LIMIT; index++) {
      const member = mountBoardMember(f.db, USER, f.board.id,
        { member_kind: 'note', member_id: f.noteId, x: index }).member;
      createBoardEdge(f.db, USER, f.board.id, { from_member_id: f.board.noteMember.id,
        to_member_id: member.id, label: `Edge ${index}` });
      createBoardVisual(f.db, USER, f.board.id, { visual_kind: 'sticky', data: { text: `Thought ${index}` } });
    }
  })();
  const result = await read(t, f.db, 'read_board', { board_id: f.board.id });
  assert.deepEqual([result.members.length, result.edges.length, result.visuals.length],
    [AGENT_BOARD_ENTRY_LIMIT, AGENT_BOARD_ENTRY_LIMIT, AGENT_BOARD_ENTRY_LIMIT]);
  assert.deepEqual(result.truncated, { members: true, edges: true, visuals: true });
  assert.deepEqual(result.total_counts, { members: AGENT_BOARD_ENTRY_LIMIT + 3,
    edges: AGENT_BOARD_ENTRY_LIMIT + 1, visuals: AGENT_BOARD_ENTRY_LIMIT + 1 });
  assert.equal(result.has_more, true);
});

test('read_content_groups reports group count and a response-wide member budget without silent omission', async t => {
  const f = await fixture(t);
  const noteId = seedNote(f.db, f.courseId, 'Many groups');
  for (let index = 0; index <= READ_GROUP_LIMIT; index++) upsertContentGroup(f.db, USER, {
    id: `b1-group-${String(index).padStart(3, '0')}`, project_id: f.courseId, note_id: noteId,
    title: `Group ${index}`, members: Array.from({ length: 3 }, (_, member) => ({
      id: `b1-member-${index}-${member}`, kind: 'content_range', current_content: `Content ${index}-${member}`,
      order_index: member,
    })),
  });
  const result = await read(t, f.db, 'read_content_groups', { note_id: noteId });
  assert.equal(result.groups.length, READ_GROUP_LIMIT);
  assert.equal(result.total_groups, READ_GROUP_LIMIT + 1);
  assert.equal(result.groups.reduce((sum: number, group: Row) => sum + group.members.length, 0), READ_MEMBER_LIMIT);
  assert.equal(result.total_members, (READ_GROUP_LIMIT + 1) * 3);
  assert.ok(result.groups.some((group: Row) => group.has_more));
  assert.equal(result.has_more, true);
  assert.equal(result.truncated, true);
});

test('read_annotations_relations marks annotation and response-wide range caps', async t => {
  const f = await fixture(t);
  const annotations = Array.from({ length: READ_ANNOTATION_LIMIT + 1 }, (_, index) => ({
    id: `b1-limit-annotation-${String(index).padStart(3, '0')}`, raw_label: `Annotation ${index}`,
    ranges: [0, 1].map(range => ({ id: `b1-limit-range-${index}-${range}`, target_kind: 'text_span',
      block_id: f.paragraphId, start_offset: 4, end_offset: 8, range_text_cache: 'body' })),
  }));
  replaceNoteAnnotationTruths(f.db, USER, f.noteId, annotations);
  const result = await read(t, f.db, 'read_annotations_relations', { note_id: f.noteId });
  assert.equal(result.annotations.length, READ_ANNOTATION_LIMIT);
  assert.equal(result.total_annotations, READ_ANNOTATION_LIMIT + 1);
  assert.equal(result.annotations.reduce((sum: number, annotation: Row) => sum + annotation.ranges.length, 0), READ_RANGE_LIMIT);
  assert.equal(result.total_ranges, (READ_ANNOTATION_LIMIT + 1) * 2);
  assert.ok(result.annotations.some((annotation: Row) => annotation.has_more));
  assert.equal(result.truncated, true);
  assert.equal(result.has_more, true);
});

test('read_annotations_relations reports relation row and note Item-scope truncation separately', async t => {
  const f = await fixture(t);
  const noteId = seedNote(f.db, f.courseId, 'Many linked Items');
  for (let index = 0; index <= Math.max(READ_RELATION_LIMIT, READ_RELATION_SCOPE_LIMIT); index++) {
    const item = createItem(f.db, USER, { plain_text: `Related Item ${index}` });
    seedBlock(f.db, f.courseId, noteId, { kind: 'item_ref', content: { item_id: item.id }, text: '', order: index });
    createRelation(f.db, USER, { from_item_id: f.firstItem.id, to_item_id: item.id,
      relation_type: 'supports', created_by: 'human' });
  }
  const item = await read(t, f.db, 'read_annotations_relations', { item_id: f.firstItem.id });
  assert.equal(item.relations.length, READ_RELATION_LIMIT);
  assert.equal(item.total_relations, Math.max(READ_RELATION_LIMIT, READ_RELATION_SCOPE_LIMIT) + 3);
  assert.equal(item.relation_count_complete, true);
  assert.equal(item.has_more, true);
  assert.equal(item.truncated, true);
  const note = await read(t, f.db, 'read_annotations_relations', { note_id: noteId });
  assert.equal(note.relation_scope.item_ids.length, READ_RELATION_SCOPE_LIMIT);
  assert.equal(note.relation_scope.total_items, Math.max(READ_RELATION_LIMIT, READ_RELATION_SCOPE_LIMIT) + 1);
  assert.equal(note.relation_scope.has_more, true);
  assert.equal(note.relation_count_complete, false);
  assert.equal(note.has_more, true);
});

test('each read tool preserves ordinary owner-only 404 behavior without writing', async t => {
  const f = await fixture(t);
  for (const [name, args] of [
    ['read_note', { note_id: f.noteId }], ['read_board', { board_id: f.board.id }],
    ['read_content_groups', { course_id: f.courseId }], ['read_content_groups', { note_id: f.noteId }],
    ['read_annotations_relations', { note_id: f.noteId }],
    ['read_annotations_relations', { item_id: f.firstItem.id }],
  ] as const) {
    await assert.rejects(read(t, f.db, name, args, OTHER), error => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      return true;
    });
  }
});
