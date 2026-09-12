import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import embeddingMigration from '../db/migrations/052_v2_imprint_fragment_vectors.js';
import {
  createDashScopeEmbeddingProvider,
  DASHSCOPE_EMBEDDING_DIMENSIONS,
  DASHSCOPE_EMBEDDING_ENDPOINT,
  DASHSCOPE_EMBEDDING_MODEL,
  DashScopeEmbeddingError,
} from '../embedding/dashscope.js';
import {
  embedImprintFragments,
  ImprintEmbeddingError,
  searchImprintFragmentVectors,
  storeImprintFragmentVector,
  type ImprintEmbeddingProvider,
} from '../services/imprintEmbedding.js';

const MODEL_A = 'fixture:model-a-v1:1024';
const MODEL_B = 'fixture:model-b-v1:1024';

// Local credentials precede environment fallback. Keep both inputs owned by
// this fixture; inherited app-data must never change a synthetic request.
let previousAppData: string | undefined;
let credentialDirectory: string;
beforeEach(() => {
  previousAppData = process.env.COINCIDES_APP_DATA_DIR;
  credentialDirectory = mkdtempSync(join(tmpdir(), 'coincides-embedding-fixture-'));
  process.env.COINCIDES_APP_DATA_DIR = credentialDirectory;
});
afterEach(() => {
  if (previousAppData === undefined) delete process.env.COINCIDES_APP_DATA_DIR;
  else process.env.COINCIDES_APP_DATA_DIR = previousAppData;
  rmSync(credentialDirectory, { recursive: true, force: true });
});

