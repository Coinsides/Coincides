import type Database from 'better-sqlite3';
import { createDashScopeEmbeddingProvider } from '../embedding/dashscope.js';
import {
  searchImprintFragmentVectors,
  type ImprintEmbeddingProvider,
  type ImprintFragmentVectorSearchResult,
} from './imprintEmbedding.js';
import {
  getImprintFragmentsByAnchor,
  type SourceImprintAnchor,
  type SourceImprintAnchorFidelity,
  type SourceImprintRole,
  type SourceImprintTextNormalization,
} from './sourceImprints.js';

export type ImprintRetrievalErrorCode =
  | 'invalid_input'
  | 'provider_contract_mismatch'
  | 'ownership_receipt_missing'
  | 'hydration_failed';

export class ImprintRetrievalError extends Error {
  readonly code: ImprintRetrievalErrorCode;

  constructor(code: ImprintRetrievalErrorCode, message: string) {
    super(message);
    this.name = 'ImprintRetrievalError';
    this.code = code;
  }
}

export interface RetrievalOwnershipRow {
  fragment_id: string;
  imprint_id: string;
  anchor_json: string;
  transcriber_name: string;
  transcriber_version: string;
  transcriber_lockfile_hash: string | null;
  anchor_fidelity: SourceImprintAnchorFidelity;
  text_normalization: SourceImprintTextNormalization;
  source_file_identity: string;
  original_filename: string;
  content_hash: string;
}

export interface OwnedVectorMatch {
  vector: ImprintFragmentVectorSearchResult;
  ownership: RetrievalOwnershipRow;
  anchor: SourceImprintAnchor;
}

export interface ImprintRetrievalResult {
  fragment: {
    id: string;
    seq: number;
    role: SourceImprintRole;
    text: string;
    anchor: SourceImprintAnchor;
    lang: string | null;
  };
  imprint: {
    id: string;
    transcriber_name: string;
    transcriber_version: string;
    transcriber_lockfile_hash: string;
    anchor_fidelity: SourceImprintAnchorFidelity;
    text_normalization: SourceImprintTextNormalization;
  };
  source_file: {
    id: string;
    original_filename: string;
    content_hash: string;
  };
  retrieval: {
    model_id: string;
    distance: number;
    anchor_match_count: number;
  };
}

function requiredQuery(value: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ImprintRetrievalError('invalid_input', 'query is required');
  }
  return value.trim();
}

function resolveK(value: number | undefined): number {
  const resolved = value ?? 5;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 20) {
    throw new ImprintRetrievalError('invalid_input', 'k must be an integer from 1 through 20');
  }
  return resolved;
}

function parseAnchor(value: string, fragmentId: string): SourceImprintAnchor {
  try {
    return JSON.parse(value) as SourceImprintAnchor;
  } catch {
    throw new ImprintRetrievalError(
      'hydration_failed',
      `Retrieval anchor receipt is invalid for fragment ${fragmentId}`,
    );
  }
}

function requiredProvenance(value: string | null, label: string, fragmentId: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ImprintRetrievalError(
      'ownership_receipt_missing',
      `Retrieval provenance ${label} is missing for fragment ${fragmentId}`,
    );
  }
  return value;
}

function loadOwnedVectorMatches(
  db: Database.Database,
  userId: string,
  vectors: readonly ImprintFragmentVectorSearchResult[],
  k: number,
): OwnedVectorMatch[] {
  if (vectors.length === 0) return [];
  const placeholders = vectors.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT
      f.id AS fragment_id,
      f.imprint_id,
      f.anchor_json,
      imprint.*,
      source.id AS source_file_identity,
      source.original_filename,
      source.content_hash
    FROM imprint_fragments f
    JOIN source_imprints imprint
      ON imprint.id = f.imprint_id
     AND imprint.user_id = ?
     AND imprint.status = 'accepted'
    JOIN source_files source
      ON source.id = imprint.source_file_id
     AND source.user_id = imprint.user_id
    WHERE f.id IN (${placeholders})
  `).all(userId, ...vectors.map((vector) => vector.fragmentId)) as RetrievalOwnershipRow[];
  const byFragmentId = new Map(rows.map((row) => [row.fragment_id, row]));

  const owned: OwnedVectorMatch[] = [];
  for (const vector of vectors) {
    const ownership = byFragmentId.get(vector.fragmentId);
    if (!ownership) continue;
    owned.push({
      vector,
      ownership,
      anchor: parseAnchor(ownership.anchor_json, vector.fragmentId),
    });
    if (owned.length === k) break;
  }
  return owned;
}

export function hydrateImprintRetrievalMatch(
  db: Database.Database,
  userId: string,
  match: OwnedVectorMatch,
): ImprintRetrievalResult {
  const fragments = getImprintFragmentsByAnchor(
    db,
    userId,
    match.ownership.imprint_id,
    { match: 'exact', anchor: match.anchor },
  );
  const fragment = fragments.find((candidate) => candidate.id === match.vector.fragmentId);
  if (!fragment) {
    throw new ImprintRetrievalError(
      'hydration_failed',
      `Retrieval fragment ${match.vector.fragmentId} is absent from its anchor replay`,
    );
  }

  return {
    fragment: {
      id: fragment.id,
      seq: fragment.seq,
      role: fragment.role,
      text: fragment.text,
      anchor: fragment.anchor,
      lang: fragment.lang,
    },
    imprint: {
      id: match.ownership.imprint_id,
      transcriber_name: requiredProvenance(
        match.ownership.transcriber_name,
        'transcriber_name',
        fragment.id,
      ),
      transcriber_version: requiredProvenance(
        match.ownership.transcriber_version,
        'transcriber_version',
        fragment.id,
      ),
      transcriber_lockfile_hash: requiredProvenance(
        match.ownership.transcriber_lockfile_hash,
        'transcriber_lockfile_hash',
        fragment.id,
      ),
      anchor_fidelity: match.ownership.anchor_fidelity,
      text_normalization: match.ownership.text_normalization,
    },
    source_file: {
      id: match.ownership.source_file_identity,
      original_filename: requiredProvenance(
        match.ownership.original_filename,
        'original_filename',
        fragment.id,
      ),
      content_hash: requiredProvenance(
        match.ownership.content_hash,
        'content_hash',
        fragment.id,
      ),
    },
    retrieval: {
      model_id: match.vector.modelId,
      distance: match.vector.distance,
      anchor_match_count: fragments.length,
    },
  };
}

export async function retrieveImprintFragments(
  db: Database.Database,
  userId: string,
  input: {
    query: string;
    k?: number;
    provider?: ImprintEmbeddingProvider;
  },
): Promise<ImprintRetrievalResult[]> {
  const query = requiredQuery(input.query);
  const k = resolveK(input.k);
  const provider = input.provider ?? createDashScopeEmbeddingProvider();
  const embedded = await provider.embed([query]);
  if (embedded.model !== provider.model || embedded.vectors.length !== 1) {
    throw new ImprintRetrievalError(
      'provider_contract_mismatch',
      'Query embedding provider returned an unexpected model or batch size',
    );
  }

  const vectors = searchImprintFragmentVectors(db, {
    modelId: provider.modelId,
    dimensions: provider.dimensions,
    embedding: embedded.vectors[0],
    limit: Math.min(k * 5, 100),
  });
  return loadOwnedVectorMatches(db, userId, vectors, k)
    .map((match) => hydrateImprintRetrievalMatch(db, userId, match));
}
