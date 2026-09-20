import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type { Response } from 'express';
import type { AgentUiCommand } from '../../../shared/types/agentUiCommand.js';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import { closeDb, initDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { createAgentUiRunState, AGENT_UI_TURN_LIMIT, AGENT_UI_DEBOUNCE_MS } from '../agent/tools/uiCommands.js';
import { AGENT_UI_TURN_LIMIT as SHARED_UI_TURN_LIMIT, AGENT_UI_DEBOUNCE_MS as SHARED_UI_DEBOUNCE_MS } from '../../../shared/types/agentUiCommand.js';
import { AGENT_ACTION_TOOLS, AGENT_READ_TOOLS, AGENT_UI_TOOLS } from '../toolFace/registry.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import { assertToolEffectCoverage, classifyToolEffect, DOOR_WRITE_TOOLS, READ_TOOLS } from '../agent/tools/effectClassification.js';
import { createBoard, mountBoardMember, updateBoard, createBoardLayer, updateBoardLayer, updateBoardMember } from '../services/boards.js';
import { savePageFrameCollection } from '../services/canvasObjects.js';
import { MemoryManager } from '../agent/memory/manager.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { StreamChunk, ToolCall } from '../agent/providers/types.js';
import { projectMessageReceipts, type PersistedAgentMessage } from '../agent/turnReceipt.js';
import agentRouter from '../routes/agent.js';
import type { AuthRequest } from '../middleware/auth.js';

const USER = 'ui-user';
const CONVERSATION = 'ui-chat';
type Db = Awaited<ReturnType<typeof initDb>>;

async function fixture(t: TestContext) {
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'ui@example.invalid', 'synthetic', 'UI', JSON.stringify({ active_provider: 'openai' }));
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)').run(CONVERSATION, USER, 'UI scenario');
  const courseId = randomUUID(); const noteId = randomUUID(); const blockId = randomUUID();
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, USER, 'C4a');
  db.prepare('INSERT INTO notes(id,user_id,course_id,title,page_format) VALUES(?,?,?,?,?)')
    .run(noteId, USER, courseId, 'UI paper', 'a4_portrait');
  db.prepare('INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,?,?,?,?)')
    .run(blockId, USER, courseId, 'paragraph', JSON.stringify({ text: 'Unchanged paragraph' }), 'Unchanged paragraph');
  db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,0)')
    .run(randomUUID(), noteId, blockId);
  savePageFrameCollection(db, USER, noteId, { primaryFrameId: 'ui-page-0', selectedFrameId: 'ui-page-0',
    primaryStackId: 'ui-stack', selectedStackId: 'ui-stack',
    pageStacks: [{ id: 'ui-stack', frameIds: ['ui-page-0', 'ui-page-1'] }],
    pageFrames: [0, 1].map(index => ({ id: `ui-page-${index}`, x: 0, y: index * 1200,
      width: 800, height: 1100, contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true })) });
  const { board, member } = db.transaction(() => {
    const { board } = createBoard(db, USER, { title: 'UI board', purpose: { title: 'UI purpose' },
      viewport: { x: 10, y: 20, zoom: 1 } });
    const { member } = mountBoardMember(db, USER, board.id, { member_kind: 'note', member_id: noteId, x: 10, y: 20 });
    return { board, member };
  })();
  const context = { actor: 'agent' as const, channel: 'chat' as const, conversationId: CONVERSATION };
  const state = createAgentUiRunState('ui-turn');
  const call = async (name: string, args: Record<string, unknown>) =>
    JSON.parse(await executeTool(name, args, USER, context, state));
  return { db, noteId, blockId, boardId: board.id, memberId: member.id, context, state, call };
}

function snapshot(db: Db, except: readonly string[] = []) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>;
  return tables.filter(table => !except.includes(table.name)).map(table => ({ name: table.name,
    rows: db.prepare(`SELECT * FROM "${table.name.replace(/"/g, '""')}"`).all() }));
}

test('C4a UI group has exactly two channel verbs; existing door/read memberships stay intact', () => {
  assert.equal(AGENT_UI_TURN_LIMIT, SHARED_UI_TURN_LIMIT);
  assert.equal(AGENT_UI_DEBOUNCE_MS, SHARED_UI_DEBOUNCE_MS);
  assert.deepEqual(AGENT_UI_TOOLS.map(tool => tool.name), ['ui_open_note', 'ui_focus_object']);
  assert.deepEqual([...DOOR_WRITE_TOOLS], AGENT_ACTION_TOOLS.map(tool => tool.name));
  assert.equal(READ_TOOLS.size, 22);
  for (const tool of AGENT_READ_TOOLS) assert.ok(READ_TOOLS.has(tool.name));
  for (const tool of AGENT_UI_TOOLS) {
    assert.equal(classifyToolEffect(tool.name), 'channel_write');
    assert.equal(tool.exposure, 'internal');
    assert.ok(!tool.scopes.some(scope => scope.endsWith(':write')));
  }
  assertToolEffectCoverage(toolDefinitions);
});

