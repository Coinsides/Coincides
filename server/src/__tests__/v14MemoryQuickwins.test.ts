import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate as nextTurn } from 'node:timers/promises';
import test, { type TestContext } from 'node:test';
import { MemoryManager } from '../agent/memory/manager.js';
import { runAgent } from '../agent/orchestrator.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { executeTool } from '../agent/tools/executor.js';
import { closeDb, initDb } from '../db/init.js';
import { VectorStore } from '../embedding/vectorStore.js';
import { VoyageProvider } from '../embedding/voyage.js';

const USER = 'memory-user';
const OTHER = 'memory-other';
const CONVERSATION = 'memory-conversation';
const COURSE = 'memory-course';
const OTHER_COURSE = 'memory-course-other';
const CREATED = '2026-09-14T12:00:00.000Z';
type Db = Awaited<ReturnType<typeof initDb>>;
type MemoryResult = { id: string; content: string; category: string; similarity_score?: number };

async function fixture(t: TestContext, embedding = false): Promise<Db> {
  // Real SQLite schema/FTS/vector extension; empty external credential directory.
  // Every provider key is synthetic and at most 20 characters; no .env or live API.
  const directory = mkdtempSync(join(tmpdir(), 'memory-quickwins-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: directory,
    OPENAI_API_KEY: 'syn-memory', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '',
    GENERIC_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '',
    VOYAGE_API_KEY: embedding ? 'syn-memory' : '' };
  t.after(() => { process.env = originalEnv; rmdirSync(directory); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  for (const user of [USER, OTHER]) {
    db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
      .run(user, `${user}@example.invalid`, 'synthetic', user, JSON.stringify({ active_provider: 'openai' }));
  }
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
    .run(CONVERSATION, USER, 'Synthetic memory fixture');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(COURSE, USER, 'Memory course');
  db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(OTHER_COURSE, USER, 'Other course');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network in memory fixture'); });
  return db;
}

function seed(db: Db, id: string, content: string, options: { user?: string; category?: string; score?: number } = {}) {
  db.prepare('INSERT INTO agent_memories(id,user_id,category,content,relevance_score,created_at) VALUES(?,?,?,?,?,?)')
    .run(id, options.user ?? USER, options.category ?? 'general', content, options.score ?? 1, CREATED);
}

function vector(first = 1): number[] {
  const embedding = Array<number>(1024).fill(0);
  embedding[0] = first;
  return embedding;
}

function memoryCount(db: Db, user = USER): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM agent_memories WHERE user_id = ?').get(user) as { n: number }).n;
}

function vectorCount(db: Db, id: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM agent_memory_vec WHERE memory_id = ?').get(id) as { n: number }).n;
}

async function search(query: string, category?: string): Promise<MemoryResult[]> {
  return JSON.parse(await executeTool('search_memories', { query, ...(category ? { category } : {}) }, USER));
}

function recordAccessUpdates(t: TestContext, db: Db) {
  const updates: Array<{ sql: string; params: unknown[] }> = [];
  const prepare = db.prepare.bind(db);
  t.mock.method(db, 'prepare', ((sql: string) => {
    const statement = prepare(sql);
    if (/^\s*UPDATE\s+agent_memories\s+SET\s+last_accessed/i.test(sql)) {
      const run = statement.run.bind(statement);
      t.mock.method(statement, 'run', (...params: unknown[]) => {
        updates.push({ sql, params });
        return run(...params);
      });
    }
    return statement;
  }) as Db['prepare']);
  return updates;
}

function assertOneAccessBatch(updates: ReturnType<typeof recordAccessUpdates>, ids: string[]) {
  assert.equal(updates.length, 1, 'one executed UPDATE, not one UPDATE per result');
  assert.match(updates[0].sql, /\buser_id\s*=\s*\?/i);
  assert.match(updates[0].sql, /\bid\s+IN\s*\(/i);
  assert.equal(updates[0].params[1], USER);
  assert.deepEqual(new Set(updates[0].params.slice(2)), new Set(ids));
  assert.ok(Number.isFinite(Date.parse(String(updates[0].params[0]))));
}

test('Chinese semantic-only memory reaches both retrieval entries and the actual agent system prompt', async t => {
  const db = await fixture(t, true);
  const query = '明天复习怎么安排';
  const content = '我习惯清晨背诵，晚上做题。';
  seed(db, 'chinese-memory', content, { category: 'preference' });
  seed(db, 'foreign-memory', '另一位用户的习惯', { user: OTHER });
  const store = new VectorStore();
  store.upsertMemoryEmbedding('chinese-memory', vector(1.1));
  store.upsertMemoryEmbedding('foreign-memory', vector(1));
  assert.deepEqual(store.ftsSearchMemories(query, 10, USER), [], 'fixture has no FTS match');
  assert.deepEqual(db.prepare('SELECT id FROM agent_memories WHERE user_id = ? AND content LIKE ?')
    .all(USER, `%${query}%`), [], 'fixture has no literal match');
  const calls: string[] = [];
  t.mock.method(VoyageProvider.prototype, 'embed', async (texts: string[], inputType: 'query' | 'document') => {
    calls.push(inputType);
    assert.deepEqual(texts, [query]);
    return [vector()];
  });
  assert.deepEqual((await new MemoryManager(USER).retrieveMemories(query)).map(row => row.id), ['chinese-memory']);
  assert.deepEqual((await search(query)).map(row => row.id), ['chinese-memory']);
  let receivedPrompt = '';
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (_messages: ProviderMessage[], _tools: ToolDefinition[], prompt: string): AsyncGenerator<StreamChunk> {
    receivedPrompt = prompt;
    yield { type: 'text', text: '合成回复。' };
    yield { type: 'done' };
  });
  const events: StreamChunk[] = [];
  for await (const event of runAgent(USER, CONVERSATION, query)) events.push(event);
  assert.equal(events.at(-1)?.type, 'done');
  assert.ok(receivedPrompt.includes(content), 'orchestrator awaits retrieval before constructing environment prompt');
  assert.ok(!receivedPrompt.includes('另一位用户的习惯'));
  assert.deepEqual(calls, ['query', 'query', 'query']);
});

for (const stop of ['abort', 'deadline'] as const) {
  test(`pending environment embedding obeys request ${stop} before any chat provider call`, async t => {
    await fixture(t, true);
    const now = Date.parse(CREATED);
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
    const controller = new AbortController();
    const embed = t.mock.method(VoyageProvider.prototype, 'embed', () => new Promise<number[][]>(() => {}));
    const chat = t.mock.method(OpenAIProvider.prototype, 'chat', async function* (): AsyncGenerator<StreamChunk> {
      yield { type: 'done' };
    });
    const stream = runAgent(USER, CONVERSATION, '明天复习怎么安排', undefined, undefined,
      { signal: controller.signal, deadline: now + 25 });
    const pending = stream.next();
    await nextTurn();
    assert.equal(embed.mock.callCount(), 1);
    assert.equal(chat.mock.callCount(), 0);
    if (stop === 'abort') controller.abort(new Error('Synthetic memory request abort'));
    else t.mock.timers.tick(25);
    const event = await pending;
    assert.equal(event.value.type, 'error');
    assert.match(event.value.error, stop === 'abort' ? /Synthetic memory request abort/ : /timed out/i);
    assert.equal(chat.mock.callCount(), 0);
    assert.equal((await stream.next()).done, true);
  });
}

test('three retrieval paths merge semantic before FTS before LIKE and deduplicate by id', async t => {
  const db = await fixture(t, true);
  seed(db, 'semantic', '清晨学习偏好');
  seed(db, 'shared', 'morning study');
  seed(db, 'fts', 'study in the morning');
  seed(db, 'like', 'premorning studyness', { score: 100 });
  const store = new VectorStore();
  store.upsertMemoryEmbedding('semantic', vector(1.1));
  store.upsertMemoryEmbedding('shared', vector(1.2));
  t.mock.method(VoyageProvider.prototype, 'embed', async () => [vector()]);
  for (const results of [await search('morning study'), await new MemoryManager(USER).retrieveMemories('morning study')]) {
    assert.deepEqual(results.map(row => row.id), ['semantic', 'shared', 'fts', 'like']);
    assert.equal(results.filter(row => row.id === 'shared').length, 1);
  }
  const results = await search('morning study');
  assert.equal(results[1].similarity_score, 0.8, 'semantic metadata wins when a memory also matches FTS/LIKE');
  assert.equal(results[2].similarity_score, undefined);
});

test('search category and user ownership constrain semantic, FTS and LIKE results', async t => {
  const db = await fixture(t, true);
  for (const category of ['preference', 'general']) {
    seed(db, `${category}-semantic`, '清晨偏好', { category });
    seed(db, `${category}-fts`, 'study in the morning', { category });
    seed(db, `${category}-like`, 'premorning studyness', { category });
    new VectorStore().upsertMemoryEmbedding(`${category}-semantic`, vector(1.1));
  }
  seed(db, 'foreign-fts', 'morning study', { user: OTHER, category: 'preference' });
  t.mock.method(VoyageProvider.prototype, 'embed', async () => [vector()]);
  assert.deepEqual((await search('morning study', 'preference')).map(row => row.id),
    ['preference-semantic', 'preference-fts', 'preference-like']);
});

for (const entry of ['manager', 'tool'] as const) {
  test(`${entry} preserves its result cap and updates only returned memories with one user-scoped IN batch`, async t => {
    const db = await fixture(t);
    const cap = entry === 'manager' ? 5 : 10;
    for (let index = 0; index < 14; index++) seed(db, `candidate-${index}`, `memory topic ${index}`, { score: index });
    seed(db, 'foreign-candidate', 'memory topic 99', { user: OTHER });
    seed(db, 'unrelated', 'something else');
    const updates = recordAccessUpdates(t, db);
    const results = entry === 'manager'
      ? await new MemoryManager(USER).retrieveMemories('memory topic') : await search('memory topic');
    assert.equal(results.length, cap);
    assertOneAccessBatch(updates, results.map(row => row.id));
    const touched = db.prepare('SELECT id FROM agent_memories WHERE last_accessed IS NOT NULL').all() as Array<{ id: string }>;
    assert.deepEqual(new Set(touched.map(row => row.id)), new Set(results.map(row => row.id)));
    updates.length = 0;
    const empty = entry === 'manager'
      ? await new MemoryManager(USER).retrieveMemories('unmatchable') : await search('unmatchable');
    assert.deepEqual(empty, []);
    assert.equal(updates.length, 0, 'empty result does not issue an UPDATE');
  });
}

for (const provider of ['unconfigured', 'failed'] as const) {
  test(`${provider} embedding falls back to real FTS and LIKE at both entry points`, async t => {
    const db = await fixture(t, provider === 'failed');
    seed(db, 'fts', 'study in the morning');
    seed(db, 'like', 'premorning studyness');
    const warnings: unknown[][] = [];
    t.mock.method(console, 'warn', (...args: unknown[]) => { warnings.push(args); });
    const embed = t.mock.method(VoyageProvider.prototype, 'embed', async () => { throw new Error('Synthetic embedding failure'); });
    assert.deepEqual((await search('morning study')).map(row => row.id), ['fts', 'like']);
    assert.deepEqual((await new MemoryManager(USER).retrieveMemories('morning study')).map(row => row.id), ['fts', 'like']);
    assert.equal(embed.mock.callCount(), provider === 'failed' ? 2 : 0);
    if (provider === 'failed') assert.equal(warnings.filter(args => String(args[0]).includes('memory')).length, 2);
  });
}

test('save_memory exact and declared FTS-normalized duplicates reuse the existing id without extra embeddings', async t => {
  const db = await fixture(t, true);
  const embed = t.mock.method(VoyageProvider.prototype, 'embed', async () => [vector()]);
  const save = async (content: string, user = USER, category = 'preference'): Promise<{ id: string }> =>
    JSON.parse(await executeTool('save_memory', { category, content }, user));
  const initial = await save('I prefer morning study.');
  await nextTurn();
  assert.equal(vectorCount(db, initial.id), 1);
  assert.equal((await save('I prefer morning study.')).id, initial.id);
  assert.equal((await save('  i PREFER   morning\n study！？  ', USER, 'general')).id, initial.id);
  assert.equal(memoryCount(db), 1);
  assert.equal(embed.mock.callCount(), 1, 'duplicate exact and normalized writes do not regenerate embeddings');
  const existing = db.prepare('SELECT content,category FROM agent_memories WHERE id = ?').get(initial.id);
  assert.deepEqual(existing, { content: 'I prefer morning study.', category: 'preference' });
  const changed = await save('I prefer evening study.');
  const negation = await save('I do not prefer morning study.');
  const foreign = await save('I prefer morning study.', OTHER);
  assert.equal(new Set([initial.id, changed.id, negation.id, foreign.id]).size, 4, 'substantive differences and another user remain distinct');
  assert.equal(memoryCount(db), 3);
  assert.equal(memoryCount(db, OTHER), 1);
  await nextTurn();
  assert.equal(embed.mock.callCount(), 4);
});

test('concurrent save_memory requests resolve to one row while the first embedding is pending', async t => {
  const db = await fixture(t, true);
  let release!: (value: number[][]) => void;
  const pending = new Promise<number[][]>(resolve => { release = resolve; });
  const embed = t.mock.method(VoyageProvider.prototype, 'embed', () => pending);
  try {
    let results: Array<{ id: string }> | undefined;
    const writes = Promise.all(Array.from({ length: 4 }, () =>
      executeTool('save_memory', { category: 'general', content: 'Same pending memory.' }, USER)))
      .then(values => { results = values.map(value => JSON.parse(value)); });
    await nextTurn();
    assert.ok(results, 'tool replies must settle before embedding does');
    assert.equal(new Set(results.map(result => result.id)).size, 1);
    assert.equal(memoryCount(db), 1);
    assert.equal(embed.mock.callCount(), 1);
    await writes;
  } finally {
    release([vector()]);
    await nextTurn();
  }
});

test('exact save_memory dedup works for punctuation-only content without an FTS candidate', async t => {
  const db = await fixture(t);
  seed(db, 'exact-punctuation', '?!');
  const result = JSON.parse(await executeTool('save_memory', { category: 'general', content: '?!' }, USER));
  assert.equal(result.id, 'exact-punctuation');
  assert.equal(memoryCount(db), 1);
});

test('extractMemories returns synchronously, embeds new rows asynchronously and retains exact dedup', async t => {
  const db = await fixture(t, true);
  let release!: (value: number[][]) => void;
  const pending = new Promise<number[][]>(resolve => { release = resolve; });
  const embed = t.mock.method(VoyageProvider.prototype, 'embed', (texts: string[], kind: 'document' | 'query') => {
    assert.deepEqual(texts, ['I prefer morning study.']);
    assert.equal(kind, 'document');
    return pending;
  });
  const manager = new MemoryManager(USER);
  try {
    assert.equal(manager.extractMemories(CONVERSATION, 'I prefer morning study.'), undefined);
    assert.equal(memoryCount(db), 1, 'row exists before embedding finishes');
    const row = db.prepare('SELECT id,category,source_conversation_id FROM agent_memories WHERE user_id = ?').get(USER) as { id: string; category: string; source_conversation_id: string };
    assert.equal(row.category, 'preference');
    assert.equal(row.source_conversation_id, CONVERSATION);
    assert.equal(vectorCount(db, row.id), 0);
    manager.extractMemories(CONVERSATION, 'I prefer morning study.');
    assert.equal(memoryCount(db), 1);
    assert.equal(embed.mock.callCount(), 1);
    release([vector()]);
    await nextTurn();
    assert.equal(vectorCount(db, row.id), 1);
  } finally {
    release([vector()]);
    await nextTurn();
  }
});

for (const entry of ['extract', 'save'] as const) {
  test(`${entry} persists the memory and logs an asynchronous embedding failure`, async t => {
    const db = await fixture(t, true);
    const warnings: unknown[][] = [];
    t.mock.method(console, 'warn', (...args: unknown[]) => { warnings.push(args); });
    t.mock.method(VoyageProvider.prototype, 'embed', async () => { throw new Error('Synthetic embedding failure'); });
    if (entry === 'extract') new MemoryManager(USER).extractMemories(CONVERSATION, 'My exam is next Friday.');
    else await executeTool('save_memory', { category: 'general', content: 'Save despite embedding failure.' }, USER);
    await nextTurn();
    assert.equal(memoryCount(db), 1);
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /memory embedding/i);
    assert.match(String(warnings[0][1]), /Synthetic embedding failure/);
  });
}

test('extractMemories preserves the existing English patterns and their Chinese limitation', async t => {
  const db = await fixture(t);
  const manager = new MemoryManager(USER);
  manager.extractMemories(CONVERSATION, '我喜欢早晨学习。请记住这个偏好。');
  assert.equal(memoryCount(db), 0, 'this order does not replace the English regex extractor');
  manager.extractMemories(CONVERSATION, 'My exam is next Friday.');
  assert.deepEqual(db.prepare('SELECT category,content FROM agent_memories WHERE user_id = ?').all(USER),
    [{ category: 'course_context', content: 'My exam is next Friday.' }]);
});

test('document summaries choose the latest ten and preserve user, course and non-null filtering', async t => {
  const db = await fixture(t);
  const insert = db.prepare('INSERT INTO documents(id,user_id,course_id,filename,file_path,file_type,summary,created_at) VALUES(?,?,?,?,?,?,?,?)');
  for (let index = 0; index < 14; index++) {
    const course = index % 2 === 0 ? COURSE : OTHER_COURSE;
    insert.run(`document-${index}`, USER, course, `synthetic-${index}.pdf`, 'synthetic.pdf', 'pdf', `Summary ${index}`,
      new Date(Date.parse(CREATED) + index * 1000).toISOString());
  }
  insert.run('null-summary', USER, COURSE, 'empty.pdf', 'synthetic.pdf', 'pdf', null, '2026-10-01T00:00:00.000Z');
  insert.run('foreign-document', OTHER, COURSE, 'foreign.pdf', 'synthetic.pdf', 'pdf', 'Foreign summary', '2026-10-01T00:00:00.000Z');
  const manager = new MemoryManager(USER);
  assert.deepEqual(manager.getDocumentSummaries().map(row => row.id),
    Array.from({ length: 10 }, (_, index) => `document-${13 - index}`));
  assert.deepEqual(manager.getDocumentSummaries(COURSE).map(row => row.id),
    [12, 10, 8, 6, 4, 2, 0].map(index => `document-${index}`));
  assert.deepEqual(manager.getDocumentSummaries('missing-course'), []);
});
