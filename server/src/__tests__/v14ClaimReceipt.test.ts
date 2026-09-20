import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type { Response } from 'express';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import { AGENT_ACTION_TOOLS, AGENT_READ_TOOLS } from '../toolFace/registry.js';
import { assertToolEffectCoverage, DOOR_WRITE_TOOLS, CHANNEL_WRITE_TOOLS, READ_TOOLS } from '../agent/tools/effectClassification.js';
import { projectTurnReceipt, projectMessageReceipts, type PersistedAgentMessage } from '../agent/turnReceipt.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk } from '../agent/providers/types.js';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import agentRouter from '../routes/agent.js';
import { runAgent } from '../agent/orchestrator.js';
import { MemoryManager } from '../agent/memory/manager.js';

test('effect coverage: every exposed definition belongs to exactly one class (41/41 including C1)', () => {
  assertToolEffectCoverage(toolDefinitions);
  assert.equal(toolDefinitions.length, 41);
  assert.deepEqual([...DOOR_WRITE_TOOLS], AGENT_ACTION_TOOLS.map(tool => tool.name));
  assert.equal(CHANNEL_WRITE_TOOLS.size, 2);
  assert.equal(READ_TOOLS.size, 22);
  for (const tool of AGENT_READ_TOOLS) assert.ok(READ_TOOLS.has(tool.name));
});

test('effect coverage gate bites: an unclassified new definition fails with its name', () => {
  assert.throws(() => assertToolEffectCoverage([...toolDefinitions, { name: 'synthetic_unclassified_tool' }]),
    /missing.*synthetic_unclassified_tool/);
});

test('effect coverage also rejects stale classification and duplicate definitions', () => {
  assert.throws(() => assertToolEffectCoverage(toolDefinitions.filter(tool => tool.name !== 'save_memory')), /stale.*save_memory/);
  assert.throws(() => assertToolEffectCoverage([...toolDefinitions, toolDefinitions[0]]), /duplicateDefinitions/);
});

const empty: AgentTurnReceipt = { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 };
const message = (id: string, role = 'assistant', content = ''): PersistedAgentMessage => ({
  id, role, content, tool_calls: null, tool_results: null,
});
function pair(names: string[], contents: unknown[]): PersistedAgentMessage[] {
  return [
    { ...message('calls'), tool_calls: JSON.stringify(names.map((name, index) => ({ id: `call-${index}`, name, arguments: {} }))) },
    { ...message('results', 'user'), tool_results: JSON.stringify(contents.map((content, index) => ({ tool_call_id: `call-${index}`, content: JSON.stringify(content) }))) },
  ];
}

test('no tools and text-only turns produce a factual empty receipt', () => {
  assert.deepEqual(projectTurnReceipt([message('text', 'assistant', '已保存')]), empty);
});

test('writes include both registered door and channel writes; reads stay separate', () => {
  assert.deepEqual(projectTurnReceipt(pair(['create_deck', 'save_memory', 'create_proposal', 'read_note'],
    [{ receipt_id: 'r' }, { id: 'memory' }, { id: 'proposal', status: 'pending' }, { blocks: [] }])), {
    write_calls: [{ name: 'create_deck', ok: true }, { name: 'save_memory', ok: true }, { name: 'create_proposal', ok: true }],
    read_calls: [{ name: 'read_note', ok: true }], write_ok_count: 3, write_fail_count: 0,
  });
});

test('pure reads include all four V2 readers and collect_preferences is only a form', () => {
  const names = [...AGENT_READ_TOOLS.map(tool => tool.name), 'collect_preferences'];
  assert.deepEqual(projectTurnReceipt(pair(names, names.map(() => ({ __type: 'preference_form' })))), {
    ...empty, read_calls: names.map(name => ({ name, ok: true })),
  });
});

test('failed, missing and mismatched results never become successful writes', () => {
  const rows = pair(['create_deck', 'save_memory', 'create_proposal'], [{ error: 'denied' }, { success: false }]);
  assert.deepEqual(projectTurnReceipt(rows), { ...empty,
    write_calls: ['create_deck', 'save_memory', 'create_proposal'].map(name => ({ name, ok: false })), write_fail_count: 3,
  });
  rows[1].tool_results = JSON.stringify([{ tool_call_id: 'unrelated', content: '{}' }]);
  assert.equal(projectTurnReceipt(rows).write_ok_count, 0);
});