test('open note and focus block/page/board member return issued commands with literally zero DB writes', async t => {
  const f = await fixture(t);
  const before = snapshot(f.db);
  const changes = f.db.prepare('SELECT total_changes() AS count').get();
  for (const [name, args] of [
    ['ui_open_note', { note_id: f.noteId }],
    ['ui_focus_object', { target: { type: 'note_block', note_id: f.noteId, block_id: f.blockId } }],
    ['ui_focus_object', { target: { type: 'note_page', note_id: f.noteId, page_index: 1 } }],
    ['ui_focus_object', { target: { type: 'board_member', board_id: f.boardId, member_id: f.memberId } }],
  ] as const) {
    const result = await f.call(name, args);
    assert.equal(result.dispatched, true);
    assert.equal(result.command.turn_id, 'ui-turn');
    assert.equal(result.command.conversation_id, CONVERSATION);
    assert.match(result.message, /issued.*may defer/);
  }
  assert.deepEqual(snapshot(f.db), before);
  assert.deepEqual(f.db.prepare('SELECT total_changes() AS count').get(), changes);
});

test('unavailable targets and absent turn context fail without dispatch or domain writes', async t => {
  const f = await fixture(t); const before = snapshot(f.db);
  for (const [name, args, expected] of [
    ['ui_open_note', { note_id: 'missing' }, /Note not found/],
    ['ui_focus_object', { target: { type: 'note_block', note_id: f.noteId, block_id: 'missing' } }, /Note block not found/],
    ['ui_focus_object', { target: { type: 'note_page', note_id: f.noteId, page_index: 2 } }, /page_index_out_of_range/],
    ['ui_focus_object', { target: { type: 'board_member', board_id: f.boardId, member_id: 'missing' } }, /Placed board member not found/],
  ] as const) await assert.rejects(() => f.call(name, args), expected);
  await assert.rejects(() => executeTool('ui_open_note', { note_id: f.noteId }, USER, f.context), /turn context is required/);
  assert.equal(f.state.dispatched, 0);
  assert.deepEqual(snapshot(f.db), before);
});

test('one-second identical-target debounce and eight-command cap are shared per turn, then reset', async t => {
  const f = await fixture(t);
  const start = Date.parse('2026-09-20T12:00:00Z');
  t.mock.timers.enable({ apis: ['Date'], now: start });
  assert.equal((await f.call('ui_open_note', { note_id: f.noteId })).dispatched, true);
  const duplicate = await f.call('ui_open_note', { note_id: f.noteId });
  assert.equal(duplicate.dispatched, false); assert.equal(duplicate.reason, 'debounced');
  assert.equal(duplicate.command, undefined); assert.equal(f.state.dispatched, 1);
  for (let index = 1; index < 8; index += 1) {
    t.mock.timers.setTime(start + index * 1000);
    assert.equal((await f.call('ui_open_note', { note_id: f.noteId })).dispatched, true);
  }
  await assert.rejects(() => f.call('ui_focus_object', {
    target: { type: 'note_page', note_id: f.noteId, page_index: 0 },
  }), /turn limit reached/);
  assert.equal(f.state.dispatched, 8);
  const next = JSON.parse(await executeTool('ui_open_note', { note_id: f.noteId }, USER, f.context, createAgentUiRunState('next-turn')));
  assert.equal(next.dispatched, true); assert.equal(next.command.turn_id, 'next-turn');
});

test('focus declines a hidden Base or named layer without changing visibility or any domain state', async t => {
  const f = await fixture(t);
  const focus = () => f.call('ui_focus_object', {
    target: { type: 'board_member', board_id: f.boardId, member_id: f.memberId },
  });
  f.db.transaction(() => updateBoard(f.db, USER, f.boardId, { base_layer_visible: false }))();
  const hiddenBase = snapshot(f.db);
  await assert.rejects(focus, /Board member is hidden/);
  assert.deepEqual(snapshot(f.db), hiddenBase);
  f.db.transaction(() => {
    const layer = createBoardLayer(f.db, USER, f.boardId, { name: 'Folded' });
    updateBoardLayer(f.db, USER, f.boardId, layer.id, { visible: false });
    updateBoardMember(f.db, USER, f.boardId, f.memberId, { layer_id: layer.id });
  })();
  const hiddenLayer = snapshot(f.db);
  await assert.rejects(focus, /Board member is hidden/);
  assert.deepEqual(snapshot(f.db), hiddenLayer);
  assert.equal(f.state.dispatched, 0);
});

class SSE extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  events: Array<{ type: string; data: any }> = [];
  constructor(private readonly onCommand: (command: AgentUiCommand) => void) { super(); }
  setHeader() { return this; }
  flushHeaders() {}
  write(chunk: string) {
    const [event, data] = chunk.trim().split('\n');
    const parsed = { type: event.slice(7), data: JSON.parse(data.slice(6)) };
    if (parsed.type === 'ui_command') this.onCommand(parsed.data);
    this.events.push(parsed);
    return true;
  }
  end() { this.writableEnded = true; this.emit('close'); return this; }
}

