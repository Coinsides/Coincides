import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  getImprintFragmentsByAnchor,
  getSourceImprint,
  type PageAnchor,
} from './sourceImprints.js';

export const IMPRINT_CITATION_REJECTION_CODES = [
  'output_schema_invalid',
  'request_id_mismatch',
  'citation_fragment_unknown',
  'citation_imprint_mismatch',
  'citation_lockfile_mismatch',
  'citation_anchor_replay_failed',
] as const;

export type ImprintCitationRejectionCode = typeof IMPRINT_CITATION_REJECTION_CODES[number];
export type ImprintCitationStatus = 'accepted' | 'partial' | 'rejected';

export class ImprintCitationPreparationError extends Error {
  readonly code: 'identity_mapping_stop' | 'input_schema_invalid';

  constructor(code: ImprintCitationPreparationError['code'], message: string) {
    super(message);
    this.name = 'ImprintCitationPreparationError';
    this.code = code;
  }
}

export interface CitationInputFragment {
  fragment_id: string;
  anchor: PageAnchor;
  text: string;
}

export interface CitationCanonicalInput {
  schema_version: 'citation-input.v1';
  request_id: string;
  page_range: { start: number; end: number };
  fragments: CitationInputFragment[];
}

export interface ImprintCitationContext {
  input: CitationCanonicalInput;
  host: {
    user_id: string;
    source_file_id: string;
    original_filename: string;
    imprint_id: string;
    transcriber_lockfile_hash: string;
  };
}

export interface CitationExistenceEvidence {
  path: string;
  canonical_anchor: { page: number };
}

export interface CitationExistenceReceipt {
  existence_id: string;
  document: string;
  docling_evidence: CitationExistenceEvidence[];
  mineru_evidence: CitationExistenceEvidence[];
}

export type CitationExistenceIndex = ReadonlyMap<string, ReadonlyMap<number, readonly string[]>>;

export interface CitationRejectionLedgerEntry {
  scope: 'response' | 'claim';
  request_id: string;
  claim_id: string | null;
  citation_fragment_id: string | null;
  code: ImprintCitationRejectionCode;
}

export interface ValidatedCitation {
  fragment_id: string;
  uncorroborated: boolean;
  existence_receipt_ids: string[];
}

export interface ValidatedCitationClaim {
  claim_id: string;
  statement: string;
  citations: ValidatedCitation[];
}

export interface ImprintCitationValidationResult {
  request_id: string;
  status: ImprintCitationStatus;
  accepted_claims: ValidatedCitationClaim[];
  rejected_claim_count: number;
  abstentions: Array<{ reason: 'insufficient_support' }>;
  rejection_ledger: CitationRejectionLedgerEntry[];
}

interface CitationOwnershipRow {
  fragment_id: string;
  imprint_id: string;
  anchor_json: string;
  user_id: string;
  transcriber_lockfile_hash: string | null;
}

interface CitationHostRow {
  source_file_id: string;
  original_filename: string;
}

const pageAnchorSchema = z.object({
  family: z.literal('page'),
  page: z.number().int().min(1),
  block_index: z.number().int().min(0).optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
}).strict();

const citationOutputSchema = z.object({
  schema_version: z.literal('citation-output.v1'),
  request_id: z.string().min(1).max(120),
  claims: z.array(z.object({
    claim_id: z.string().regex(/^c[1-9][0-9]*$/),
    statement: z.string().min(1).max(500),
    citations: z.array(z.object({
      fragment_id: z.string().min(1),
    }).strict()).min(1).max(8),
  }).strict()).max(12),
  abstentions: z.array(z.object({
    reason: z.literal('insufficient_support'),
  }).strict()).max(1),
}).strict();

type CitationModelOutput = z.infer<typeof citationOutputSchema>;

function inputError(message: string): never {
  throw new ImprintCitationPreparationError('input_schema_invalid', message);
}

function canonicalPageAnchor(anchor: PageAnchor): PageAnchor {
  const parsed = pageAnchorSchema.safeParse(anchor);
  if (!parsed.success) inputError('Citation input contains a non-canonical page anchor');
  const result: PageAnchor = { family: 'page', page: parsed.data.page };
  if (parsed.data.block_index !== undefined) result.block_index = parsed.data.block_index;
  if (parsed.data.bbox !== undefined) result.bbox = parsed.data.bbox;
  return result;
}

