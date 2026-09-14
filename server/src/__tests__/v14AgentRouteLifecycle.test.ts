import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type { Response } from 'express';
import { MemoryManager } from '../agent/memory/manager.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderChatOptions, ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { AGENT_REQUEST_TIMEOUT_MS } from '../agent/runtime-budget.js';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import agentRouter from '../routes/agent.js';

const USER = 'synthetic-route-user';
const CONVERSATION = 'synthetic-route-conversation';
const COURSE = '22222222-2222-4222-8222-222222222222';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

class RouteResponse extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  endCount = 0;
  writes: string[] = [];
  setHeader() { return this; }
  flushHeaders() {}
  write(chunk: string) {
    assert.equal(this.writableEnded || this.destroyed, false, 'never write to a closed response');
    this.writes.push(chunk);
    this.emit('write', chunk);
    return true;
  }
  end() {
    assert.equal(this.writableEnded, false, 'end is sent only once');
    this.writableEnded = true;
    this.endCount++;
    this.emit('close');
    return this;
  }
  events() {
    return this.writes.map(chunk => {
      const [event, data] = chunk.trim().split('\n');
      return { type: event.slice('event: '.length), data: JSON.parse(data.slice('data: '.length)) };
    });
  }
}

type RouteHandler = (req: AuthRequest, res: Response) => Promise<void>;
type RouteLayer = { route?: { path: string; methods: { post?: boolean }; stack: Array<{ handle: RouteHandler }> } };
const layer = (agentRouter.stack as RouteLayer[]).find(entry =>
  entry.route?.path === '/conversations/:id/messages' && entry.route.methods.post);
assert.ok(layer?.route, 'the actual SSE route is registered');
const handle = layer.route.stack[0].handle;

async function fixture(t: TestContext) {
  // One short synthetic provider key; no app bootstrap, .env or machine key store.
  const credentialDirectory = mkdtempSync(join(tmpdir(), 'coincides-route-lifecycle-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: credentialDirectory, OPENAI_API_KEY: 'syn-loop-route' };
  t.after(() => { process.env = originalEnv; rmdirSync(credentialDirectory); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'route@example.invalid', 'synthetic', 'Synthetic route', JSON.stringify({ active_provider: 'openai' }));
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
    .run(CONVERSATION, USER, 'Synthetic lifecycle fixture');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(COURSE, USER, 'Synthetic course');
  const req = Object.assign(new EventEmitter(), {
    userId: USER, params: { id: CONVERSATION }, body: { message: 'Synthetic lifecycle request.' },
    complete: true, aborted: false,
  });
  const res = new RouteResponse();
  const run = () => handle(req as unknown as AuthRequest, res as unknown as Response);
  const assertCleaned = () => {
    assert.equal(req.listenerCount('close'), 0);
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  };
  return { db, req, res, run, assertCleaned };
}

function hangProvider(t: TestContext) {
  const started = deferred<AbortSignal>();
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (
    _messages: ProviderMessage[], _tools: ToolDefinition[], _prompt: string, options?: ProviderChatOptions,
  ): AsyncGenerator<StreamChunk> {
    assert.ok(options?.signal, 'the request cancellation signal reaches the provider');
    started.resolve(options.signal);
    await new Promise<void>(() => {});
  });
  return started.promise;
}

test('SSE lifecycle: a completely read request body close does not cancel a healthy response', async t => {
  const { req, res, run, assertCleaned } = await fixture(t);
  const started = deferred<AbortSignal>();
  const proceed = deferred<void>();
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (
    _messages: ProviderMessage[], _tools: ToolDefinition[], _prompt: string, options?: ProviderChatOptions,
  ): AsyncGenerator<StreamChunk> {
    assert.ok(options?.signal);
    started.resolve(options.signal);
    await proceed.promise;
    yield { type: 'text', text: 'Healthy response.' };
    yield { type: 'done' };
  });
  const running = run();
  const signal = await started.promise;
  req.emit('close');
  assert.equal(signal.aborted, false);
  proceed.resolve();
  await running;
  assert.deepEqual(res.events().map(event => event.type), ['text', 'turn_receipt', 'done']);
  assert.deepEqual(res.events()[1].data, {
    write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0,
  });
  assert.equal(res.endCount, 1);
  assertCleaned();
});

for (const close of ['request-aborted', 'request-incomplete-close', 'request-aborted-close', 'response-close'] as const) {
  test(`SSE lifecycle: ${close} aborts a hung provider and removes listeners`, { timeout: 10_000 }, async t => {
    const { req, res, run, assertCleaned } = await fixture(t);
    const started = hangProvider(t);
    const running = run();
    const signal = await started;
    if (close === 'response-close') {
      res.destroyed = true;
      res.emit('close');
    } else if (close === 'request-aborted') {
      req.aborted = true;
      req.emit('aborted');
    } else {
      req.complete = close !== 'request-incomplete-close';
      req.aborted = close === 'request-aborted-close';
      req.emit('close');
    }
    assert.equal(signal.aborted, true);
    await running;
    assert.deepEqual(res.writes, []);
    assert.equal(res.endCount, 0);
    assertCleaned();
  });
}

test('SSE lifecycle: the 300s deadline aborts a hung provider and emits error/done/end once', { timeout: 10_000 }, async t => {
  const { res, run, assertCleaned } = await fixture(t);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse('2026-09-14T12:00:00Z') });
  const started = hangProvider(t);
  const running = run();
  const signal = await started;
  t.mock.timers.tick(AGENT_REQUEST_TIMEOUT_MS - 1);
  assert.equal(res.writableEnded, false);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  await running;
  assert.equal(signal.aborted, true);
  assert.deepEqual(res.events().map(event => event.type), ['error', 'done']);
  assert.equal(res.events()[0].data.message, 'Request timed out after 300s');
  assert.equal(res.endCount, 1);
  const writes = [...res.writes];
  t.mock.timers.tick(AGENT_REQUEST_TIMEOUT_MS);
  assert.deepEqual(res.writes, writes, 'settled requests leave no late response timer');
  assertCleaned();
});

