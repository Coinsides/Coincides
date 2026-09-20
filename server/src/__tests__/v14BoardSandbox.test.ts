import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { Router } from 'express';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { classifyToolEffect } from '../agent/tools/effectClassification.js';
import { BOARD_ACTION_TOOLS } from '../toolFace/boardActions.js';
import { hasAgentActionRevert, revertToolReceipt } from '../services/toolFaceReceiptRevert.js';
import { readToolFaceReceipt } from '../services/toolFaceReceipts.js';
import { createBoard, getBoard, mountBoardMember, createBoardSticky, createBoardVisual,
  createBoardLayer, updateBoardSticky, updateBoardMember, updateBoardLayer } from '../services/boards.js';
import { inspectAgentBoard } from '../services/boardAgentLayout.js';
import { latestBoardAgentBatch, revertBoardAgentBatch } from '../services/boardAgentBatches.js';
import { createBoardRouter } from '../routes/boards.js';
import { createToolReceiptsRouter } from '../routes/toolReceipts.js';

/** Exercise the actual route handler, as the scripted harness does, without app startup/auth. */
async function invoke(router: Router, method: string, path: string, userId: string, body: unknown = {}) {
  const parts = path.split('/').filter(Boolean);
  let params: Record<string, string> = {};
  const layer = router.stack.find((layer: any) => {
    if (!layer.route?.methods[method.toLowerCase()]) return false;
    const pattern: string[] = layer.route.path.split('/').filter(Boolean);
    if (pattern.length !== parts.length) return false;
    const found: Record<string, string> = {};
    if (!pattern.every((part, i) => part.startsWith(':') ? (found[part.slice(1)] = parts[i], true) : part === parts[i])) return false;
    params = found; return true;
  });
  assert.ok(layer?.route); assert.equal(layer.route.stack.length, 1);
  const response = { statusCode: 200, body: undefined as unknown,
    status(value: number) { this.statusCode = value; return this; },
    json(value: unknown) { this.body = value; return this; } };
  const handler = layer.route.stack[0].handle as (req: unknown, res: unknown, next: (error?: unknown) => void) => unknown;
  await handler({ userId, params, body }, response, (error: unknown) => { if (error) throw error; });
  return response;
}

const userId = 'c1-user', conversationId = 'c1-conversation';
const context = { actor: 'agent', channel: 'chat', conversationId, callId: 'c1-call', turnId: 'c1-turn' } as const;
type Row = Record<string, any>;
// Timestamps are bookkeeping, not reversible board geometry/content.
const normalized = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (key, entry) =>
  ['created_at', 'updated_at', 'mounted_at'].includes(key) ? undefined : entry));
async function fixture(t: TestContext) {
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','C1 fixture')").run(userId, 'c1@example.invalid');
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run('c1-course', userId, 'C1 course');
  db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)').run(conversationId, userId, 'C1 conversation');
  for (const id of ['c1-note', 'c1-note-2']) db.prepare('INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,?)')
    .run(id, userId, 'c1-course', id);
  const seed = db.transaction(() => {
    const board = createBoard(db, userId, { title: 'C1 board', purpose: { title: 'C1 map' } }).board;
    const member = mountBoardMember(db, userId, board.id, { member_kind: 'note', member_id: 'c1-note', x: 0, y: 0 }).member;
    const sticky = createBoardSticky(db, userId, board.id, { text: 'Human sticky', x: 600, y: 0, w: 240 });
    const visual = createBoardVisual(db, userId, board.id, { visual_kind: 'sticky', x: 900, y: 0, data: { text: 'Human chalk' } });
    const layer = createBoardLayer(db, userId, board.id, { name: 'Map layer' });
    return { board, member, sticky, visual, layer };
  })();
  let counter = 0;
  const action = async (name: string, input: Row, ids: Row = {}, override: Row = {}) => JSON.parse(await executeTool(name,
    { board_id: seed.board.id, ...ids, input }, userId, { ...context, callId: `c1-call-${counter++}`, ...override }));
  const detail = () => getBoard(db, userId, seed.board.id);
  return { db, ...seed, action, detail };
}

