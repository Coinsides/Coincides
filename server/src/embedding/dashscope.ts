import { resolveProviderCredential } from '../services/providerCredentials.js';

export const DASHSCOPE_EMBEDDING_ENDPOINT =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings';
export const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v4';
export const DASHSCOPE_EMBEDDING_DIMENSIONS = 1024;
export const DASHSCOPE_EMBEDDING_ENCODING_FORMAT = 'float' as const;
export const DASHSCOPE_EMBEDDING_MODEL_ID =
  `dashscope:${DASHSCOPE_EMBEDDING_MODEL}:${DASHSCOPE_EMBEDDING_DIMENSIONS}`;

export type DashScopeEmbeddingErrorCode =
  | 'missing_api_key'
  | 'empty_batch'
  | 'invalid_input'
  | 'network_error'
  | 'http_error'
  | 'invalid_response';

export class DashScopeEmbeddingError extends Error {
  readonly code: DashScopeEmbeddingErrorCode;
  readonly httpStatus?: number;

  constructor(
    code: DashScopeEmbeddingErrorCode,
    message: string,
    httpStatus?: number,
  ) {
    super(message);
    this.name = 'DashScopeEmbeddingError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface DashScopeEmbeddingBatch {
  model: string;
  vectors: number[][];
}

export interface DashScopeEmbeddingProvider {
  readonly modelId: string;
  readonly model: string;
  readonly dimensions: number;
  readonly encodingFormat: typeof DASHSCOPE_EMBEDDING_ENCODING_FORMAT;
  readonly l2Normalized: false;
  readonly normalization: 'none';
  embed(inputs: readonly string[]): Promise<DashScopeEmbeddingBatch>;
}

export interface DashScopeCredentialMetadata {
  present: boolean;
  length: number;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface DashScopeResponseItem {
  embedding?: unknown;
  index?: unknown;
}

interface DashScopeResponseBody {
  data?: unknown;
  model?: unknown;
}

export function getDashScopeCredentialMetadata(): DashScopeCredentialMetadata {
  const value = resolveProviderCredential('dashscope') ?? '';
  return { present: value.length > 0, length: value.length };
}

function readDashScopeApiKey(): string {
  const value = resolveProviderCredential('dashscope') ?? '';
  if (!value) {
    throw new DashScopeEmbeddingError(
      'missing_api_key',
      'DashScope embedding credential is not configured',
    );
  }
  return value;
}

function validateInputs(inputs: readonly string[]): void {
  if (inputs.length === 0) {
    throw new DashScopeEmbeddingError('empty_batch', 'DashScope embedding batch is empty');
  }
  if (inputs.some((input) => typeof input !== 'string' || input.length === 0)) {
    throw new DashScopeEmbeddingError(
      'invalid_input',
      'DashScope embedding inputs must be non-empty strings',
    );
  }
}

function parseVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== DASHSCOPE_EMBEDDING_DIMENSIONS) return null;
  const vector = value.map(Number);
  return vector.every(Number.isFinite) ? vector : null;
}

function parseResponse(body: DashScopeResponseBody, expectedCount: number): DashScopeEmbeddingBatch {
  if (body.model !== DASHSCOPE_EMBEDDING_MODEL || !Array.isArray(body.data)) {
    throw new DashScopeEmbeddingError(
      'invalid_response',
      'DashScope embedding response has an unexpected model or data shape',
    );
  }

  const vectors = new Array<number[] | undefined>(expectedCount);
  for (const rawItem of body.data) {
    const item = rawItem as DashScopeResponseItem;
    const index = item.index;
    const vector = parseVector(item.embedding);
    if (
      !Number.isInteger(index)
      || (index as number) < 0
      || (index as number) >= expectedCount
      || vectors[index as number]
      || !vector
    ) {
      throw new DashScopeEmbeddingError(
        'invalid_response',
        'DashScope embedding response contains an invalid vector entry',
      );
    }
    vectors[index as number] = vector;
  }

  if (vectors.some((vector) => !vector)) {
    throw new DashScopeEmbeddingError(
      'invalid_response',
      'DashScope embedding response did not cover every input',
    );
  }

  return {
    model: body.model,
    vectors: vectors as number[][],
  };
}

export function createDashScopeEmbeddingProvider(
  options: { fetchImpl?: FetchLike } = {},
): DashScopeEmbeddingProvider {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new DashScopeEmbeddingError(
      'network_error',
      'No fetch implementation is available for DashScope embeddings',
    );
  }

  return {
    modelId: DASHSCOPE_EMBEDDING_MODEL_ID,
    model: DASHSCOPE_EMBEDDING_MODEL,
    dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
    encodingFormat: DASHSCOPE_EMBEDDING_ENCODING_FORMAT,
    l2Normalized: false,
    normalization: 'none',

    async embed(inputs: readonly string[]): Promise<DashScopeEmbeddingBatch> {
      validateInputs(inputs);
      const apiKey = readDashScopeApiKey();
      let response: Response;
      try {
        response = await fetchImpl(DASHSCOPE_EMBEDDING_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: DASHSCOPE_EMBEDDING_MODEL,
            input: inputs,
            dimensions: DASHSCOPE_EMBEDDING_DIMENSIONS,
            encoding_format: DASHSCOPE_EMBEDDING_ENCODING_FORMAT,
          }),
        });
      } catch {
        throw new DashScopeEmbeddingError(
          'network_error',
          'DashScope embedding request failed before receiving a response',
        );
      }

      if (!response.ok) {
        try {
          await response.body?.cancel();
        } catch {
          // The response body is intentionally neither inspected nor reported.
        }
        throw new DashScopeEmbeddingError(
          'http_error',
          `DashScope embedding request failed with HTTP ${response.status}`,
          response.status,
        );
      }

      let body: DashScopeResponseBody;
      try {
        body = await response.json() as DashScopeResponseBody;
      } catch {
        throw new DashScopeEmbeddingError(
          'invalid_response',
          'DashScope embedding response was not valid JSON',
        );
      }
      return parseResponse(body, inputs.length);
    },
  };
}
