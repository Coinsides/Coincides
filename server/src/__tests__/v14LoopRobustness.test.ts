import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate as nextTurn } from 'node:timers/promises';
import test, { type TestContext } from 'node:test';
import { runAgent } from '../agent/orchestrator.js';
import { MemoryManager } from '../agent/memory/manager.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { AGENT_REQUEST_TIMEOUT_MS, AGENT_ROUND_TIMEOUT_MS, AGENT_TOOL_TIMEOUT_MS } from '../agent/runtime-budget.js';
import { closeDb, initDb } from '../db/init.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../services/courseMaterials.js';

const USER = 'loop-user';
const CONVERSATION = 'loop-conversation';
const COURSE = '11111111-1111-4111-8111-111111111111';
const DOCUMENT = '22222222-2222-4222-8222-222222222222';
const NOW = Date.parse('2026-09-14T12:00:00.000Z');
type Db = Awaited<ReturnType<typeof initDb>>;
type SavedMessage = { role: string; content: string; tool_calls: string | null; tool_results: string | null };
type ChatOptions = { signal?: AbortSignal };

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}

async function fixture(t: TestContext) {
  // Real orchestrator/executor/memory with SQLite :memory:. The empty directory
  // and short synthetic keys prevent access to machine credentials or live APIs.
  const directory = mkdtempSync(join(tmpdir(), 'loop-fixture-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: directory,
    OPENAI_API_KEY: 'syn-loop', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', VOYAGE_API_KEY: '' };
  t.after(() => { process.env = originalEnv; rmdirSync(directory); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'loop@example.invalid', 'synthetic', 'Loop Reader', JSON.stringify({ active_provider: 'openai' }));
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(COURSE, USER, 'Reading');
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
    .run(CONVERSATION, USER, 'Loop robustness');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request in isolated loop fixture'); });
  return db;
}

function saved(db: Db): SavedMessage[] {
  return db.prepare('SELECT role,content,tool_calls,tool_results FROM agent_messages WHERE conversation_id=? ORDER BY rowid')
    .all(CONVERSATION) as SavedMessage[];
}

async function collect(stream: AsyncGenerator<StreamChunk>, events: StreamChunk[] = []) {
  for await (const event of stream) events.push(event);
  return events;
}

function assertEmptyTurnReceipt(event: StreamChunk) {
  assert.equal(event.type, 'turn_receipt');
  assert.deepEqual(event.data, { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 });
}

function tool(id: string, name = 'list_courses', args: Record<string, unknown> = {}): StreamChunk[] {
  const tool_call = { id, name, arguments: args };
  return [
    { type: 'tool_call_start', tool_call },
    { type: 'tool_call_delta', tool_call, text: JSON.stringify(args) },
    { type: 'tool_call_end', tool_call },
    { type: 'done' },
  ];
}

function assertReplayPairs(history: ProviderMessage[], expected: number) {
  let pairs = 0;
  for (let index = 0; index < history.length; index++) {
    const message = history[index];
    if (message.tool_calls?.length) {
      assert.deepEqual(history[index + 1]?.tool_results?.map(result => result.tool_call_id),
        message.tool_calls.map(call => call.id), 'every tool_use has its immediately following matching result');
      pairs++;
    }
    if (message.tool_results?.length) assert.ok(history[index - 1]?.tool_calls?.length, 'no orphaned result');
  }
  assert.equal(pairs, expected, 'history sanitation must retain all completed tool rounds');
}

test('loop budgets declare request=300s, round=300s and tool=60s', () => {
  assert.equal(AGENT_REQUEST_TIMEOUT_MS, 300_000);
  assert.equal(AGENT_ROUND_TIMEOUT_MS, 300_000);
  assert.equal(AGENT_TOOL_TIMEOUT_MS, 60_000);
});

test('a permanently hung iterator times out at 300s even when iterator return never settles', async t => {
  const db = await fixture(t);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  let signal: AbortSignal | undefined;
  let nextCalls = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', (_messages: ProviderMessage[], _tools: ToolDefinition[], _prompt: string, options?: ChatOptions) => {
    signal = options?.signal;
    return {
      [Symbol.asyncIterator]() { return this; },
      next() {
        nextCalls++;
        if (nextCalls === 1) return Promise.resolve({ done: false, value: { type: 'text', text: 'Visible prefix.' } });
        return new Promise(() => {});
      },
      return() { return new Promise(() => {}); },
    };
  });
  const stream = runAgent(USER, CONVERSATION, 'Continue.');
  assert.deepEqual((await stream.next()).value, { type: 'text', text: 'Visible prefix.' });
  let resolved = false;
  const pending = stream.next().then(result => { resolved = true; return result; });
  await nextTurn();
  t.mock.timers.tick(299_999);
  await nextTurn();
  assert.equal(resolved, false, 'full declared budget remains available before the boundary');
  t.mock.timers.tick(1);
  const result = await pending;
  assertEmptyTurnReceipt(result.value);
  const failure = (await stream.next()).value;
  assert.equal(failure.type, 'error');
  assert.match(failure.error, /tim(?:ed?\s*out|eout)/i);
  assert.ok(signal?.aborted, 'the provider is aborted without relying on another stream chunk');
  assert.equal((await stream.next()).done, true);
  assert.deepEqual(saved(db).filter(row => row.role === 'assistant'), [
    { role: 'assistant', content: 'Visible prefix.\n\n[interrupted]', tool_calls: null, tool_results: null },
  ]);
});

test('request abort wakes a provider that ignores its signal and saves visible text before yielding error', async t => {
  const db = await fixture(t);
  const controller = new AbortController();
  let providerSignal: AbortSignal | undefined;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (_messages: ProviderMessage[], _tools: ToolDefinition[], _prompt: string, options?: ChatOptions): AsyncGenerator<StreamChunk> {
    providerSignal = options?.signal;
    yield { type: 'text', text: 'Already visible.' };
    await new Promise(() => {});
  });
  const stream = runAgent(USER, CONVERSATION, 'Continue.', undefined, undefined, { signal: controller.signal });
  assert.equal((await stream.next()).value.type, 'text');
  const pending = stream.next();
  await nextTurn();
  controller.abort(new Error('Synthetic disconnect'));
  const result = await pending;
  assertEmptyTurnReceipt(result.value);
  assert.ok(providerSignal?.aborted);
  assert.equal(saved(db).at(-1)?.content, 'Already visible.\n\n[interrupted]');
  assert.equal((await stream.next()).value.type, 'error');
  assert.equal((await stream.next()).done, true);
});