function assertRequestId(requestId: string): void {
  if (requestId.length < 1 || requestId.length > 120) {
    inputError('Citation request_id must contain 1 through 120 characters');
  }
}

function assertPageRange(pageRange: { start: number; end: number }): void {
  if (!Number.isInteger(pageRange.start)
    || !Number.isInteger(pageRange.end)
    || pageRange.start < 1
    || pageRange.end < pageRange.start) {
    inputError('Citation page_range must contain ordered positive integers');
  }
}

export function alignCitationEvidenceFilename(
  censusBasename: string,
  hostOriginalFilename: string,
): string {
  const censusSuffix = '.fragments.json';
  const hostSuffix = '.pdf';
  if (!censusBasename.endsWith(censusSuffix)) {
    throw new ImprintCitationPreparationError(
      'identity_mapping_stop',
      `Census evidence basename does not end with ${censusSuffix}`,
    );
  }
  if (!hostOriginalFilename.endsWith(hostSuffix)) {
    throw new ImprintCitationPreparationError(
      'identity_mapping_stop',
      `Host original_filename does not end with ${hostSuffix}`,
    );
  }
  const censusStem = censusBasename.slice(0, -censusSuffix.length);
  const hostStem = hostOriginalFilename.slice(0, -hostSuffix.length);
  if (censusStem !== hostStem) {
    throw new ImprintCitationPreparationError(
      'identity_mapping_stop',
      'Census evidence and host filename stems differ',
    );
  }
  return censusStem;
}

function pathBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.at(-1) ?? '';
}

export function buildCitationExistenceIndex(
  receipts: readonly CitationExistenceReceipt[],
  hosts: readonly { document: string; original_filename: string }[],
): CitationExistenceIndex {
  const hostByDocument = new Map<string, string>();
  for (const host of hosts) {
    if (hostByDocument.has(host.document)) {
      throw new ImprintCitationPreparationError(
        'identity_mapping_stop',
        `Document ${host.document} has more than one citation host`,
      );
    }
    hostByDocument.set(host.document, host.original_filename);
  }

  const mutable = new Map<string, Map<number, Set<string>>>();
  for (const receipt of receipts) {
    const hostFilename = hostByDocument.get(receipt.document);
    if (!hostFilename) {
      throw new ImprintCitationPreparationError(
        'identity_mapping_stop',
        `Existence receipt ${receipt.existence_id} has no citation host`,
      );
    }
    const evidence = [...receipt.docling_evidence, ...receipt.mineru_evidence];
    for (const item of evidence) {
      alignCitationEvidenceFilename(pathBasename(item.path), hostFilename);
      if (!Number.isInteger(item.canonical_anchor.page) || item.canonical_anchor.page < 1) {
        throw new ImprintCitationPreparationError(
          'identity_mapping_stop',
          `Existence receipt ${receipt.existence_id} has an invalid canonical page`,
        );
      }
      let pages = mutable.get(hostFilename);
      if (!pages) {
        pages = new Map();
        mutable.set(hostFilename, pages);
      }
      let ids = pages.get(item.canonical_anchor.page);
      if (!ids) {
        ids = new Set();
        pages.set(item.canonical_anchor.page, ids);
      }
      ids.add(receipt.existence_id);
    }
  }

  return new Map([...mutable].map(([filename, pages]) => [
    filename,
    new Map([...pages].map(([page, ids]) => [page, [...ids].sort()])),
  ]));
}

