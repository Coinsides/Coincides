import type Database from 'better-sqlite3';
import {
  createDashScopeEmbeddingProvider,
  DASHSCOPE_EMBEDDING_DIMENSIONS,
  type DashScopeEmbeddingBatch,
} from '../embedding/dashscope.js';

export const IMPRINT_EMBEDDING_HARD_MAX_API_CALLS = 30;
export const IMPRINT_EMBEDDING_HARD_MAX_INPUT_CHARACTERS = 150_000;
export const IMPRINT_EMBEDDING_MAX_BATCH_SIZE = 10;
export const IMPRINT_EMBEDDING_DEFAULT_BATCH_SIZE = 10;

export type ImprintEmbeddingErrorCode =
  | 'invalid_configuration'
  | 'budget_exceeded'
  | 'fragment_not_found'
  | 'vector_identity_conflict'
  | 'provider_contract_mismatch';

export class ImprintEmbeddingError extends Error {
  readonly code: ImprintEmbeddingErrorCode;

  constructor(code: ImprintEmbeddingErrorCode, message: string) {
    super(message);
    this.name = 'ImprintEmbeddingError';
    this.code = code;
  }
}

export interface ImprintEmbeddingProvider {
  readonly modelId: string;
  readonly model: string;
  readonly dimensions: number;
  readonly encodingFormat: string;
  readonly l2Normalized: boolean;
  readonly normalization: string;
  embed(inputs: readonly string[]): Promise<DashScopeEmbeddingBatch>;
}

export interface ImprintFragmentVectorInput {
  fragmentId: string;
  modelId: string;
  dimensions: number;
  l2Normalized: boolean;
  encodingFormat: string;
  normalization: string;
  embedding: readonly number[];
}

export interface StoredImprintFragmentVector {
  id: number;
  fragmentId: string;
  modelId: string;
  dimensions: number;
  l2Normalized: boolean;
  encodingFormat: string;
  normalization: string;
  status: 'inserted' | 'existing';
}

export interface ImprintFragmentVectorSearchResult {
  vectorId: number;
  fragmentId: string;
  modelId: string;
  dimensions: number;
  l2Normalized: boolean;
  encodingFormat: string;
  normalization: string;
  distance: number;
}

export interface ImprintEmbeddingSkippedFragment {
  fragmentId: string;
  reason: 'blank_text';
}

export interface ImprintEmbeddingRunResult {
  modelId: string;
  totalFragments: number;
  pendingFragments: number;
  inserted: number;
  alreadyEmbedded: number;
  skipped: ImprintEmbeddingSkippedFragment[];
  apiCalls: number;
  inputCharacters: number;
  batchSize: number;
  retryCount: 0;
}

interface ReceiptRow {
  id: number;
  fragment_id: string;
  model_id: string;
  dimensions: number;
  l2_normalized: number;
  encoding_format: string;
  normalization: string;
  vec_id: number | null;
}

interface FragmentRow {
  fragment_id: string;
  text: string;
}

function requiredText(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ImprintEmbeddingError('invalid_configuration', `${label} is required`);
  }
  return value.trim();
}

function assertDimensions(dimensions: number): void {
  if (dimensions !== DASHSCOPE_EMBEDDING_DIMENSIONS) {
    throw new ImprintEmbeddingError(
      'invalid_configuration',
      `Imprint vectors must have ${DASHSCOPE_EMBEDDING_DIMENSIONS} dimensions`,
    );
  }
}

function assertModelId(modelId: string, dimensions: number): string {
  const value = requiredText(modelId, 'modelId');
  const parts = value.split(':');
  if (parts.length < 3 || parts.at(-1) !== String(dimensions)) {
    throw new ImprintEmbeddingError(
      'invalid_configuration',
      'modelId must include provider, versioned model name, and dimensions',
    );
  }
  return value;
}

function serializeVector(embedding: readonly number[], dimensions: number): string {
  if (embedding.length !== dimensions || embedding.some((value) => !Number.isFinite(value))) {
    throw new ImprintEmbeddingError(
      'provider_contract_mismatch',
      `Embedding must contain exactly ${dimensions} finite values`,
    );
  }
  return JSON.stringify(Array.from(embedding));
}

function findReceipt(
  db: Database.Database,
  fragmentId: string,
  modelId: string,
): ReceiptRow | undefined {
  return db.prepare(`
    SELECT
      r.id,
      r.fragment_id,
      r.model_id,
      r.dimensions,
      r.l2_normalized,
      r.encoding_format,
      r.normalization,
      v.vector_id AS vec_id
    FROM imprint_fragment_vectors r
    LEFT JOIN imprint_fragment_vec v
      ON v.vector_id = r.id
     AND v.model_id = r.model_id
    WHERE r.fragment_id = ?
      AND r.model_id = ?
  `).get(fragmentId, modelId) as ReceiptRow | undefined;
}