for (const failure of ['error chunk', 'thrown exception'] as const) {
  test(`${failure} preserves text and discards unexecuted tool calls without orphaning replay`, async t => {
    const db = await fixture(t);
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
      yield { type: 'text', text: 'Visible before failure.' };
      yield* tool('unexecuted', 'create_deck', { name: 'Must not exist', course_id: COURSE }).slice(0, -1);
      if (failure === 'error chunk') yield { type: 'error', error: 'Synthetic provider failure' };
      else throw new Error('Synthetic provider failure');
    });
    const stream = runAgent(USER, CONVERSATION, 'Continue.');
    assert.equal((await stream.next()).value.type, 'text');
    assertEmptyTurnReceipt((await stream.next()).value);
    assert.equal((await stream.next()).value.type, 'error');
    const assistant = saved(db).filter(row => row.role === 'assistant');
    assert.deepEqual(assistant, [
      { role: 'assistant', content: 'Visible before failure.\n\n[interrupted]', tool_calls: null, tool_results: null },
    ]);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM card_decks').get() as { n: number }).n, 0);
    assert.equal((await stream.next()).done, true);
    assert.deepEqual(saved(db).filter(row => row.role === 'assistant'), assistant, 'no duplicate save during generator completion');
    const replay = new MemoryManager(USER).getConversationHistory(CONVERSATION);
    assert.equal(replay.filter(message => message.content === assistant[0].content).length, 1);
    assertReplayPairs(replay, 0);
  });
}