export function prepareImprintCitationRequest(
  db: Database.Database,
  userId: string,
  options: {
    requestId: string;
    imprintId: string;
    pageRange: { start: number; end: number };
  },
): ImprintCitationContext {
  assertRequestId(options.requestId);
  assertPageRange(options.pageRange);
  const { imprint, fragments } = getSourceImprint(db, userId, options.imprintId);
  if (imprint.status !== 'accepted') inputError('Citation host imprint is not accepted');
  if (typeof imprint.transcriber_lockfile_hash !== 'string') {
    inputError('Citation host imprint has no transcriber lockfile hash');
  }
  const host = db.prepare(`
    SELECT source.id AS source_file_id, source.original_filename
    FROM source_files source
    WHERE source.id = ? AND source.user_id = ?
  `).get(imprint.source_file_id, userId) as CitationHostRow | undefined;
  if (!host) inputError('Citation host source file is not owned by the user');

  const selected: CitationInputFragment[] = [];
  for (const fragment of fragments) {
    if (fragment.anchor.family !== 'page'
      || fragment.anchor.page < options.pageRange.start
      || fragment.anchor.page > options.pageRange.end) continue;
    const anchor = canonicalPageAnchor(fragment.anchor);
    const replayed = getImprintFragmentsByAnchor(
      db,
      userId,
      options.imprintId,
      { match: 'exact', anchor },
    );
    const hydrated = replayed.find((candidate) => candidate.id === fragment.id);
    if (!hydrated) inputError(`Fragment ${fragment.id} failed exact-anchor hydration`);
    if (hydrated.text.length < 1) inputError(`Fragment ${fragment.id} has empty text`);
    selected.push({ fragment_id: hydrated.id, anchor, text: hydrated.text });
  }
  selected.sort((left, right) => (
    left.anchor.page - right.anchor.page
      || (left.fragment_id < right.fragment_id ? -1 : left.fragment_id > right.fragment_id ? 1 : 0)
  ));
  if (selected.length < 1 || selected.length > 20) {
    inputError('Citation page range must resolve to 1 through 20 fragments');
  }
  if (new Set(selected.map((fragment) => fragment.fragment_id)).size !== selected.length) {
    inputError('Citation input fragment IDs must be unique');
  }

  return {
    input: {
      schema_version: 'citation-input.v1',
      request_id: options.requestId,
      page_range: { start: options.pageRange.start, end: options.pageRange.end },
      fragments: selected,
    },
    host: {
      user_id: userId,
      source_file_id: host.source_file_id,
      original_filename: host.original_filename,
      imprint_id: options.imprintId,
      transcriber_lockfile_hash: imprint.transcriber_lockfile_hash,
    },
  };
}

function responseLedger(
  requestId: string,
  code: Extract<ImprintCitationRejectionCode, 'output_schema_invalid' | 'request_id_mismatch'>,
): CitationRejectionLedgerEntry[] {
  return [{
    scope: 'response',
    request_id: requestId,
    claim_id: null,
    citation_fragment_id: null,
    code,
  }];
}

function rejectedResponse(
  requestId: string,
  code: Extract<ImprintCitationRejectionCode, 'output_schema_invalid' | 'request_id_mismatch'>,
): ImprintCitationValidationResult {
  return {
    request_id: requestId,
    status: 'rejected',
    accepted_claims: [],
    rejected_claim_count: 0,
    abstentions: [],
    rejection_ledger: responseLedger(requestId, code),
  };
}

function hasOutputInvariants(output: CitationModelOutput): boolean {
  if (output.claims.length === 0) {
    if (output.abstentions.length !== 1) return false;
  } else if (output.abstentions.length !== 0) return false;
  for (let index = 0; index < output.claims.length; index += 1) {
    const claim = output.claims[index];
    if (claim.claim_id !== `c${index + 1}`) return false;
    if (new Set(claim.citations.map((citation) => citation.fragment_id)).size
      !== claim.citations.length) return false;
  }
  return true;
}