function assertReceiptMatches(
  row: ReceiptRow,
  input: Omit<ImprintFragmentVectorInput, 'embedding'>,
): void {
  if (
    row.vec_id !== row.id
    || row.fragment_id !== input.fragmentId
    || row.model_id !== input.modelId
    || row.dimensions !== input.dimensions
    || Boolean(row.l2_normalized) !== input.l2Normalized
    || row.encoding_format !== input.encodingFormat
    || row.normalization !== input.normalization
  ) {
    throw new ImprintEmbeddingError(
      'vector_identity_conflict',
      `Stored vector identity is incomplete or conflicts for fragment ${input.fragmentId}`,
    );
  }
}

export function hasImprintFragmentVector(
  db: Database.Database,
  fragmentId: string,
  modelId: string,
): boolean {
  const row = findReceipt(db, fragmentId, modelId);
  if (!row) return false;
  if (row.vec_id !== row.id) {
    throw new ImprintEmbeddingError(
      'vector_identity_conflict',
      `Stored vector identity is incomplete for fragment ${fragmentId}`,
    );
  }
  return true;
}

export function storeImprintFragmentVector(
  db: Database.Database,
  input: ImprintFragmentVectorInput,
): StoredImprintFragmentVector {
  const fragmentId = requiredText(input.fragmentId, 'fragmentId');
  assertDimensions(input.dimensions);
  const modelId = assertModelId(input.modelId, input.dimensions);
  const encodingFormat = requiredText(input.encodingFormat, 'encodingFormat');
  const normalization = requiredText(input.normalization, 'normalization');
  const serialized = serializeVector(input.embedding, input.dimensions);
  const normalizedInput = {
    fragmentId,
    modelId,
    dimensions: input.dimensions,
    l2Normalized: input.l2Normalized,
    encodingFormat,
    normalization,
  };

  const existing = findReceipt(db, fragmentId, modelId);
  if (existing) {
    assertReceiptMatches(existing, normalizedInput);
    return {
      id: existing.id,
      ...normalizedInput,
      status: 'existing',
    };
  }

  const fragment = db.prepare('SELECT id FROM imprint_fragments WHERE id = ?')
    .get(fragmentId) as { id: string } | undefined;
  if (!fragment) {
    throw new ImprintEmbeddingError(
      'fragment_not_found',
      `Imprint fragment ${fragmentId} does not exist`,
    );
  }

  const insert = db.transaction(() => {
    const receipt = db.prepare(`
      INSERT INTO imprint_fragment_vectors (
        fragment_id, model_id, dimensions,
        l2_normalized, encoding_format, normalization
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      fragmentId,
      modelId,
      input.dimensions,
      input.l2Normalized ? 1 : 0,
      encodingFormat,
      normalization,
    );
    const id = Number(receipt.lastInsertRowid);
    db.prepare(`
      INSERT INTO imprint_fragment_vec (
        vector_id, embedding, model_id
      ) VALUES (?, vec_f32(?), ?)
    `).run(
      BigInt(receipt.lastInsertRowid),
      serialized,
      modelId,
    );
    return id;
  });
  const id = insert();

  return {
    id,
    ...normalizedInput,
    status: 'inserted',
  };
}

export function searchImprintFragmentVectors(
  db: Database.Database,
  input: {
    modelId: string;
    dimensions: number;
    embedding: readonly number[];
    limit: number;
  },
): ImprintFragmentVectorSearchResult[] {
  assertDimensions(input.dimensions);
  const modelId = assertModelId(input.modelId, input.dimensions);
  const serialized = serializeVector(input.embedding, input.dimensions);
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    throw new ImprintEmbeddingError(
      'invalid_configuration',
      'Vector search limit must be an integer from 1 through 100',
    );
  }

  const rows = db.prepare(`
    WITH nearest AS (
      SELECT
        vector_id,
        model_id,
        distance
      FROM imprint_fragment_vec
      WHERE embedding MATCH vec_f32(?)
        AND k = ?
        AND model_id = ?
    )
    SELECT
      nearest.vector_id,
      nearest.model_id,
      receipt.fragment_id,
      receipt.dimensions,
      receipt.l2_normalized,
      receipt.encoding_format,
      receipt.normalization,
      nearest.distance
    FROM nearest
    JOIN imprint_fragment_vectors receipt
      ON receipt.id = nearest.vector_id
     AND receipt.model_id = ?
    ORDER BY nearest.distance
  `).all(serialized, input.limit, modelId, modelId) as Array<{
    vector_id: number;
    fragment_id: string;
    model_id: string;
    dimensions: number;
    l2_normalized: number;
    encoding_format: string;
    normalization: string;
    distance: number;
  }>;

  return rows.map((row) => ({
    vectorId: row.vector_id,
    fragmentId: row.fragment_id,
    modelId: row.model_id,
    dimensions: row.dimensions,
    l2Normalized: Boolean(row.l2_normalized),
    encodingFormat: row.encoding_format,
    normalization: row.normalization,
    distance: row.distance,
  }));
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function resolveLimit(value: number | undefined, hardMaximum: number, label: string): number {
  const resolved = value ?? hardMaximum;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > hardMaximum) {
    throw new ImprintEmbeddingError(
      'invalid_configuration',
      `${label} must be an integer from 1 through ${hardMaximum}`,
    );
  }
  return resolved;
}

function assertProvider(provider: ImprintEmbeddingProvider): void {
  assertDimensions(provider.dimensions);
  assertModelId(provider.modelId, provider.dimensions);
  requiredText(provider.model, 'provider.model');
  requiredText(provider.encodingFormat, 'provider.encodingFormat');
  requiredText(provider.normalization, 'provider.normalization');
}

export async function embedImprintFragments(
  db: Database.Database,
  options: {
    provider?: ImprintEmbeddingProvider;
    batchSize?: number;
    maxApiCalls?: number;
    maxInputCharacters?: number;
  } = {},
): Promise<ImprintEmbeddingRunResult> {
  const provider = options.provider ?? createDashScopeEmbeddingProvider();
  assertProvider(provider);
  const batchSize = resolveLimit(
    options.batchSize ?? IMPRINT_EMBEDDING_DEFAULT_BATCH_SIZE,
    IMPRINT_EMBEDDING_MAX_BATCH_SIZE,
    'batchSize',
  );
  const maxApiCalls = resolveLimit(
    options.maxApiCalls,
    IMPRINT_EMBEDDING_HARD_MAX_API_CALLS,
    'maxApiCalls',
  );
  const maxInputCharacters = resolveLimit(
    options.maxInputCharacters,
    IMPRINT_EMBEDDING_HARD_MAX_INPUT_CHARACTERS,
    'maxInputCharacters',
  );

  const fragments = db.prepare(`
    SELECT f.id AS fragment_id, f.text
    FROM imprint_fragments f
    JOIN source_imprints imprint ON imprint.id = f.imprint_id
    WHERE imprint.status = 'accepted'
    ORDER BY imprint.created_at, f.imprint_id, f.seq, f.id
  `).all() as FragmentRow[];

  const skipped: ImprintEmbeddingSkippedFragment[] = [];
  const pending: FragmentRow[] = [];
  let alreadyEmbedded = 0;
  for (const fragment of fragments) {
    if (fragment.text.trim().length === 0) {
      skipped.push({ fragmentId: fragment.fragment_id, reason: 'blank_text' });
    } else if (hasImprintFragmentVector(db, fragment.fragment_id, provider.modelId)) {
      alreadyEmbedded += 1;
    } else {
      pending.push(fragment);
    }
  }

  const projectedCalls = Math.ceil(pending.length / batchSize);
  const projectedCharacters = pending.reduce(
    (sum, fragment) => sum + countCharacters(fragment.text),
    0,
  );
  if (projectedCalls > maxApiCalls || projectedCharacters > maxInputCharacters) {
    throw new ImprintEmbeddingError(
      'budget_exceeded',
      `Embedding run requires ${projectedCalls} calls and ${projectedCharacters} input characters`,
    );
  }

  let apiCalls = 0;
  let inputCharacters = 0;
  let inserted = 0;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const batchCharacters = batch.reduce(
      (sum, fragment) => sum + countCharacters(fragment.text),
      0,
    );
    apiCalls += 1;
    inputCharacters += batchCharacters;
    const response = await provider.embed(batch.map((fragment) => fragment.text));
    if (response.model !== provider.model || response.vectors.length !== batch.length) {
      throw new ImprintEmbeddingError(
        'provider_contract_mismatch',
        'Embedding provider returned an unexpected model or batch size',
      );
    }

    const storeBatch = db.transaction(() => {
      for (let index = 0; index < batch.length; index += 1) {
        const stored = storeImprintFragmentVector(db, {
          fragmentId: batch[index].fragment_id,
          modelId: provider.modelId,
          dimensions: provider.dimensions,
          l2Normalized: provider.l2Normalized,
          encodingFormat: provider.encodingFormat,
          normalization: provider.normalization,
          embedding: response.vectors[index],
        });
        if (stored.status === 'inserted') inserted += 1;
      }
    });
    storeBatch();
  }

  return {
    modelId: provider.modelId,
    totalFragments: fragments.length,
    pendingFragments: pending.length,
    inserted,
    alreadyEmbedded,
    skipped,
    apiCalls,
    inputCharacters,
    batchSize,
    retryCount: 0,
  };
}