const cases = [
  { name: 'board_mount_member', input: () => ({ member_kind: 'note', member_id: 'c1-note-2', x: 5, y: 7, w: 260, h: 156 }), bad: { member_kind: 'text_range', member_id: 'x' }, ids: () => ({}) },
  { name: 'board_move_member', input: () => ({ x: 12, y: -9, w: 312, h: 212 }), bad: { w: -1 }, ids: (f: Row) => ({ member_id: f.member.id }) },
  { name: 'board_set_member_layer', input: (f: Row) => ({ layer_id: f.layer.id, z_index: 6 }), bad: { z_index: 1.5 }, ids: (f: Row) => ({ member_id: f.member.id }) },
  { name: 'board_create_edge', input: (f: Row) => ({ from: { kind: 'member', id: f.member.id, anchor: 'e' }, to: { kind: 'sticky', id: f.sticky.id, anchor: 'w' }, bend: 32, dash: 'dashed', weight: 3, cap_start: 'dot', cap_end: 'arrow', label: 'visual only', label_position: .3, color_index: 1 }), bad: { from: { kind: 'point', x: 0, y: 0 }, to: { kind: 'point', x: 2, y: 2 }, weight: 4 }, ids: () => ({}) },
  { name: 'board_create_sticky', input: () => ({ text: 'Proposed', x: -20, y: 50, w: 416, weight: 3, color_index: 1 }), bad: { w: 300 }, ids: () => ({}) },
  { name: 'board_update_sticky', input: () => ({ text: 'Arranged', x: 620, y: 60, w: 416, weight: 2, color_index: 1 }), bad: { color_index: 2 }, ids: (f: Row) => ({ sticky_id: f.sticky.id }) },
  { name: 'board_patch_visual', input: () => ({ x: 955, scale: 1.2, rotation: 10, data: { text: 'Agent chalk' } }), bad: { scale: 0 }, ids: (f: Row) => ({ visual_id: f.visual.id }) },
];

test('C1 registers exactly seven reversible door writes', () => {
  assert.deepEqual(BOARD_ACTION_TOOLS.map(tool => tool.name), cases.map(entry => entry.name));
  for (const tool of BOARD_ACTION_TOOLS) {
    assert.equal(hasAgentActionRevert(tool.name), true);
    assert.equal(classifyToolEffect(tool.name), 'door_write');
  }
});
for (const entry of cases) test(`${entry.name}: human service semantics, ordinary invalid input, receipt and individual undo`, async t => {
  const f = await fixture(t);
  const before = normalized(f.detail());
  const notes = f.db.prepare('SELECT * FROM notes').all();
  const count = (table: string) => (f.db.prepare(`SELECT count(*) n FROM ${table}`).get() as Row).n;
  const events = count('events'), receipts = count('operation_batches');
  await assert.rejects(f.action(entry.name, entry.bad, entry.ids(f)));
  assert.deepEqual(normalized(f.detail()), before);
  assert.equal(count('events'), events); assert.equal(count('operation_batches'), receipts);
  const result = await f.action(entry.name, entry.input(f), entry.ids(f));
  const saved = [...f.detail().members, ...f.detail().stickies, ...f.detail().edges, ...f.detail().visuals]
    .find(object => object.id === result.id) as Row;
  assert.ok(saved);
  for (const [field, expected] of Object.entries(entry.input(f))) {
    assert.deepEqual(result.entity[field], expected, `result ${field}`);
    assert.deepEqual(saved[field], expected, `saved ${field}`);
  }
  assert.equal(result.batch_id, conversationId);
  assert.equal(result.board_id, f.board.id);
  assert.deepEqual(result.layout_report.report, inspectAgentBoard(f.detail()));
  const receipt = readToolFaceReceipt(result.receipt_id, f.db);
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.metadata.tool, entry.name);
  assert.equal(receipt.metadata.agent_context?.batch_id, conversationId);
  const event = f.db.prepare('SELECT * FROM events WHERE seq = ?').get(receipt.metadata.agent_context!.event_seq) as Row;
  assert.equal(event.actor_kind, 'agent'); assert.equal(event.channel, 'chat');
  assert.equal(JSON.parse(event.meta).batch_id, conversationId);
  assert.deepEqual(JSON.parse(event.objects), [{ kind: receipt.metadata.resources[0].kind, id: result.id }]);
  if (entry.name === 'board_mount_member' || entry.name === 'board_create_sticky') {
    assert.equal(result.entity.placed, false); assert.equal(result.entity.mounted_actor, 'agent');
  }
  if (entry.name === 'board_move_member') assert.equal(result.entity.placed, true);
  if (entry.name === 'board_create_edge') {
    assert.equal(result.entity.visual_version, 1); assert.equal(result.entity.dash, 'dashed');
    assert.equal(result.entity.from.anchor, 'e'); assert.equal(result.entity.to.anchor, 'w');
    assert.equal(result.entity.weight, 3); assert.equal(result.entity.cap_start, 'dot');
    assert.equal(result.entity.cap_end, 'arrow'); assert.equal(result.entity.label_position, .3);
  }
  const response = await invoke(createToolReceiptsRouter(), 'POST', `/${result.receipt_id}/revert`, userId, {});
  assert.equal(response.statusCode, 200);
  const reverted = readToolFaceReceipt(result.receipt_id, f.db);
  assert.equal(reverted.status, 'reverted');
  assert.deepEqual(reverted.metadata.revert_details?.[receipt.metadata.resources[0].before === null ? 'deleted' : 'restored'], [result.id]);
  assert.deepEqual(normalized(f.detail()), before);
  assert.deepEqual(f.db.prepare('SELECT * FROM notes').all(), notes);
  assert.equal(count('relations'), 0);
  await assert.rejects(invoke(createToolReceiptsRouter(), 'POST', `/${result.receipt_id}/revert`, userId, {}));
});

