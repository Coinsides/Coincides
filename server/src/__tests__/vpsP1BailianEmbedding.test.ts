import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { afterEach, beforeEach, type TestContext } from 'node:test';
import express from 'express';
import { closeDb, initDb } from '../db/init.js';
import {
  createDashScopeEmbeddingProvider,
  DASHSCOPE_EMBEDDING_DIMENSIONS,
  DASHSCOPE_EMBEDDING_ENDPOINT,
  DASHSCOPE_EMBEDDING_MODEL,
  DASHSCOPE_EMBEDDING_MODEL_ID,
  DashScopeEmbeddingError,
  resolveDashScopeEmbeddingEndpoint,
} from '../embedding/dashscope.js';
import { DashScopeEmbeddingAdapter, getEmbeddingProvider } from '../embedding/index.js';
import { VoyageProvider } from '../embedding/voyage.js';
import type { AuthRequest } from '../middleware/auth.js';
import embeddingRoutes from '../routes/embedding.js';

// Synthetic credentials and local fetch stubs only; no .env, network or user database.
const originalEnv = process.env;
let credentialDirectory: string;
beforeEach(() => {
  credentialDirectory = mkdtempSync(join(tmpdir(), 'coincides-bailian-embedding-'));
  process.env = {
    ...originalEnv,
    COINCIDES_APP_DATA_DIR: credentialDirectory,
    VOYAGE_API_KEY: '',
    DASHSCOPE_API_KEY: '',
    DASHSCOPE_BASE_URL: '',
  };
});
afterEach(() => {
  process.env = originalEnv;
  rmSync(credentialDirectory, { recursive: true, force: true });
});

function vector(seed: number) {
  return Array.from({ length: DASHSCOPE_EMBEDDING_DIMENSIONS }, (_, index) => (index === seed % 1024 ? 1 : 0));
}