test('a provider failure before text does not manufacture an interrupted assistant message', async t => {
  const db = await fixture(t);
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    yield { type: 'error', error: 'Synthetic early failure' };
  });
  const events = await collect(runAgent(USER, CONVERSATION, 'Continue.'));
  assert.deepEqual(events.map(event => event.type), ['turn_receipt', 'error']);
  assertEmptyTurnReceipt(events[0]);
  assert.equal(saved(db).filter(row => row.role === 'assistant').length, 0);
});

test('eight completed tool rounds emit one round_limit before done and retain eight paired histories', async t => {
  const db = await fixture(t);
  let rounds = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    rounds++;
    yield { type: 'text', text: `Round ${rounds}.` };
    yield* tool(`call-${rounds}`);
  });
  const events = await collect(runAgent(USER, CONVERSATION, 'Continue.'));
  assert.equal(rounds, 8);
  assert.deepEqual(events.slice(-4).map(event => event.type), ['round_limit', 'turn_receipt', 'message_meta', 'done']);
  assert.equal(events.filter(event => event.type === 'turn_receipt').length, 1);
  assert.deepEqual(events.find(event => event.type === 'turn_receipt')!.data, {
    write_calls: [], read_calls: Array.from({ length: 8 }, () => ({ name: 'list_courses', ok: true })),
    write_ok_count: 0, write_fail_count: 0,
  });
  assert.equal(events.filter(event => event.type === 'round_limit').length, 1);
  assert.equal((events.find(event => event.type === 'round_limit')!.data as { max_rounds: number }).max_rounds, 8);
  assert.equal(events.filter(event => event.type === 'tool_call_end' && !event.error).length, 8);
  const assistant = saved(db).filter(row => row.role === 'assistant');
  assert.equal(assistant.length, 8, 'the final tool-round text is not saved again at exhaustion');
  const finalMessage = db.prepare("SELECT id,content FROM agent_messages WHERE conversation_id=? AND role='assistant' ORDER BY rowid DESC LIMIT 1")
    .get(CONVERSATION) as { id: string; content: string };
  assert.deepEqual(events.find(event => event.type === 'message_meta')!.data,
    { message_id: finalMessage.id, meta: {}, content: finalMessage.content });
  assert.equal(finalMessage.content, 'Round 8.');
  assert.ok(assistant.every(row => row.tool_calls !== null));
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 8);
});

test('error after a completed tool round preserves its pair and the interrupted next-round text through replay', async t => {
  const db = await fixture(t);
  let rounds = 0;
  const received: ProviderMessage[][] = [];
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (messages: ProviderMessage[]): AsyncGenerator<StreamChunk> {
    received.push(structuredClone(messages));
    rounds++;
    if (rounds === 1) {
      yield { type: 'text', text: 'Tool prelude.' };
      yield* tool('paired-call');
    } else if (rounds === 2) {
      yield { type: 'text', text: 'Incomplete answer.' };
      throw new Error('Synthetic late failure');
    } else {
      yield { type: 'text', text: 'Resumed answer.' };
      yield { type: 'done' };
    }
  });
  const first = await collect(runAgent(USER, CONVERSATION, 'Continue.'));
  assert.equal(first.at(-1)?.type, 'error');
  assert.deepEqual(saved(db).filter(row => row.role === 'assistant').map(row => row.content),
    ['Tool prelude.', 'Incomplete answer.\n\n[interrupted]']);
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
  await collect(runAgent(USER, CONVERSATION, 'Resume.'));
  assertReplayPairs(received[2], 1);
  assert.equal(received[2].filter(message => message.content === 'Incomplete answer.\n\n[interrupted]').length, 1);
  assert.equal(saved(db).filter(row => row.content === 'Tool prelude.').length, 1);
});

test('an expired request deadline prevents the first provider call', async t => {
  await fixture(t);
  let calls = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> { calls++; yield { type: 'done' }; });
  const events = await collect(runAgent(USER, CONVERSATION, 'Continue.', undefined, undefined, { deadline: Date.now() - 1 }));
  assert.equal(calls, 0);
  assert.deepEqual(events.map(event => event.type), ['error'], 'context failure before a saved user turn has no receipt');
});