test('same conversation spans turns and boards; batch reverses dependent writes and skips individual undo', async t => {
  const f = await fixture(t);
  const second = f.db.transaction(() => createBoard(f.db, userId, { title: 'Second board', purpose: { title: 'Second' } }).board)();
  const before = normalized(f.detail()), beforeSecond = normalized(getBoard(f.db, userId, second.id));
  const outputs = [];
  outputs.push(await f.action('board_move_member', { x: 33 }, { member_id: f.member.id }));
  outputs.push(await f.action('board_move_member', { x: 66 }, { member_id: f.member.id }, { turnId: 'second-turn' }));
  const sticky = await f.action('board_create_sticky', { text: 'Temporary' }); outputs.push(sticky);
  outputs.push(await f.action('board_update_sticky', { text: 'Temporary updated' }, { sticky_id: sticky.id }));
  const edge = await f.action('board_create_edge', { from: { kind: 'sticky', id: sticky.id, anchor: 'n' }, to: { kind: 'point', x: 44, y: 99 } });
  revertToolReceipt({ userId, receiptId: edge.receipt_id });
  outputs.push(await f.action('board_create_sticky', { text: 'Second board temporary' }, { board_id: second.id }, { turnId: 'third-turn' }));
  assert.equal(latestBoardAgentBatch(userId, f.board.id)?.receipt_count, 5);
  const response = await invoke(createBoardRouter(), 'POST', `/${f.board.id}/agent-batches/${conversationId}/revert`, userId, {});
  assert.equal(response.statusCode, 200); assert.equal((response.body as Row).receipt_ids.length, 5);
  assert.deepEqual(normalized(f.detail()), before);
  assert.deepEqual(normalized(getBoard(f.db, userId, second.id)), beforeSecond);
  for (const output of [...outputs, edge]) assert.equal(readToolFaceReceipt(output.receipt_id, f.db).status, 'reverted');
  assert.equal(latestBoardAgentBatch(userId, f.board.id)?.receipt_count, 0);
  assert.throws(() => revertBoardAgentBatch(userId, f.board.id, conversationId), { message: 'board_agent_batch_not_applied' });
});