function stubDashScope(t: TestContext, model: string = DASHSCOPE_EMBEDDING_MODEL) {
  const requests: Array<{ url: string; input: string[] }> = [];
  t.mock.method(globalThis, 'fetch', async (url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { input: string[] };
    requests.push({ url: String(url), input: body.input });
    return new Response(JSON.stringify({
      model,
      data: body.input.map((_, index) => ({ index, embedding: vector(index) })),
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return requests;
}

// AbortSignal.timeout timers are unref'd; a ref'd guard keeps the test loop
// alive until the abort fires (a running server does this in production).
function hangingFetch(_input: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const guard = setTimeout(() => reject(new Error('fetch was never aborted')), 5_000);
    init?.signal?.addEventListener('abort', () => {
      clearTimeout(guard);
      reject(init.signal!.reason);
    }, { once: true });
  });
}

test('dashscope endpoint defaults to Beijing and follows settings, env and region', () => {
  assert.equal(DASHSCOPE_EMBEDDING_ENDPOINT, 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings');
  assert.equal(resolveDashScopeEmbeddingEndpoint(), DASHSCOPE_EMBEDDING_ENDPOINT);
  assert.equal(
    resolveDashScopeEmbeddingEndpoint('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/'),
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings',
  );
  process.env.DASHSCOPE_BASE_URL = 'https://proxy.example/compatible-mode';
  assert.equal(resolveDashScopeEmbeddingEndpoint(), 'https://proxy.example/compatible-mode/v1/embeddings');
  assert.equal(
    resolveDashScopeEmbeddingEndpoint('https://dashscope.aliyuncs.com/compatible-mode'),
    DASHSCOPE_EMBEDDING_ENDPOINT,
    'an explicit base outranks the environment override',
  );

  assert.equal(DASHSCOPE_EMBEDDING_MODEL_ID, 'dashscope:cn-beijing:text-embedding-v4:1024');
  assert.equal(createDashScopeEmbeddingProvider({ baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode' }).modelId,
    'dashscope:cn-beijing:text-embedding-v4:1024');
  assert.equal(createDashScopeEmbeddingProvider({ baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode' }).modelId,
    'dashscope:intl:text-embedding-v4:1024');
});

test('dashscope response model check accepts a dated v4 name and rejects other models', async () => {
  process.env.DASHSCOPE_API_KEY = 'syn-bailian';
  const respond = (model: string) => createDashScopeEmbeddingProvider({
    fetchImpl: async () => new Response(JSON.stringify({ model, data: [{ index: 0, embedding: vector(0) }] })),
  });
  assert.equal((await respond('text-embedding-v4-2025-06-01').embed(['Alpha'])).vectors.length, 1);
  await assert.rejects(() => respond('text-embedding-v3').embed(['Alpha']), (error: unknown) => {
    assert.ok(error instanceof DashScopeEmbeddingError);
    assert.equal(error.code, 'invalid_response');
    return true;
  });
});

test('dashscope request times out into the network_error family', async () => {
  process.env.DASHSCOPE_API_KEY = 'syn-bailian';
  const provider = createDashScopeEmbeddingProvider({ fetchImpl: hangingFetch, timeoutMs: 20 });
  await assert.rejects(() => provider.embed(['Alpha']), (error: unknown) => {
    assert.ok(error instanceof DashScopeEmbeddingError);
    assert.equal(error.code, 'network_error');
    assert.match(error.message, /timed out after 20ms/);
    return true;
  });
});

test('voyage request times out with a distinguishable network error', async (t) => {
  t.mock.method(globalThis, 'fetch', hangingFetch);
  const provider = new VoyageProvider('syn-voyage', 'voyage-4', 20);
  await assert.rejects(() => provider.embed(['Alpha'], 'document'), /Voyage AI network error: request timed out after 20ms/);
});

test('env fallback keeps voyage first and otherwise yields the dashscope adapter', () => {
  assert.equal(getEmbeddingProvider(), null);
  process.env.DASHSCOPE_API_KEY = 'syn-bailian';
  const dashscope = getEmbeddingProvider();
  assert.ok(dashscope instanceof DashScopeEmbeddingAdapter);
  assert.equal(dashscope.dimensions, 1024);
  assert.equal(dashscope.maxBatchSize, 10);
  process.env.VOYAGE_API_KEY = 'syn-voyage';
  assert.ok(getEmbeddingProvider() instanceof VoyageProvider);
});

test('dashscope adapter splits large inputs into batches of at most ten', async (t) => {
  process.env.DASHSCOPE_API_KEY = 'syn-bailian';
  const requests = stubDashScope(t);
  const texts = Array.from({ length: 23 }, (_, index) => `Text ${index}`);
  const vectors = await new DashScopeEmbeddingAdapter().embed(texts, 'query');
  assert.deepEqual(requests.map((request) => request.input.length), [10, 10, 3]);
  assert.deepEqual(requests.flatMap((request) => request.input), texts);
  assert.equal(vectors.length, 23);
  assert.deepEqual(await new DashScopeEmbeddingAdapter().embed([], 'document'), []);
  assert.equal(requests.length, 3, 'an empty input issues no request');
});

test('backfill under dashscope settings embeds chunks and memories through Beijing in batches of ten', async (t) => {
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    const userId = 'bailian-user';
    db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','Bailian',?)")
      .run(userId, 'bailian@example.invalid', JSON.stringify({ embedding_provider: 'dashscope' }));
    db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run('bailian-course', userId, 'Synthetic project');
    db.prepare('INSERT INTO documents (id,user_id,course_id,filename,file_path,file_type) VALUES (?,?,?,?,?,?)')
      .run('bailian-doc', userId, 'bailian-course', 'Synthetic.txt', 'synthetic-never-read.txt', 'txt');
    const chunk = db.prepare('INSERT INTO document_chunks (id,document_id,chunk_index,content) VALUES (?,?,?,?)');
    for (let index = 0; index < 23; index++) chunk.run(`bailian-chunk-${index}`, 'bailian-doc', index, `Chunk ${index}`);
    const memory = db.prepare('INSERT INTO agent_memories (id,user_id,category,content,created_at) VALUES (?,?,?,?,?)');
    for (let index = 0; index < 3; index++) {
      memory.run(`bailian-memory-${index}`, userId, 'general', `Memory ${index}`, '2026-11-01 10:00:00');
    }
    process.env.DASHSCOPE_API_KEY = 'syn-bailian';
    // Keep the real fetch for the route call; the stub only stands in for the provider.
    const realFetch = globalThis.fetch;
    const requests = stubDashScope(t);

    assert.ok(getEmbeddingProvider(userId) instanceof DashScopeEmbeddingAdapter);

    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/embedding', embeddingRoutes);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const response = await realFetch(`http://127.0.0.1:${address.port}/api/embedding/backfill`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, chunks_processed: 23, memories_processed: 3 });

    assert.deepEqual(requests.map((request) => request.input.length), [10, 10, 3, 3]);
    assert.ok(requests.every((request) => request.url === DASHSCOPE_EMBEDDING_ENDPOINT));
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM doc_chunk_vec').get() as { count: number }).count, 23);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM agent_memory_vec').get() as { count: number }).count, 3);
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    closeDb();
  }
});
