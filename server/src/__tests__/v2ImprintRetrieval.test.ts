import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import embeddingMigration from '../db/migrations/052_v2_imprint_fragment_vectors.js';
import { DASHSCOPE_EMBEDDING_DIMENSIONS } from '../embedding/dashscope.js';
import {
  storeImprintFragmentVector,
  type ImprintEmbeddingProvider,
} from '../services/imprintEmbedding.js';
import {
  hydrateImprintRetrievalMatch,
  ImprintRetrievalError,
  retrieveImprintFragments,
  type OwnedVectorMatch,
} from '../services/imprintRetrieval.js';
import type { SourceImprintAnchor } from '../services/sourceImprints.js';

const MODEL_A = 'fixture:retrieval-a-v1:1024';
const MODEL_B = 'fixture:retrieval-b-v1:1024';
const LOCK_HASH = 'a'.repeat(64);
const CONTENT_HASH = 'b'.repeat(64);

function unitVector(index: number): number[] {
  const vector = new Array<number>(DASHSCOPE_EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

function createDb(): Database.Database {
  const db = new Database(':memory:');
  sqliteVec.load(db);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE source_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      content_hash TEXT NOT NULL
    );
    CREATE TABLE source_imprints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_file_id TEXT NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
      transcriber_name TEXT NOT NULL,
      transcriber_version TEXT NOT NULL,
      transcriber_lockfile TEXT NOT NULL,
      transcriber_lockfile_hash TEXT,
      anchor_fidelity TEXT NOT NULL,
      text_normalization TEXT NOT NULL,
      fragment_count INTEGER NOT NULL,
      warnings_json TEXT NOT NULL,
      status TEXT NOT NULL,
      rejection_reasons_json TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE imprint_fragments (
      id TEXT PRIMARY KEY,
      imprint_id TEXT NOT NULL REFERENCES source_imprints(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      text TEXT NOT NULL,
      role TEXT NOT NULL,
      anchor_json TEXT NOT NULL,
      style_json TEXT,
      lang TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  embeddingMigration.up(db);
  return db;
}

interface FragmentFixture {
  id: string;
  text: string;
  anchor: SourceImprintAnchor;
  role?: 'heading' | 'para';
  lang?: string | null;
}

function addImprint(
  db: Database.Database,
  input: {
    userId: string;
    sourceFileId: string;
    imprintId: string;
    filename: string;
    fragments: FragmentFixture[];
    contentHash?: string;
    lockHash?: string;
  },
): void {
  db.prepare(`
    INSERT INTO source_files (id, user_id, original_filename, content_hash)
    VALUES (?, ?, ?, ?)
  `).run(
    input.sourceFileId,
    input.userId,
    input.filename,
    input.contentHash ?? CONTENT_HASH,
  );
  db.prepare(`
    INSERT INTO source_imprints (
      id, user_id, source_file_id,
      transcriber_name, transcriber_version, transcriber_lockfile,
      transcriber_lockfile_hash, anchor_fidelity, text_normalization,
      fragment_count, warnings_json, status, rejection_reasons_json
    ) VALUES (?, ?, ?, 'fixture-transcriber', '2.4.5', 'fixture.lock', ?, 'page',
              'whitespace', ?, '[]', 'accepted', '[]')
  `).run(
    input.imprintId,
    input.userId,
    input.sourceFileId,
    input.lockHash ?? LOCK_HASH,
    input.fragments.length,
  );
  const insert = db.prepare(`
    INSERT INTO imprint_fragments (
      id, imprint_id, seq, text, role, anchor_json, style_json, lang
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
  `);
  input.fragments.forEach((fragment, seq) => insert.run(
    fragment.id,
    input.imprintId,
    seq,
    fragment.text,
    fragment.role ?? 'para',
    JSON.stringify(fragment.anchor),
    fragment.lang ?? null,
  ));
}

function storeVector(
  db: Database.Database,
  fragmentId: string,
  modelId: string,
  embedding: readonly number[],
): void {
  storeImprintFragmentVector(db, {
    fragmentId,
    modelId,
    dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
    l2Normalized: false,
    encodingFormat: 'float',
    normalization: 'none',
    embedding,
  });
}

function fakeProvider(embedding: readonly number[], modelId = MODEL_A) {
  let callCount = 0;
  const provider: ImprintEmbeddingProvider = {
    modelId,
    model: `fixture-${modelId}`,
    dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
    encodingFormat: 'float',
    l2Normalized: false,
    normalization: 'none',
    async embed(inputs) {
      callCount += 1;
      assert.equal(inputs.length, 1);
      return { model: `fixture-${modelId}`, vectors: [Array.from(embedding)] };
    },
  };
  return { provider, calls: () => callCount };
}

test('K-1 complete provenance chain is returned and K-2 exact-anchor replay counts siblings', async () => {
  const db = createDb();
  try {
    const anchor: SourceImprintAnchor = { family: 'page', page: 7 };
    addImprint(db, {
      userId: 'user-a',
      sourceFileId: 'source-a',
      imprintId: 'imprint-a',
      filename: 'reading.pdf',
      fragments: [
        { id: 'fragment-a', text: 'First exact-anchor fragment', anchor, lang: 'en' },
        { id: 'fragment-a-sibling', text: 'Second exact-anchor fragment', anchor },
      ],
    });
    storeVector(db, 'fragment-a', MODEL_A, unitVector(0));
    const fake = fakeProvider(unitVector(0));

    const results = await retrieveImprintFragments(db, 'user-a', {
      query: 'academic reading passage',
      k: 1,
      provider: fake.provider,
    });

    assert.equal(fake.calls(), 1);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].fragment, {
      id: 'fragment-a',
      seq: 0,
      role: 'para',
      text: 'First exact-anchor fragment',
      anchor,
      lang: 'en',
    });
    assert.deepEqual(results[0].imprint, {
      id: 'imprint-a',
      transcriber_name: 'fixture-transcriber',
      transcriber_version: '2.4.5',
      transcriber_lockfile_hash: LOCK_HASH,
      anchor_fidelity: 'page',
      text_normalization: 'whitespace',
    });
    assert.deepEqual(results[0].source_file, {
      id: 'source-a',
      original_filename: 'reading.pdf',
      content_hash: CONTENT_HASH,
    });
    assert.equal(results[0].retrieval.model_id, MODEL_A);
    assert.ok(Math.abs(results[0].retrieval.distance) < 1e-6);
    assert.equal(results[0].retrieval.anchor_match_count, 2);
    for (const group of ['fragment', 'imprint', 'source_file', 'retrieval'] as const) {
      for (const value of Object.values(results[0][group])) assert.notEqual(value, null);
    }
  } finally {
    db.close();
  }
});

test('K-2 orphaned anchor replay throws a retrieval hydration error instead of dropping the hit', () => {
  const db = createDb();
  try {
    addImprint(db, {
      userId: 'user-a',
      sourceFileId: 'source-a',
      imprintId: 'imprint-a',
      filename: 'reading.pdf',
      fragments: [
        { id: 'fragment-a', text: 'Anchored on page one', anchor: { family: 'page', page: 1 } },
      ],
    });
    const match: OwnedVectorMatch = {
      vector: {
        vectorId: 1,
        fragmentId: 'fragment-a',
        modelId: MODEL_A,
        dimensions: 1024,
        l2Normalized: false,
        encodingFormat: 'float',
        normalization: 'none',
        distance: 0,
      },
      ownership: {
        fragment_id: 'fragment-a',
        imprint_id: 'imprint-a',
        anchor_json: JSON.stringify({ family: 'page', page: 1 }),
        transcriber_name: 'fixture-transcriber',
        transcriber_version: '2.4.5',
        transcriber_lockfile_hash: LOCK_HASH,
        anchor_fidelity: 'page',
        text_normalization: 'whitespace',
        source_file_identity: 'source-a',
        original_filename: 'reading.pdf',
        content_hash: CONTENT_HASH,
      },
      anchor: { family: 'page', page: 999 },
    };

    assert.throws(
      () => hydrateImprintRetrievalMatch(db, 'user-a', match),
      (error: unknown) => error instanceof ImprintRetrievalError
        && error.code === 'hydration_failed'
        && /absent from its anchor replay/.test(error.message),
    );
  } finally {
    db.close();
  }
});

test('K-3 model_id filtering excludes a strictly closer vector from another model', async () => {
  const db = createDb();
  try {
    addImprint(db, {
      userId: 'user-a',
      sourceFileId: 'source-a',
      imprintId: 'imprint-a',
      filename: 'models.pdf',
      fragments: [
        { id: 'fragment-model-a', text: 'Model A result', anchor: { family: 'page', page: 1 } },
        { id: 'fragment-model-b', text: 'Model B result', anchor: { family: 'page', page: 2 } },
      ],
    });
    storeVector(db, 'fragment-model-a', MODEL_A, unitVector(0));
    storeVector(db, 'fragment-model-b', MODEL_B, unitVector(1));
    const fake = fakeProvider(unitVector(1), MODEL_A);

    const results = await retrieveImprintFragments(db, 'user-a', {
      query: 'model partition',
      k: 1,
      provider: fake.provider,
    });

    assert.equal(fake.calls(), 1);
    assert.equal(results.length, 1);
    assert.equal(results[0].fragment.id, 'fragment-model-a');
    assert.equal(results[0].retrieval.model_id, MODEL_A);
    assert.equal(results.some((result) => result.fragment.id === 'fragment-model-b'), false);
  } finally {
    db.close();
  }
});

test('K-3 ownership filtering discards a closer foreign hit and oversampling replenishes k', async () => {
  const db = createDb();
  try {
    addImprint(db, {
      userId: 'user-a',
      sourceFileId: 'source-a',
      imprintId: 'imprint-a',
      filename: 'owned.pdf',
      fragments: [
        { id: 'fragment-owned', text: 'Owned result', anchor: { family: 'page', page: 1 } },
      ],
    });
    addImprint(db, {
      userId: 'user-b',
      sourceFileId: 'source-b',
      imprintId: 'imprint-b',
      filename: 'foreign.pdf',
      fragments: [
        { id: 'fragment-foreign', text: 'Foreign result', anchor: { family: 'page', page: 1 } },
      ],
      contentHash: 'c'.repeat(64),
      lockHash: 'd'.repeat(64),
    });
    storeVector(db, 'fragment-owned', MODEL_A, unitVector(0));
    storeVector(db, 'fragment-foreign', MODEL_A, unitVector(1));
    const fake = fakeProvider(unitVector(1));

    const results = await retrieveImprintFragments(db, 'user-a', {
      query: 'ownership partition',
      k: 1,
      provider: fake.provider,
    });

    assert.equal(fake.calls(), 1);
    assert.equal(results.length, 1);
    assert.equal(results[0].fragment.id, 'fragment-owned');
    assert.equal(results[0].source_file.id, 'source-a');
    assert.equal(results.some((result) => result.fragment.id === 'fragment-foreign'), false);
  } finally {
    db.close();
  }
});