test('delete restatement does not claim a completed deletion, confirmed receipt does', () => {
  assert.deepEqual(projectTurnReceipt(pair(['delete_time_block', 'delete_time_block'], [
    { authorization_id: 'auth', restatement: { block: {} } }, { receipt_id: 'receipt', deleted_block_id: 'block' },
  ])), { ...empty, write_calls: [{ name: 'delete_time_block', ok: false }, { name: 'delete_time_block', ok: true }],
    write_ok_count: 1, write_fail_count: 1 });
});

test('matching is by ID within a tool round, including reversed results and reused IDs', () => {
  const first = pair(['save_memory', 'save_memory'], [{ error: 'failed' }, { id: 'saved' }]);
  first[1].tool_results = JSON.parse(first[1].tool_results as string).reverse();
  const receipt = projectTurnReceipt([...first, ...pair(['save_memory'], [{ error: 'later failed' }])]);
  assert.deepEqual(receipt.write_calls.map(call => call.ok), [false, true, false]);
  const duplicate = pair(['save_memory'], [{}]);
  duplicate[1].tool_results = [...JSON.parse(duplicate[1].tool_results as string), ...JSON.parse(duplicate[1].tool_results as string)];
  assert.equal(projectTurnReceipt(duplicate).write_ok_count, 0);
  const duplicateCalls = pair(['save_memory'], [{}]);
  duplicateCalls[0].tool_calls = [...JSON.parse(duplicateCalls[0].tool_calls as string), ...JSON.parse(duplicateCalls[0].tool_calls as string)];
  assert.equal(projectTurnReceipt(duplicateCalls).write_ok_count, 0);
});

test('malformed historic fields do not crash; unknown retired names remain unclassified', () => {
  assert.deepEqual(projectTurnReceipt([{ ...message('bad'), tool_calls: '{bad' }]), empty);
  const rows = pair(['retired_tool'], [{}]);
  assert.deepEqual(projectTurnReceipt(rows), { ...empty, unclassified_calls: [{ name: 'retired_tool', ok: true }] });
  rows[0].tool_calls = JSON.parse(rows[0].tool_calls as string);
  rows[1].tool_results = 'broken';
  assert.equal(projectTurnReceipt(rows).unclassified_calls?.[0].ok, false);
});

test('history groups internal rounds by turn identity and decorates only the last assistant', () => {
  const rows = [
    ...[message('u1', 'user', 'Please save'), ...pair(['save_memory'], [{ id: 'm' }]),
      message('a1', 'assistant', '已保存')].map(row => ({ ...row, turn_id: 'turn-1' })),
    ...[message('u2', 'user', 'Look'), ...pair(['list_courses'], [[]]),
      message('a2', 'assistant', 'Found')].map(row => ({ ...row, turn_id: 'turn-2' })),
  ];
  const before = JSON.stringify(rows);
  const projected = projectMessageReceipts(rows);
  assert.equal(projected[1].turn_receipt, undefined);
  assert.equal(projected[3].turn_receipt?.write_ok_count, 1);
  assert.equal(projected[7].turn_receipt?.write_ok_count, 0);
  assert.deepEqual(projected[7].turn_receipt?.read_calls, [{ name: 'list_courses', ok: true }]);
  assert.equal(projected[0].turn_receipt, undefined);
  assert.equal(JSON.stringify(rows), before);
});

const USER = 'receipt-user';
const CONVERSATION = 'receipt-conversation';
const COURSE = '22222222-2222-4222-8222-222222222222';
type Handler = (req: AuthRequest, res: Response) => Promise<void> | void;
function handler(method: 'get' | 'post'): Handler {
  const layers = agentRouter.stack as Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> } }>;
  const route = layers.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route.methods[method])?.route;
  assert.ok(route);
  return route.stack[0].handle;
}

class SSE extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  events: Array<{ type: string; data: unknown }> = [];
  setHeader() { return this; }
  flushHeaders() {}
  write(chunk: string) {
    const [event, data] = chunk.trim().split('\n');
    this.events.push({ type: event.slice(7), data: JSON.parse(data.slice(6)) });
    return true;
  }
  end() { this.writableEnded = true; this.emit('close'); return this; }
}