function unitVector(index: number): number[] {
  const vector = new Array<number>(DASHSCOPE_EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

function createSchema(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE source_imprints (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE imprint_fragments (
      id TEXT PRIMARY KEY,
      imprint_id TEXT NOT NULL REFERENCES source_imprints(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      text TEXT NOT NULL
    );
  `);
}

function withVectorDb(run: (db: Database.Database) => void | Promise<void>): Promise<void> {
  const db = new Database(':memory:');
  sqliteVec.load(db);
  createSchema(db);
  db.transaction(() => embeddingMigration.up(db))();
  return Promise.resolve(run(db)).finally(() => db.close());
}

function addFragments(db: Database.Database, texts: readonly string[]): string[] {
  const imprintId = `imprint-${Math.random().toString(16).slice(2)}`;
  db.prepare(`
    INSERT INTO source_imprints (id, status) VALUES (?, 'accepted')
  `).run(imprintId);
  const insert = db.prepare(`
    INSERT INTO imprint_fragments (id, imprint_id, seq, text)
    VALUES (?, ?, ?, ?)
  `);
  return texts.map((text, index) => {
    const fragmentId = `${imprintId}-fragment-${index}`;
    insert.run(fragmentId, imprintId, index, text);
    return fragmentId;
  });
}

function store(
  db: Database.Database,
  fragmentId: string,
  modelId: string,
  embedding: readonly number[],
) {
  return storeImprintFragmentVector(db, {
    fragmentId,
    modelId,
    dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
    l2Normalized: false,
    encodingFormat: 'float',
    normalization: 'none',
    embedding,
  });
}

test('migration 052 fails loudly when sqlite-vec has not been loaded', () => {
  const db = new Database(':memory:');
  try {
    createSchema(db);
    assert.throws(() => embeddingMigration.up(db), /vec0|module/i);
  } finally {
    db.close();
  }
});

test('migration 052 fixes identity columns, vec0 partition shape, and idempotence', async () => {
  await withVectorDb((db) => {
    embeddingMigration.up(db);
    const receiptRows = db.prepare('PRAGMA table_info(imprint_fragment_vectors)').all() as Array<{
      name: string;
    }>;
    const receiptColumns = receiptRows.map((column) => column.name);
    assert.deepEqual(receiptColumns, [
      'id',
      'fragment_id',
      'model_id',
      'dimensions',
      'l2_normalized',
      'encoding_format',
      'normalization',
      'created_at',
    ]);
    const vecSql = (db.prepare(`
      SELECT sql FROM sqlite_master WHERE name = 'imprint_fragment_vec'
    `).get() as { sql: string }).sql.replace(/\s+/g, ' ').toLowerCase();
    assert.match(vecSql, /model_id text not null partition key/);
    assert.match(vecSql, /embedding float\[1024\] distance_metric=cosine/);

    const [fragmentId] = addFragments(db, ['Alpha']);
    store(db, fragmentId, MODEL_A, unitVector(0));
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM imprint_fragment_vectors').get() as {
        count: number;
      }).count,
      1,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM imprint_fragment_vec').get() as {
        count: number;
      }).count,
      1,
    );
  });
});

test('K-1 model partition filters inside KNN: querying A cannot return closer model B', async () => {
  await withVectorDb((db) => {
    const [fragmentA, fragmentB] = addFragments(db, ['Alpha', 'Beta']);
    store(db, fragmentA, MODEL_A, unitVector(0));
    store(db, fragmentB, MODEL_B, unitVector(1));

    const results = searchImprintFragmentVectors(db, {
      modelId: MODEL_A,
      dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
      embedding: unitVector(1),
      limit: 1,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].fragmentId, fragmentA);
    assert.equal(results[0].modelId, MODEL_A);
    assert.equal(results.some((row) => row.fragmentId === fragmentB), false);
    assert.ok(Math.abs(results[0].distance - 1) < 1e-6);
  });
});

test('K-1 model change creates a new identity and same-model rerun never overwrites', async () => {
  await withVectorDb((db) => {
    const [fragmentId] = addFragments(db, ['Alpha']);
    const firstA = store(db, fragmentId, MODEL_A, unitVector(0));
    const secondA = store(db, fragmentId, MODEL_A, unitVector(1));
    const modelB = store(db, fragmentId, MODEL_B, unitVector(1));

    assert.equal(firstA.status, 'inserted');
    assert.equal(secondA.status, 'existing');
    assert.equal(firstA.id, secondA.id);
    assert.notEqual(firstA.id, modelB.id);
    assert.equal(
      (db.prepare(`
        SELECT COUNT(*) AS count
        FROM imprint_fragment_vectors
        WHERE fragment_id = ?
      `).get(fragmentId) as { count: number }).count,
      2,
    );

    const results = searchImprintFragmentVectors(db, {
      modelId: MODEL_A,
      dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
      embedding: unitVector(0),
      limit: 1,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].vectorId, firstA.id);
    assert.ok(Math.abs(results[0].distance) < 1e-6);
  });
});

test('DashScope provider uses the fixed international endpoint and validates 1024-float responses', async () => {
  const previousKey = process.env.DASHSCOPE_API_KEY;
  process.env.DASHSCOPE_API_KEY = 'syn-fake-embedding';
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  try {
    const provider = createDashScopeEmbeddingProvider({
      fetchImpl: async (input, init) => {
        requests.push({ url: String(input), init });
        return new Response(JSON.stringify({
          model: DASHSCOPE_EMBEDDING_MODEL,
          data: [
            { index: 1, embedding: unitVector(1) },
            { index: 0, embedding: unitVector(0) },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    const result = await provider.embed(['Alpha', 'Beta']);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, DASHSCOPE_EMBEDDING_ENDPOINT);
    const requestBody = JSON.parse(String(requests[0].init?.body));
    assert.deepEqual(requestBody, {
      model: DASHSCOPE_EMBEDDING_MODEL,
      input: ['Alpha', 'Beta'],
      dimensions: 1024,
      encoding_format: 'float',
    });
    assert.equal(new Headers(requests[0].init?.headers).get('authorization'), 'Bearer syn-fake-embedding');
    assert.equal(result.vectors.length, 2);
    assert.equal(result.vectors[0][0], 1);
    assert.equal(result.vectors[1][1], 1);
  } finally {
    if (previousKey === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = previousKey;
  }
});

test('DashScope provider errors are sanitized and never expose credential or response body text', async () => {
  const previousKey = process.env.DASHSCOPE_API_KEY;
  const placeholder = 'unit-test-sensitive-placeholder';
  const responseMarker = 'unit-test-response-marker';
  process.env.DASHSCOPE_API_KEY = placeholder;
  try {
    const provider = createDashScopeEmbeddingProvider({
      fetchImpl: async () => new Response(responseMarker, { status: 401 }),
    });
    await assert.rejects(
      () => provider.embed(['Alpha']),
      (error: unknown) => {
        assert.ok(error instanceof DashScopeEmbeddingError);
        assert.equal(error.code, 'http_error');
        assert.equal(error.httpStatus, 401);
        assert.equal(error.message.includes(placeholder), false);
        assert.equal(error.message.includes(responseMarker), false);
        return true;
      },
    );
  } finally {
    if (previousKey === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = previousKey;
  }
});

test('embedding run preflights budgets, batches without retry, and is idempotent', async () => {
  await withVectorDb(async (db) => {
    addFragments(db, ['Alpha', 'Beta', 'Gamma']);
    let calls = 0;
    const provider: ImprintEmbeddingProvider = {
      modelId: MODEL_A,
      model: 'fixture-model-a-v1',
      dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
      encodingFormat: 'float',
      l2Normalized: false,
      normalization: 'none',
      async embed(inputs) {
        calls += 1;
        return {
          model: 'fixture-model-a-v1',
          vectors: inputs.map((_, index) => unitVector(index)),
        };
      },
    };

    await assert.rejects(
      () => embedImprintFragments(db, {
        provider,
        batchSize: 2,
        maxApiCalls: 1,
      }),
      (error: unknown) => error instanceof ImprintEmbeddingError
        && error.code === 'budget_exceeded',
    );
    assert.equal(calls, 0);

    const first = await embedImprintFragments(db, {
      provider,
      batchSize: 2,
      maxApiCalls: 2,
    });
    assert.equal(first.apiCalls, 2);
    assert.equal(first.inputCharacters, 14);
    assert.equal(first.inserted, 3);
    assert.equal(first.retryCount, 0);
    assert.deepEqual(first.skipped, []);
    assert.equal(calls, 2);

    const second = await embedImprintFragments(db, { provider, batchSize: 2 });
    assert.equal(second.apiCalls, 0);
    assert.equal(second.inputCharacters, 0);
    assert.equal(second.inserted, 0);
    assert.equal(second.alreadyEmbedded, 3);
    assert.equal(calls, 2);
  });
});