test('request deadline is checked between tool rounds without duplicating committed text', async t => {
  const db = await fixture(t);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  let rounds = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    rounds++;
    yield { type: 'text', text: 'Before tool.' };
    yield* tool('deadline-call');
  });
  const stream = runAgent(USER, CONVERSATION, 'Continue.', undefined, undefined, { deadline: NOW + 100 });
  while ((await stream.next()).value.type !== 'tool_call_end') { /* reach the committed round */ }
  t.mock.timers.tick(100);
  const events = await collect(stream);
  assert.equal(rounds, 1);
  assert.equal(events.at(-1)?.type, 'error');
  assert.deepEqual(saved(db).filter(row => row.role === 'assistant').map(row => row.content), ['Before tool.']);
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
});

test('the second hanging round uses only the remainder of the default 300s request budget', async t => {
  const db = await fixture(t);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  let rounds = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
    rounds++;
    if (rounds === 1) yield* tool('budget-call');
    else { yield { type: 'text', text: 'Second round.' }; await new Promise(() => {}); }
  });
  const stream = runAgent(USER, CONVERSATION, 'Continue.');
  while ((await stream.next()).value.type !== 'tool_call_end') { /* first round finished */ }
  t.mock.timers.tick(120_000);
  assert.equal((await stream.next()).value.type, 'text');
  let settled = false;
  const pending = stream.next().then(result => { settled = true; return result; });
  await nextTurn();
  t.mock.timers.tick(179_999);
  await nextTurn();
  assert.equal(settled, false);
  t.mock.timers.tick(1);
  const receipt = (await pending).value;
  assert.equal(receipt.type, 'turn_receipt');
  assert.deepEqual(receipt.data, {
    write_calls: [], read_calls: [{ name: 'list_courses', ok: true }], write_ok_count: 0, write_fail_count: 0,
  });
  assert.equal((await stream.next()).value.type, 'error');
  assert.equal(rounds, 2);
  assert.equal(saved(db).at(-1)?.content, 'Second round.\n\n[interrupted]');
  await stream.next();
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
});

function seedProposalSources(db: Db) {
  db.prepare(`INSERT INTO documents(id,user_id,course_id,filename,file_path,file_type,parse_status,extracted_text,page_count,document_type,chunk_count)
    VALUES(?,?,?,?,?,'pdf','completed',?,1,'slides',1)`)
    .run(DOCUMENT, USER, COURSE, 'synthetic.pdf', 'synthetic/source.pdf', 'Limits approach a value.');
  db.prepare('INSERT INTO document_chunks(id,document_id,chunk_index,content,page_start,page_end,heading) VALUES(?,?,0,?,1,1,?)')
    .run('loop-chunk', DOCUMENT, 'Limits approach a value.', 'Limits');
  for (const material of listCourseMaterials(db, USER, COURSE) as Array<{ id: string }>) {
    ensureSegmentsForMaterial(db, USER, material.id);
  }
}

function slowProposal(t: TestContext, db: Db) {
  seedProposalSources(db);
  const started = deferred();
  const release = deferred();
  let rounds = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (_messages: ProviderMessage[], tools: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    // The actual create_proposal executor calls the same provider to generate
    // blocks with no tool definitions. Delay only that nested provider, then let
    // the unchanged proposal service perform its real transaction and event.
    if (tools.length === 0) {
      started.resolve();
      await release.promise;
      yield { type: 'text', text: JSON.stringify({ blocks: [{ block_type: 'paragraph', plain_text: 'Limits approach a value.' }] }) };
      yield { type: 'done' };
      return;
    }
    rounds++;
    if (rounds === 1) {
      yield { type: 'text', text: 'Preparing the proposal.' };
      yield* tool('slow-proposal', 'create_proposal', { type: 'organized_note',
        data: { course_id: COURSE, document_ids: [DOCUMENT], note_title: 'Synthetic limits' } });
    } else {
      yield { type: 'text', text: 'Tool result received.' };
      yield { type: 'done' };
    }
  });
  return { started, release, rounds: () => rounds };
}