async function fixture(t: TestContext) {
  const credentials = mkdtempSync(join(tmpdir(), 'claim-receipt-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: credentials, OPENAI_API_KEY: 'syn-receipt',
    ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', VOYAGE_API_KEY: '' };
  t.after(() => { process.env = originalEnv; rmdirSync(credentials); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'receipt@example.invalid', 'synthetic', 'Receipt', JSON.stringify({ active_provider: 'openai' }));
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)').run(CONVERSATION, USER, 'Receipt fixture');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(COURSE, USER, 'Synthetic course');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network in receipt fixture'); });
  async function post() {
    const req = Object.assign(new EventEmitter(), { userId: USER, params: { id: CONVERSATION },
      body: { message: 'Synthetic request.' }, complete: true, aborted: false });
    const res = new SSE();
    await handler('post')(req as unknown as AuthRequest, res as unknown as Response);
    return res.events;
  }
  function get(userId = USER) {
    let body: Array<PersistedAgentMessage & { turn_receipt?: AgentTurnReceipt }> = [];
    handler('get')({ userId, params: { id: CONVERSATION } } as unknown as AuthRequest,
      { json: (data: typeof body) => { body = data; } } as Response);
    return body;
  }
  return { db, post, get };
}

for (const scenario of [
  { name: 'zero tools', calls: [] as string[], write: 0, fail: 0, read: 0, claim: true },
  { name: 'memory channel', calls: ['save_memory'], write: 1, fail: 0, read: 0, claim: false },
  { name: 'proposal channel', calls: ['create_proposal'], write: 1, fail: 0, read: 0, claim: false },
  { name: 'door and read', calls: ['create_deck', 'list_courses'], write: 1, fail: 0, read: 1, claim: false },
  { name: 'failed write', calls: ['create_deck_failed'], write: 0, fail: 1, read: 0, claim: true },
  { name: 'pure read', calls: ['list_courses'], write: 0, fail: 0, read: 1, claim: true },
]) {
  test(`persisted SSE/history/observation integration: ${scenario.name}`, async t => {
    const { db, post, get } = await fixture(t);
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
    let round = 0;
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
      if (round++ === 0 && scenario.calls.length) {
        for (const [index, name] of scenario.calls.entries()) {
          const toolName = name === 'create_deck_failed' ? 'create_deck' : name;
          const args = name === 'save_memory' ? { category: 'preference', content: 'Synthetic preference' }
            : name === 'create_proposal' ? { type: 'study_plan', data: { title: 'Synthetic', description: 'Synthetic', items: [{ title: 'Task', course_id: COURSE }] } }
            : name === 'create_deck' ? { name: 'Receipt deck', course_id: COURSE } : {};
          const tool_call = { id: `call-${index}`, name: toolName, arguments: args };
          yield { type: 'tool_call_start', tool_call };
          yield { type: 'tool_call_delta', tool_call, text: JSON.stringify(args) };
          yield { type: 'tool_call_end', tool_call };
        }
      } else yield { type: 'text', text: '已保存。' };
      yield { type: 'done' };
    });
    const events = await post();
    assert.deepEqual(events.slice(-2).map(event => event.type), ['turn_receipt', 'done']);
    assert.equal(events.filter(event => event.type === 'turn_receipt').length, 1);
    assert.equal(events.filter(event => event.type === 'error').length, 0);
    const receipt = events.at(-2)!.data as AgentTurnReceipt;
    assert.equal(receipt.write_ok_count, scenario.write);
    assert.equal(receipt.write_fail_count, scenario.fail);
    assert.equal(receipt.read_calls.length, scenario.read);
    assert.ok(receipt.read_calls.every(call => call.ok), 'pure-read and mixed fixtures execute successful readers');
    assert.equal(events.filter(event => event.type === 'text').map(event => (event.data as { content: string }).content).join(''), '已保存。');
    // An old consumer can ignore the extension without losing any of its events.
    const legacy = events.filter(event => event.type !== 'turn_receipt');
    assert.equal(legacy.at(-1)?.type, 'done');
    assert.equal(legacy.filter(event => event.type === 'tool_end').length, scenario.calls.length);
    const changes = db.prepare('SELECT total_changes() AS n').get();
    const history = get();
    const assistants = history.filter(row => row.role === 'assistant');
    assert.deepEqual(assistants.at(-1)?.turn_receipt, receipt);
    for (const row of assistants.slice(0, -1)) assert.equal(row.turn_receipt, undefined);
    assert.equal(new Set(history.map(row => row.turn_id)).size, 1);
    assert.match(history[0].turn_id!, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
    assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), changes, 'history projection never writes or backfills');
    assert.throws(() => get('other-user'), /Conversation not found/);
    const flags = db.prepare("SELECT * FROM events WHERE verb = 'claim_without_receipt'").all();
    assert.equal(flags.length, scenario.claim ? 1 : 0);
    const columns = db.prepare('PRAGMA table_info(agent_messages)').all() as Array<{ name: string }>;
    assert.equal(columns.some(column => column.name === 'turn_receipt'), false);
  });
}