test('SSE lifecycle: an orchestration exception sends a factual receipt then one error/done and cleans up its timer', async t => {
  const { res, run, assertCleaned } = await fixture(t);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse('2026-09-14T12:00:00Z') });
  t.mock.method(MemoryManager.prototype, 'saveMessage', () => { throw new Error('Synthetic history failure'); });
  await run();
  assert.deepEqual(res.events().map(event => event.type), ['turn_receipt', 'error', 'done']);
  assert.deepEqual(res.events()[0].data, { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 });
  const legacyEvents = res.events().filter(event => event.type !== 'turn_receipt');
  assert.deepEqual(legacyEvents.map(event => event.type), ['error', 'done']);
  assert.equal(legacyEvents[0].data.message, 'Synthetic history failure');
  assert.equal(res.endCount, 1);
  const writes = [...res.writes];
  t.mock.timers.tick(AGENT_REQUEST_TIMEOUT_MS);
  assert.deepEqual(res.writes, writes);
  assertCleaned();
});

for (const disconnectEvent of ['tool_start', 'tool_end'] as const) {
  test(`SSE lifecycle: disconnect at ${disconnectEvent} preserves the write receipt and paired history without another provider round`, async t => {
    const { db, res, run, assertCleaned } = await fixture(t);
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
    let providerCalls = 0;
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
      providerCalls++;
      assert.equal(providerCalls, 1, 'disconnect forbids another provider call');
      yield { type: 'tool_call_start', tool_call: { id: 'call-write', name: 'create_deck' } };
      yield { type: 'tool_call_end', tool_call: {
        id: 'call-write', name: 'create_deck', arguments: { name: 'Synthetic receipt deck', course_id: COURSE },
      } };
      yield { type: 'done' };
    });
    res.on('write', (chunk: string) => {
      if (chunk.startsWith(`event: ${disconnectEvent}\n`)) {
        res.destroyed = true;
        res.emit('close');
      }
    });
    await run();
    assert.equal(providerCalls, 1);
    assert.deepEqual(res.events().map(event => event.type),
      disconnectEvent === 'tool_start' ? ['tool_start'] : ['tool_start', 'tool_end']);
    assert.deepEqual(db.prepare('SELECT name FROM card_decks').all(), [{ name: 'Synthetic receipt deck' }]);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM operation_batches').get() as { n: number }).n, 1);
    const history = new MemoryManager(USER).getConversationHistory(CONVERSATION);
    const callIndex = history.findIndex(message => message.tool_calls?.some(call => call.id === 'call-write'));
    assert.ok(callIndex >= 0, `the completed call remains replayable: ${JSON.stringify({
      rows: db.prepare('SELECT role,content,tool_calls,tool_results,created_at FROM agent_messages ORDER BY rowid').all(),
      history,
    })}`);
    const result = history[callIndex + 1].tool_results?.find(item => item.tool_call_id === 'call-write');
    assert.ok(result, 'the call retains its immediately following paired result');
    assert.equal(JSON.parse(result.content).name, 'Synthetic receipt deck');
    assert.equal(typeof JSON.parse(result.content).receipt_id, 'string');
    assertCleaned();
  });
}

test('SSE lifecycle: eight tool rounds emit a distinct round_limit and a visible compatible notice', async t => {
  const { res, run, assertCleaned } = await fixture(t);
  let providerCalls = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    const id = `call-round-${++providerCalls}`;
    yield { type: 'tool_call_start', tool_call: { id, name: 'list_courses' } };
    yield { type: 'tool_call_end', tool_call: { id, name: 'list_courses', arguments: {} } };
    yield { type: 'done' };
  });
  await run();
  assert.equal(providerCalls, 8);
  const events = res.events();
  assert.equal(events.filter(event => event.type === 'tool_end').length, 8);
  assert.deepEqual(events.slice(-4).map(event => event.type), ['round_limit', 'error', 'turn_receipt', 'done']);
  assert.equal(events.filter(event => event.type === 'turn_receipt').length, 1);
  assert.deepEqual(events.find(event => event.type === 'turn_receipt')!.data, {
    // This existing fixture has no argument delta: its empty raw arguments are
    // recorded failures while the eight-round lifecycle still reaches the limit.
    write_calls: [], read_calls: Array.from({ length: 8 }, () => ({ name: 'list_courses', ok: false })),
    write_ok_count: 0, write_fail_count: 0,
  });
  assert.equal(events.filter(event => event.type === 'error').length, 1);
  assert.equal(events.filter(event => event.type === 'done').length, 1);
  assert.equal(events.find(event => event.type === 'error')!.data.code, 'round_limit');
  assert.equal(res.endCount, 1);
  assertCleaned();
});