function assertProposalCommitted(db: Db) {
  assert.deepEqual(db.prepare('SELECT type,status,conversation_id FROM proposals').all(), [
    { type: 'organized_note', status: 'pending', conversation_id: CONVERSATION },
  ]);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM events WHERE verb='proposal_issued' AND actor_kind='agent' AND channel='chat'")
    .get() as { n: number }).n, 1, 'the actual write retains its existing visible proposal event');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM notes').get() as { n: number }).n, 0, 'proposal submission never applies the proposal');
}

test('a real slow tool times out at 60s with a matched error result while its later write still commits', async t => {
  const db = await fixture(t);
  const slow = slowProposal(t, db);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  const events: StreamChunk[] = [];
  const running = collect(runAgent(USER, CONVERSATION, 'Continue.'), events);
  await slow.started.promise;
  t.mock.timers.tick(59_999);
  await nextTurn();
  assert.equal(events.filter(event => event.type === 'tool_call_end').length, 0);
  t.mock.timers.tick(1);
  await running;
  const end = events.find(event => event.type === 'tool_call_end');
  assert.equal(end?.tool_call?.id, 'slow-proposal');
  assert.match(end?.error || '', /tim(?:ed?\s*out|eout)/i);
  assert.equal(events.at(-1)?.type, 'done');
  const resultRow = saved(db).find(row => row.tool_results);
  const results = JSON.parse(resultRow!.tool_results!) as Array<{ tool_call_id: string; content: string }>;
  assert.equal(results[0].tool_call_id, 'slow-proposal');
  assert.match(JSON.parse(results[0].content).error, /create_proposal/);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM proposals').get() as { n: number }).n, 0);
  slow.release.resolve();
  await nextTurn();
  assertProposalCommitted(db);
  assert.equal(events.filter(event => event.type === 'tool_call_end').length, 1, 'late completion emits no duplicate result');
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
});

test('disconnect during a real in-flight tool preserves its commit and pair without starting another model round', async t => {
  const db = await fixture(t);
  const slow = slowProposal(t, db);
  const controller = new AbortController();
  const events: StreamChunk[] = [];
  let finished = false;
  const running = collect(runAgent(USER, CONVERSATION, 'Continue.', undefined, undefined, { signal: controller.signal }), events)
    .then(result => { finished = true; return result; });
  await slow.started.promise;
  controller.abort(new Error('Synthetic disconnect'));
  await nextTurn();
  assert.equal(finished, false, 'disconnect does not abandon in-flight tool work');
  slow.release.resolve();
  await running;
  assertProposalCommitted(db);
  assert.equal(slow.rounds(), 1);
  assert.equal(events.filter(event => event.type === 'tool_call_end' && !event.error).length, 1);
  assert.equal(events.at(-1)?.type, 'error');
  assert.deepEqual(saved(db).filter(row => row.role === 'assistant').map(row => row.content), ['Preparing the proposal.\n\n[interrupted]']);
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
});

test('a slow tool obeys the shorter remaining request deadline and still commits after the wait has ended', async t => {
  const db = await fixture(t);
  const slow = slowProposal(t, db);
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  const events: StreamChunk[] = [];
  const running = collect(runAgent(USER, CONVERSATION, 'Continue.', undefined, undefined, { deadline: NOW + 500 }), events);
  await slow.started.promise;
  t.mock.timers.tick(499);
  await nextTurn();
  assert.equal(events.filter(event => event.type === 'tool_call_end').length, 0);
  t.mock.timers.tick(1);
  await running;
  assert.equal(slow.rounds(), 1);
  assert.equal(events.at(-1)?.type, 'error');
  assert.match(events.find(event => event.type === 'tool_call_end')?.error || '', /deadline/i);
  assert.deepEqual(saved(db).filter(row => row.role === 'assistant').map(row => row.content), ['Preparing the proposal.\n\n[interrupted]']);
  assertReplayPairs(new MemoryManager(USER).getConversationHistory(CONVERSATION), 1);
  slow.release.resolve();
  await nextTurn();
  assertProposalCommitted(db);
  assert.equal(events.filter(event => event.type === 'tool_call_end').length, 1);
});