test('retry of latest conversation never targets an older applied batch', async t => {
  const f = await fixture(t);
  const first = await f.action('board_create_sticky', { text: 'Earlier' });
  f.db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)').run('c1-later', userId, 'Later');
  await f.action('board_create_sticky', { text: 'Later' }, {}, { conversationId: 'c1-later' });
  assert.equal(latestBoardAgentBatch(userId, f.board.id)?.batch_id, 'c1-later');
  revertBoardAgentBatch(userId, f.board.id, 'c1-later');
  assert.equal(latestBoardAgentBatch(userId, f.board.id)?.batch_id, 'c1-later');
  assert.throws(() => revertBoardAgentBatch(userId, f.board.id, 'c1-later'), { message: 'board_agent_batch_not_applied' });
  assert.equal(readToolFaceReceipt(first.receipt_id, f.db).status, 'applied');
});

test('later human adoption causes atomic conflict without discarding human or other batch work', async t => {
  const f = await fixture(t);
  const sticky = await f.action('board_create_sticky', { text: 'To adopt' });
  const member = await f.action('board_mount_member', { member_kind: 'note', member_id: 'c1-note-2' });
  f.db.transaction(() => {
    updateBoardSticky(f.db, userId, f.board.id, sticky.id, { placed: true, x: 100 });
    updateBoardMember(f.db, userId, f.board.id, member.id, { placed: true, x: 400 });
  })();
  const latest = await f.action('board_create_sticky', { text: 'Would otherwise revert first' });
  const before = f.detail(), events = f.db.prepare('SELECT * FROM events').all();
  assert.throws(() => revertBoardAgentBatch(userId, f.board.id, conversationId), { message: 'board_action_target_changed' });
  assert.deepEqual(f.detail(), before); assert.deepEqual(f.db.prepare('SELECT * FROM events').all(), events);
  for (const result of [sticky, member, latest]) assert.equal(readToolFaceReceipt(result.receipt_id, f.db).status, 'applied');
});

for (const table of ['events', 'operation_batches']) test(`${table} storage failure rolls back board, event and receipt together`, async t => {
  const f = await fixture(t), before = f.detail();
  const events = f.db.prepare('SELECT * FROM events').all(), receipts = f.db.prepare('SELECT * FROM operation_batches').all();
  f.db.exec(`CREATE TRIGGER c1_storage_failure BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'synthetic storage failure'); END`);
  await assert.rejects(f.action('board_create_sticky', { text: 'Not committed' }), { message: 'synthetic storage failure' });
  assert.deepEqual(f.detail(), before); assert.deepEqual(f.db.prepare('SELECT * FROM events').all(), events);
  assert.deepEqual(f.db.prepare('SELECT * FROM operation_batches').all(), receipts);
});

test('layout consumer reports proposed staging geometry but omits hidden layers; diagnosis does not block writes', async t => {
  const f = await fixture(t);
  const first = await f.action('board_create_sticky', { text: 'Overlap', x: 600, y: 0 });
  assert.ok(first.layout_report.report.issues.length > 0);
  assert.equal(readToolFaceReceipt(first.receipt_id, f.db).status, 'applied');
  f.db.transaction(() => {
    updateBoardSticky(f.db, userId, f.board.id, first.id, { layer_id: f.layer.id });
    updateBoardLayer(f.db, userId, f.board.id, f.layer.id, { visible: false });
  })();
  assert.equal(inspectAgentBoard(f.detail()).issues.some(issue => issue.itemIds.includes(`sticky:${first.id}`)), false);
});

test('post-commit diagnostic failure remains a successful reversible board write', async t => {
  const f = await fixture(t);
  const prepare = f.db.prepare.bind(f.db);
  const mocked = t.mock.method(f.db, 'prepare', (sql: string) => {
    if (!f.db.inTransaction && sql.startsWith('SELECT * FROM boards WHERE')) throw new Error('Synthetic diagnostic read failure');
    return prepare(sql);
  });
  const result = await f.action('board_create_sticky', { text: 'Saved even without diagnostic' });
  mocked.mock.restore();
  assert.equal(result.layout_report.report, null);
  assert.equal(result.layout_report.diagnostic_error, 'layout_diagnostic_unavailable');
  assert.equal(readToolFaceReceipt(result.receipt_id, f.db).status, 'applied');
  revertToolReceipt({ userId, receiptId: result.receipt_id });
  assert.equal(f.detail().stickies.some(sticky => sticky.id === result.id), false);
});