function parseModelOutput(rawResponse: string): CitationModelOutput | null {
  if (rawResponse !== rawResponse.trim()
    || !rawResponse.startsWith('{')
    || !rawResponse.endsWith('}')) return null;
  try {
    const parsed = citationOutputSchema.safeParse(JSON.parse(rawResponse));
    if (!parsed.success || !hasOutputInvariants(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function claimLedgerEntry(
  context: ImprintCitationContext,
  claimId: string,
  fragmentId: string,
  code: Exclude<ImprintCitationRejectionCode, 'output_schema_invalid' | 'request_id_mismatch'>,
): CitationRejectionLedgerEntry {
  return {
    scope: 'claim',
    request_id: context.input.request_id,
    claim_id: claimId,
    citation_fragment_id: fragmentId,
    code,
  };
}

export function validateImprintCitationResponse(
  db: Database.Database,
  context: ImprintCitationContext,
  rawResponse: string,
  options: {
    activeLockfileHash: string;
    existenceIndex?: CitationExistenceIndex;
  },
): ImprintCitationValidationResult {
  const output = parseModelOutput(rawResponse);
  if (!output) return rejectedResponse(context.input.request_id, 'output_schema_invalid');
  if (output.request_id !== context.input.request_id) {
    return rejectedResponse(context.input.request_id, 'request_id_mismatch');
  }

  const candidateById = new Map(context.input.fragments.map((fragment) => [
    fragment.fragment_id,
    fragment,
  ]));
  const acceptedClaims: ValidatedCitationClaim[] = [];
  const ledger: CitationRejectionLedgerEntry[] = [];
  let rejectedClaimCount = 0;

  for (const claim of output.claims) {
    const claimLedger: CitationRejectionLedgerEntry[] = [];
    const citations: ValidatedCitation[] = [];
    for (const citation of claim.citations) {
      const candidate = candidateById.get(citation.fragment_id);
      if (!candidate) {
        claimLedger.push(claimLedgerEntry(
          context,
          claim.claim_id,
          citation.fragment_id,
          'citation_fragment_unknown',
        ));
        continue;
      }
      const ownership = db.prepare(`
        SELECT
          fragment.id AS fragment_id,
          fragment.imprint_id,
          fragment.anchor_json,
          imprint.user_id,
          imprint.transcriber_lockfile_hash
        FROM imprint_fragments fragment
        JOIN source_imprints imprint ON imprint.id = fragment.imprint_id
        WHERE fragment.id = ?
      `).get(citation.fragment_id) as CitationOwnershipRow | undefined;
      if (!ownership) {
        claimLedger.push(claimLedgerEntry(
          context,
          claim.claim_id,
          citation.fragment_id,
          'citation_fragment_unknown',
        ));
        continue;
      }
      if (ownership.imprint_id !== context.host.imprint_id
        || ownership.user_id !== context.host.user_id) {
        claimLedger.push(claimLedgerEntry(
          context,
          claim.claim_id,
          citation.fragment_id,
          'citation_imprint_mismatch',
        ));
        continue;
      }
      if (ownership.transcriber_lockfile_hash !== options.activeLockfileHash) {
        claimLedger.push(claimLedgerEntry(
          context,
          claim.claim_id,
          citation.fragment_id,
          'citation_lockfile_mismatch',
        ));
        continue;
      }

      let replayed: ReturnType<typeof getImprintFragmentsByAnchor>;
      try {
        replayed = getImprintFragmentsByAnchor(
          db,
          context.host.user_id,
          context.host.imprint_id,
          { match: 'exact', anchor: candidate.anchor },
        );
      } catch {
        replayed = [];
      }
      if (!replayed.some((fragment) => fragment.id === citation.fragment_id)) {
        claimLedger.push(claimLedgerEntry(
          context,
          claim.claim_id,
          citation.fragment_id,
          'citation_anchor_replay_failed',
        ));
        continue;
      }

      const receiptIds = [...(
        options.existenceIndex
          ?.get(context.host.original_filename)
          ?.get(candidate.anchor.page) ?? []
      )].sort();
      citations.push({
        fragment_id: citation.fragment_id,
        uncorroborated: receiptIds.length > 0,
        existence_receipt_ids: receiptIds,
      });
    }
    if (claimLedger.length > 0) {
      rejectedClaimCount += 1;
      ledger.push(...claimLedger);
    } else {
      acceptedClaims.push({
        claim_id: claim.claim_id,
        statement: claim.statement,
        citations,
      });
    }
  }

  const status: ImprintCitationStatus = ledger.length === 0
    ? 'accepted'
    : acceptedClaims.length === 0
      ? 'rejected'
      : 'partial';
  return {
    request_id: context.input.request_id,
    status,
    accepted_claims: acceptedClaims,
    rejected_claim_count: rejectedClaimCount,
    abstentions: output.abstentions,
    rejection_ledger: ledger,
  };
}