test('scripted C4a: actual SSE tools → committed paired history → command → receipt, with zero domain writes', async t => {
  const f = await fixture(t);
  const credentials = mkdtempSync(join(tmpdir(), 'ui-c4a-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: credentials, OPENAI_API_KEY: 'syn-ui',
    ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', VOYAGE_API_KEY: '' };
  t.after(() => { process.env = originalEnv; rmdirSync(credentials); });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No network in C4a scripted fixture'); });
  t.mock.method(MemoryManager.prototype, 'retrieveMemories', async () => []);
  t.mock.method(MemoryManager.prototype, 'extractMemories', () => {});
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-20T12:00:00Z') });
  const calls: ToolCall[] = [
    { id: 'open', name: 'ui_open_note', arguments: { note_id: f.noteId } },
    { id: 'block', name: 'ui_focus_object', arguments: { target: { type: 'note_block', note_id: f.noteId, block_id: f.blockId } } },
    { id: 'page', name: 'ui_focus_object', arguments: { target: { type: 'note_page', note_id: f.noteId, page_index: 1 } } },
    { id: 'member', name: 'ui_focus_object', arguments: { target: { type: 'board_member', board_id: f.boardId, member_id: f.memberId } } },
    { id: 'missing', name: 'ui_focus_object', arguments: { target: { type: 'note_page', note_id: f.noteId, page_index: 2 } } },
    { id: 'repeat', name: 'ui_open_note', arguments: { note_id: f.noteId } },
  ];
  let round = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    if (round++ === 0) for (const tool_call of calls) {
      yield { type: 'tool_call_start', tool_call };
      yield { type: 'tool_call_delta', tool_call, text: JSON.stringify(tool_call.arguments) };
      yield { type: 'tool_call_end', tool_call };
    } else yield { type: 'text', text: 'Presentation requests issued; missing page unavailable.' };
    yield { type: 'done' };
  });
  const before = snapshot(f.db, ['agent_messages', 'agent_conversations']);
  const req = Object.assign(new EventEmitter(), { userId: USER, params: { id: CONVERSATION },
    body: { message: 'Show these existing UI targets.' }, complete: true, aborted: false });
  const res = new SSE(command => {
    const rows = f.db.prepare('SELECT tool_results FROM agent_messages WHERE conversation_id=? AND turn_id=? AND tool_results IS NOT NULL')
      .all(CONVERSATION, command.turn_id) as Array<{ tool_results: string }>;
    assert.ok(rows.some(row => JSON.parse(row.tool_results).some((result: { content: string }) =>
      JSON.parse(result.content).command?.command_id === command.command_id)), 'pair is committed before UI dispatch');
  });
  type Handler = (req: AuthRequest, res: Response) => Promise<void>;
  const layers = agentRouter.stack as Array<{ route?: { path: string; methods: { post?: boolean }; stack: Array<{ handle: Handler }> } }>;
  const handle = layers.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route.methods.post)?.route?.stack[0].handle;
  assert.ok(handle);
  await handle(req as unknown as AuthRequest, res as unknown as Response);
  assert.equal(res.events.filter(event => event.type === 'error').length, 0);
  const commands = res.events.filter(event => event.type === 'ui_command').map(event => event.data as AgentUiCommand);
  assert.equal(commands.length, 4); assert.equal(new Set(commands.map(command => command.command_id)).size, 4);
  assert.deepEqual(commands.map(command => command.target.type), ['note', 'note_block', 'note_page', 'board_member']);
  assert.equal(new Set(commands.map(command => command.turn_id)).size, 1);
  const receipt = res.events.find(event => event.type === 'turn_receipt')!.data as AgentTurnReceipt;
  assert.equal(receipt.write_ok_count, 5); assert.equal(receipt.write_fail_count, 1); assert.deepEqual(receipt.read_calls, []);
  assert.deepEqual(receipt.write_calls.map(call => call.ok), [true, true, true, true, false, true]);
  assert.deepEqual(res.events.filter(event => event.type === 'tool_start').map(event => event.data.target_activity),
    [{ note_id: f.noteId }, { note_id: f.noteId }, { note_id: f.noteId }, { board_id: f.boardId }, { note_id: f.noteId }, { note_id: f.noteId }]);
  const rows = f.db.prepare('SELECT * FROM agent_messages WHERE conversation_id=? ORDER BY created_at,rowid')
    .all(CONVERSATION) as PersistedAgentMessage[];
  assert.deepEqual(projectMessageReceipts(rows).filter(row => row.role === 'assistant').at(-1)?.turn_receipt, receipt);
  assert.deepEqual(snapshot(f.db, ['agent_messages', 'agent_conversations']), before);
  assert.equal(res.events.at(-1)?.type, 'done');
});