test('NULL legacy history never gains guessed receipts or gets backfilled', async t => {
  const { db, get } = await fixture(t);
  const rows = [message('old-user', 'user', 'Old request'), ...pair(['save_memory'], [{ id: 'old-memory' }]),
    message('old-final', 'assistant', '已记住'), message('new-user', 'user', 'Another request'), message('new-final', 'assistant', 'Nothing changed')];
  for (const row of rows) db.prepare('INSERT INTO agent_messages(id,conversation_id,role,content,tool_calls,tool_results,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(row.id, CONVERSATION, row.role, row.content, row.tool_calls, row.tool_results, '2026-01-01T00:00:00Z');
  const before = db.prepare('SELECT * FROM agent_messages ORDER BY rowid').all();
  const history = get();
  assert.ok(history.every(row => row.turn_receipt === undefined));
  assert.ok(history.every(row => row.turn_id === null));
  assert.deepEqual(db.prepare('SELECT * FROM agent_messages ORDER BY rowid').all(), before);
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function collect(generator: AsyncGenerator<StreamChunk>) {
  const events: StreamChunk[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

for (const bFinishesFirst of [false, true]) {
  test(`overlapping real runs retain exact live/history ownership; B finishes first=${bFinishesFirst}`, { timeout: 10000 }, async t => {
    const { db, get } = await fixture(t);
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
    const aStarted = deferred();
    const bStarted = deferred();
    const allowA = deferred();
    const allowB = deferred();
    let aCalls = 0;
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (messages: ProviderMessage[]): AsyncGenerator<StreamChunk> {
      const request = [...messages].reverse().find(row => row.role === 'user' && !row.tool_results)?.content;
      if (request === 'Request A.') {
        if (aCalls++ === 0) {
          aStarted.resolve();
          await allowA.promise;
          const tool_call = { id: 'a-save', name: 'save_memory', arguments: { category: 'preference', content: 'Synthetic overlap memory.' } };
          yield { type: 'tool_call_start', tool_call };
          yield { type: 'tool_call_end', tool_call };
        } else yield { type: 'text', text: 'A 已保存。' };
      } else if (request === 'Request B.') {
        bStarted.resolve();
        await allowB.promise;
        yield { type: 'text', text: bFinishesFirst ? 'B 已保存。' : 'B ordinary response.' };
      } else throw new Error('Unexpected synthetic request');
      yield { type: 'done' };
    });
    const aRunning = collect(runAgent(USER, CONVERSATION, 'Request A.'));
    await aStarted.promise;
    const bRunning = collect(runAgent(USER, CONVERSATION, 'Request B.'));
    await bStarted.promise;
    const beforeRelease = get();
    assert.deepEqual(beforeRelease.map(row => [row.role, row.content]), [['user', 'Request A.'], ['user', 'Request B.']],
      'both user rows persist before either provider is released; no queue or serialization');
    assert.notEqual(beforeRelease[0].turn_id, beforeRelease[1].turn_id);
    if (bFinishesFirst) { allowB.resolve(); await bRunning; allowA.resolve(); }
    else { allowA.resolve(); await aRunning; allowB.resolve(); }
    const [aEvents, bEvents] = await Promise.all([aRunning, bRunning]);
    for (const events of [aEvents, bEvents]) assert.deepEqual(events.slice(-2).map(event => event.type), ['turn_receipt', 'done']);
    const aLive = aEvents.at(-2)!.data as AgentTurnReceipt;
    const bLive = bEvents.at(-2)!.data as AgentTurnReceipt;
    assert.equal(aLive.write_ok_count, 1);
    assert.deepEqual(bLive, empty);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM agent_memories').get() as { n: number }).n, 1);
    const history = get();
    const aFinal = history.find(row => row.content === 'A 已保存。')!;
    const bFinal = history.find(row => row.role === 'assistant' && row.content.startsWith('B '))!;
    assert.deepEqual(aFinal.turn_receipt, aLive);
    assert.deepEqual(bFinal.turn_receipt, bLive);
    assert.equal(aFinal.turn_id, beforeRelease[0].turn_id);
    assert.equal(bFinal.turn_id, beforeRelease[1].turn_id);
    assert.equal(history.filter(row => row.turn_id === aFinal.turn_id).length, 4);
    assert.equal(history.filter(row => row.turn_id === bFinal.turn_id).length, 2);
    assert.equal(history.filter(row => row.turn_receipt).length, 2);
    const flags = db.prepare("SELECT meta FROM events WHERE verb = 'claim_without_receipt'").all() as { meta: string }[];
    assert.equal(flags.length, bFinishesFirst ? 1 : 0);
    if (bFinishesFirst) assert.equal(JSON.parse(flags[0].meta).message_id, bFinal.id);
  });
}

for (const failure of ['first_user', 'tool_pair', 'final', 'interrupted', 'bookkeeping', 'extract'] as const) {
  test(`unexpected ${failure} failure still emits one receipt from committed rows before error/done`, async t => {
    const { db, post, get } = await fixture(t);
    const condition = failure === 'first_user' ? "NEW.role = 'user'"
      : failure === 'tool_pair' ? 'NEW.tool_results IS NOT NULL'
      : "NEW.role = 'assistant' AND NEW.tool_calls IS NULL";
    if (failure === 'bookkeeping') {
      db.exec(`CREATE TEMP TRIGGER synthetic_bookkeeping_failure BEFORE UPDATE ON agent_conversations
        WHEN EXISTS(SELECT 1 FROM agent_messages WHERE role = 'assistant' AND tool_calls IS NULL)
        BEGIN SELECT RAISE(ABORT, 'synthetic bookkeeping failure'); END`);
    } else if (failure === 'extract') {
      t.mock.method(MemoryManager.prototype, 'extractMemories', () => { throw new Error('synthetic extraction failure'); });
    } else {
      db.exec(`CREATE TEMP TRIGGER synthetic_message_failure BEFORE INSERT ON agent_messages WHEN ${condition}
        BEGIN SELECT RAISE(ABORT, 'synthetic message failure'); END`);
    }
    let round = 0;
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
      if (round++ === 0) {
        const tool_call = { id: 'saved-before-failure', name: 'save_memory', arguments: { category: 'preference', content: 'Synthetic failure-path memory.' } };
        yield { type: 'tool_call_start', tool_call };
        yield { type: 'tool_call_end', tool_call };
      } else {
        yield { type: 'text', text: '已保存。' };
        if (failure === 'interrupted') throw new Error('synthetic provider failure');
      }
      yield { type: 'done' };
    });
    const events = await post();
    assert.deepEqual(events.slice(-3).map(event => event.type), ['turn_receipt', 'error', 'done']);
    assert.equal(events.filter(event => event.type === 'turn_receipt').length, 1);
    assert.equal(events.filter(event => event.type === 'error').length, 1);
    const receipt = events.at(-3)!.data as AgentTurnReceipt;
    const history = get();
    assert.deepEqual(receipt, projectTurnReceipt(history));
    assert.equal(receipt.write_ok_count, ['first_user', 'tool_pair'].includes(failure) ? 0 : 1);
    if (failure === 'first_user') assert.equal(history.length, 0);
    else {
      assert.equal(new Set(history.map(row => row.turn_id)).size, 1);
      assert.ok(history[0].turn_id);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM agent_memories').get() as { n: number }).n, 1);
      if (failure === 'tool_pair') assert.equal(history.length, 1, 'failed pair transaction left no phantom assistant/result evidence');
      else assert.deepEqual(history.find(row => row.turn_receipt)?.turn_receipt, receipt);
    }
    if (failure === 'bookkeeping' || failure === 'extract') {
      assert.equal(history.at(-1)?.content, '已保存。', 'final row committed before the later failure remains attributable');
    }
  });
}
