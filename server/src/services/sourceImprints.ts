import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { resolveSourceStorageKey } from './sourceFileIntake.js';
import {
  canonicalizeSourceText,
  nonWhitespaceText,
} from './sourceTextCanonical.js';

export const SOURCE_IMPRINT_ROLES = [
  'heading',
  'para',
  'list_item',
  'table_row',
  'cell',
  'slide_shape',
  'caption',
  'code_line',
  'footnote',
  'blank',
] as const;

export const SOURCE_IMPRINT_WARNING_CODES = [
  'unreadable_segment',
  'empty_segment',
  'decode_failed',
] as const;

export const SOURCE_IMPRINT_REJECTION_CODES = [
  'fidelity_mismatch',
  'anchor_invalid',
  'fidelity_overclaim',
  'order_violation',
] as const;

export const SOURCE_IMPRINT_ANCHOR_FIDELITIES = [
  'region',
  'block',
  'page',
  'char',
  'element',
  'section',
  'cell',
] as const;

export const SOURCE_IMPRINT_TEXT_NORMALIZATIONS = [
  'none',
  'punctuation',
  'whitespace',
] as const;

export type SourceImprintRole = typeof SOURCE_IMPRINT_ROLES[number];
export type SourceImprintWarningCode = typeof SOURCE_IMPRINT_WARNING_CODES[number];
export type SourceImprintRejectionCode = typeof SOURCE_IMPRINT_REJECTION_CODES[number];
export type SourceImprintAnchorFidelity = typeof SOURCE_IMPRINT_ANCHOR_FIDELITIES[number];
export type SourceImprintTextNormalization = typeof SOURCE_IMPRINT_TEXT_NORMALIZATIONS[number];

export type PageAnchor = {
  family: 'page';
  page: number;
  block_index?: number;
  bbox?: [number, number, number, number];
};

export type FlowAnchor = {
  family: 'flow';
  path: string;
  char?: [number, number];
  line?: [number, number];
};

export type TableAnchor = {
  family: 'table';
  sheet: string;
  cell?: string;
  row?: number;
  col?: number;
};

export type SlideAnchor = {
  family: 'slide';
  slide: number;
  shape: string;
};

export type TimeAnchor = {
  family: 'time';
  ms: [number, number];
};

export type SourceImprintAnchor =
  | PageAnchor
  | FlowAnchor
  | TableAnchor
  | SlideAnchor
  | TimeAnchor;

export interface SourceImprintWarning {
  code: SourceImprintWarningCode;
  anchor: SourceImprintAnchor;
  detail?: string;
}

export interface SourceImprintRejectionReason {
  code: SourceImprintRejectionCode;
  detail?: string;
}

export interface SourceImprintFragmentInput {
  seq: number;
  text: string;
  role: SourceImprintRole;
  anchor: SourceImprintAnchor;
  style?: Record<string, unknown> | null;
  lang?: string | null;
}

export interface SourceImprintInput {
  source_file_id: string;
  transcriber: {
    name: string;
    version: string;
    lockfile: string;
    lockfile_hash: string;
  };
  anchor_fidelity: SourceImprintAnchorFidelity;
  text_normalization: SourceImprintTextNormalization;
  fragments: SourceImprintFragmentInput[];
  warnings?: SourceImprintWarning[];
}

export interface SourceImprintStorageOptions {
  rootDir?: string;
  now?: Date;
}

export type SourceImprintAnchorQuery =
  | { match: 'exact'; anchor: SourceImprintAnchor }
  | {
    match: 'locator';
    selector:
      | { family: 'page'; page: number }
      | { family: 'flow'; path: string }
      | { family: 'table'; sheet: string }
      | { family: 'slide'; slide: number }
      | { family: 'time'; ms: [number, number] };
  };

interface SourceImprintRow {
  id: string;
  user_id: string;
  source_file_id: string;
  transcriber_name: string;
  transcriber_version: string;
  transcriber_lockfile: string;
  transcriber_lockfile_hash: string | null;
  anchor_fidelity: SourceImprintAnchorFidelity;
  text_normalization: SourceImprintTextNormalization;
  fragment_count: number;
  warnings_json: string;
  status: 'accepted' | 'rejected';
  rejection_reasons_json: string;
  created_at: string;
}

interface ImprintFragmentRow {
  id: string;
  imprint_id: string;
  seq: number;
  text: string;
  role: SourceImprintRole;
  anchor_json: string;
  style_json: string | null;
  lang: string | null;
  created_at: string;
}

interface OwnedSourceFileRow {
  id: string;
  storage_key: string;
  storage_state: 'staging' | 'ready';
}

interface FlowSpan {
  start: number;
  end: number;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `${label} is required`);
  }
  return value.trim();
}

function requiredSha256(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new AppError(400, `${label} must be a lowercase SHA-256 hex digest`);
  }
  return value;
}

export function sameSourceImprintTranscriber(
  left: { transcriber_lockfile_hash: string | null },
  right: { transcriber_lockfile_hash: string | null },
): boolean {
  const leftHash = left.transcriber_lockfile_hash;
  const rightHash = right.transcriber_lockfile_hash;
  return typeof leftHash === 'string'
    && typeof rightHash === 'string'
    && /^[a-f0-9]{64}$/.test(leftHash)
    && /^[a-f0-9]{64}$/.test(rightHash)
    && leftHash === rightHash;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteRange(value: unknown, integerOnly = true): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((entry) => (
      typeof entry === 'number'
      && Number.isFinite(entry)
      && (!integerOnly || Number.isInteger(entry))
    ))
    && value[0] >= 0
    && value[1] >= value[0];
}

function isNormalizedBbox(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value)
    && value.length === 4
    && value.every((entry) => (
      typeof entry === 'number'
      && Number.isFinite(entry)
      && entry >= 0
      && entry <= 1
    ))
    && value[0] <= value[2]
    && value[1] <= value[3];
}

function isSourceImprintAnchor(value: unknown): value is SourceImprintAnchor {
  if (!isRecord(value) || typeof value.family !== 'string') return false;
  if (value.family === 'page') {
    return Number.isInteger(value.page)
      && (value.page as number) >= 1
      && (value.block_index === undefined || (
        Number.isInteger(value.block_index) && (value.block_index as number) >= 0
      ))
      && (value.bbox === undefined || isNormalizedBbox(value.bbox));
  }
  if (value.family === 'flow') {
    return typeof value.path === 'string'
      && value.path.trim().length > 0
      && (value.char === undefined || isFiniteRange(value.char))
      && (value.line === undefined || isFiniteRange(value.line));
  }
  if (value.family === 'table') {
    const hasCell = typeof value.cell === 'string' && value.cell.trim().length > 0;
    const hasRowAndColumn = Number.isInteger(value.row)
      && (value.row as number) >= 0
      && Number.isInteger(value.col)
      && (value.col as number) >= 0;
    return typeof value.sheet === 'string'
      && value.sheet.trim().length > 0
      && (hasCell || hasRowAndColumn);
  }
  if (value.family === 'slide') {
    return Number.isInteger(value.slide)
      && (value.slide as number) >= 1
      && typeof value.shape === 'string'
      && value.shape.trim().length > 0;
  }
  if (value.family === 'time') {
    return isFiniteRange(value.ms, false);
  }
  return false;
}

function projectAnchor(anchor: unknown): unknown {
  if (!isRecord(anchor)) return anchor;
  if (anchor.family === 'page') {
    return {
      family: 'page',
      page: anchor.page,
      ...(anchor.block_index === undefined ? {} : { block_index: anchor.block_index }),
      ...(anchor.bbox === undefined ? {} : { bbox: anchor.bbox }),
    };
  }
  if (anchor.family === 'flow') {
    return {
      family: 'flow',
      path: anchor.path,
      ...(anchor.char === undefined ? {} : { char: anchor.char }),
      ...(anchor.line === undefined ? {} : { line: anchor.line }),
    };
  }
  if (anchor.family === 'table') {
    return {
      family: 'table',
      sheet: anchor.sheet,
      ...(anchor.cell === undefined ? {} : { cell: anchor.cell }),
      ...(anchor.row === undefined ? {} : { row: anchor.row }),
      ...(anchor.col === undefined ? {} : { col: anchor.col }),
    };
  }
  if (anchor.family === 'slide') {
    return { family: 'slide', slide: anchor.slide, shape: anchor.shape };
  }
  if (anchor.family === 'time') {
    return { family: 'time', ms: anchor.ms };
  }
  return typeof anchor.family === 'string' ? { family: anchor.family } : {};
}

function canonicalizeAnchor(anchor: unknown): unknown {
  const projected = projectAnchor(anchor);
  const serialized = JSON.stringify(projected);
  return serialized === undefined ? projected : JSON.parse(serialized) as unknown;
}

function canonicalizeWarning(warning: SourceImprintWarning): SourceImprintWarning {
  return {
    code: warning.code,
    anchor: canonicalizeAnchor(warning.anchor) as SourceImprintAnchor,
    ...(warning.detail === undefined ? {} : { detail: warning.detail }),
  };
}

function assertAnchorHasProducer(anchor: unknown): void {
  if (isRecord(anchor) && anchor.family === 'time') {
    throw new AppError(400, 'Time anchors do not have a producer in this segment');
  }
}

function assertInputContract(input: SourceImprintInput): void {
  requiredText(input.source_file_id, 'source_file_id');
  if (!input.transcriber || typeof input.transcriber !== 'object') {
    throw new AppError(400, 'Source imprint transcriber is required');
  }
  requiredText(input.transcriber.name, 'transcriber.name');
  requiredText(input.transcriber.version, 'transcriber.version');
  requiredText(input.transcriber.lockfile, 'transcriber.lockfile');
  requiredSha256(input.transcriber.lockfile_hash, 'transcriber.lockfile_hash');
  if (!SOURCE_IMPRINT_ANCHOR_FIDELITIES.includes(input.anchor_fidelity)) {
    throw new AppError(400, 'Invalid Source imprint anchor fidelity');
  }
  if (!SOURCE_IMPRINT_TEXT_NORMALIZATIONS.includes(input.text_normalization)) {
    throw new AppError(400, 'Invalid Source imprint text normalization');
  }
  if (!Array.isArray(input.fragments) || !Array.isArray(input.warnings || [])) {
    throw new AppError(400, 'Source imprint fragments and warnings must be arrays');
  }
  for (const fragment of input.fragments) {
    assertAnchorHasProducer(fragment.anchor);
    if (!SOURCE_IMPRINT_ROLES.includes(fragment.role)) {
      throw new AppError(400, 'Invalid Source imprint fragment role');
    }
    if (fragment.style !== undefined && fragment.style !== null && !isRecord(fragment.style)) {
      throw new AppError(400, 'Source imprint fragment style must be an object');
    }
    if (fragment.lang !== undefined && fragment.lang !== null && typeof fragment.lang !== 'string') {
      throw new AppError(400, 'Source imprint fragment lang must be a string');
    }
  }
  for (const warning of input.warnings || []) {
    assertAnchorHasProducer(warning.anchor);
    if (!SOURCE_IMPRINT_WARNING_CODES.includes(warning.code)) {
      throw new AppError(400, 'Invalid Source imprint warning code');
    }
    if (warning.detail !== undefined && typeof warning.detail !== 'string') {
      throw new AppError(400, 'Source imprint warning detail must be a string');
    }
  }
}

function byteEqual(left: string, right: string): boolean {
  return Buffer.from(left, 'utf8').equals(Buffer.from(right, 'utf8'));
}

function addReason(
  reasons: SourceImprintRejectionReason[],
  code: SourceImprintRejectionCode,
  detail: string,
): void {
  if (!reasons.some((reason) => reason.code === code && reason.detail === detail)) {
    reasons.push({ code, detail });
  }
}

function canonicalizeValidatedText(
  value: string,
  normalization: SourceImprintTextNormalization,
  reasons: SourceImprintRejectionReason[],
): string {
  const canonical = canonicalizeSourceText(value, normalization);
  if (
    normalization === 'whitespace'
    && !byteEqual(nonWhitespaceText(canonical), nonWhitespaceText(value))
  ) {
    addReason(
      reasons,
      'fidelity_mismatch',
      'Whitespace canonicalization must preserve the complete non-whitespace byte sequence',
    );
  }
  return canonical;
}

function checkSequence(
  fragments: SourceImprintFragmentInput[],
  reasons: SourceImprintRejectionReason[],
): void {
  for (let index = 0; index < fragments.length; index += 1) {
    const current = fragments[index].seq;
    const previous = fragments[index - 1]?.seq;
    if (!Number.isInteger(current) || current < 0 || (index > 0 && current !== previous + 1)) {
      addReason(reasons, 'order_violation', 'Fragment seq values must arrive ordered and contiguous');
      return;
    }
  }
}

function checkAnchorShapes(
  fragments: SourceImprintFragmentInput[],
  warnings: SourceImprintWarning[],
  reasons: SourceImprintRejectionReason[],
): void {
  for (const [index, fragment] of fragments.entries()) {
    if (!isSourceImprintAnchor(fragment.anchor)) {
      addReason(reasons, 'anchor_invalid', `Fragment ${index} has an invalid anchor shape`);
    }
  }
  for (const [index, warning] of warnings.entries()) {
    if (!isSourceImprintAnchor(warning.anchor)) {
      addReason(reasons, 'anchor_invalid', `Warning ${index} has an invalid anchor shape`);
    }
  }

  for (let index = 0; index < fragments.length; index += 1) {
    if (fragments.slice(0, index).some((candidate) => (
      isDeepStrictEqual(
        canonicalizeAnchor(candidate.anchor),
        canonicalizeAnchor(fragments[index].anchor),
      )
    ))) {
      addReason(reasons, 'anchor_invalid', 'Exact fragment anchors must be unique within one imprint');
      break;
    }
  }

  const anchorFamilies = new Set<string>();
  for (const anchor of [
    ...fragments.map((fragment) => fragment.anchor),
    ...warnings.map((warning) => warning.anchor),
  ]) {
    if (isRecord(anchor) && typeof anchor.family === 'string') {
      anchorFamilies.add(anchor.family);
    }
  }
  if (anchorFamilies.size > 1) {
    addReason(reasons, 'anchor_invalid', 'One imprint must use a single anchor family');
  }
}

function checkFidelityAndBbox(
  input: SourceImprintInput,
  warnings: SourceImprintWarning[],
  reasons: SourceImprintRejectionReason[],
): void {
  const anchors = [
    ...input.fragments.map((fragment) => fragment.anchor),
    ...warnings.map((warning) => warning.anchor),
  ];
  for (const anchor of anchors) {
    if (!isRecord(anchor) || typeof anchor.family !== 'string') continue;
    if (anchor.family === 'page') {
      if (anchor.bbox !== undefined && !isNormalizedBbox(anchor.bbox)) {
        addReason(reasons, 'anchor_invalid', 'Page bbox must be a normalized 0-1 four-tuple');
      }
      if (input.anchor_fidelity === 'page' && anchor.bbox !== undefined) {
        addReason(reasons, 'fidelity_overclaim', 'Page fidelity cannot carry a region bbox');
      }
      if (input.anchor_fidelity === 'region' && anchor.bbox === undefined) {
        addReason(reasons, 'fidelity_overclaim', 'Region fidelity requires a bbox');
      }
      if (!['region', 'block', 'page'].includes(input.anchor_fidelity)) {
        addReason(reasons, 'fidelity_overclaim', 'Declared fidelity does not belong to the page anchor family');
      }
    } else if (anchor.family === 'flow') {
      if (input.anchor_fidelity === 'char' && anchor.char === undefined) {
        addReason(reasons, 'fidelity_overclaim', 'Char fidelity requires a char interval');
      }
      if (!['char', 'element', 'section'].includes(input.anchor_fidelity)) {
        addReason(reasons, 'fidelity_overclaim', 'Declared fidelity does not belong to the flow anchor family');
      }
    } else if (anchor.family === 'table' && input.anchor_fidelity !== 'cell') {
      addReason(reasons, 'fidelity_overclaim', 'Table anchors require cell fidelity');
    }
  }
}

function flowSpan(anchor: unknown): FlowSpan | null {
  if (!isRecord(anchor) || anchor.family !== 'flow' || !isFiniteRange(anchor.char)) return null;
  return { start: anchor.char[0], end: anchor.char[1] };
}

function sortSpans(spans: FlowSpan[]): FlowSpan[] {
  return [...spans].sort((left, right) => left.start - right.start || left.end - right.end);
}

function sameSpanList(left: FlowSpan[], right: FlowSpan[]): boolean {
  return left.length === right.length
    && left.every((span, index) => (
      span.start === right[index].start && span.end === right[index].end
    ));
}

function mergeSpanCoverage(spans: FlowSpan[]): FlowSpan[] {
  const merged: FlowSpan[] = [];
  for (const span of sortSpans(spans)) {
    const previous = merged.at(-1);
    if (!previous || span.start > previous.end) {
      merged.push({ ...span });
    } else {
      previous.end = Math.max(previous.end, span.end);
    }
  }
  return merged;
}

function complementOfFragmentSpans(sourceLength: number, spans: FlowSpan[]): FlowSpan[] {
  const gaps: FlowSpan[] = [];
  let cursor = 0;
  for (const span of sortSpans(spans)) {
    if (span.start > cursor) gaps.push({ start: cursor, end: span.start });
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < sourceLength) gaps.push({ start: cursor, end: sourceLength });
  return gaps;
}

function sourceWithoutWarnings(source: string, warningSpans: FlowSpan[]): string {
  const parts: string[] = [];
  let cursor = 0;
  for (const span of sortSpans(warningSpans)) {
    if (span.start > cursor) parts.push(source.slice(cursor, span.start));
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < source.length) parts.push(source.slice(cursor));
  return parts.join('');
}

function checkTextFidelity(
  input: SourceImprintInput,
  source: string,
  warningSpans: FlowSpan[],
  reasons: SourceImprintRejectionReason[],
): void {
  const delivered = [...input.fragments]
    .sort((left, right) => left.seq - right.seq)
    .map((fragment) => fragment.text)
    .join('');
  const reference = sourceWithoutWarnings(source, warningSpans);
  if (!byteEqual(
    canonicalizeValidatedText(delivered, input.text_normalization, reasons),
    canonicalizeValidatedText(reference, input.text_normalization, reasons),
  )) {
    addReason(
      reasons,
      'fidelity_mismatch',
      'Delivered text does not match the declared-normalized source text',
    );
  }
}

function checkUnreportedMissingIntervals(
  sourceLength: number,
  fragmentSpans: FlowSpan[],
  warningSpans: FlowSpan[],
  reasons: SourceImprintRejectionReason[],
): void {
  const gaps = complementOfFragmentSpans(sourceLength, fragmentSpans);
  if (!sameSpanList(mergeSpanCoverage(gaps), mergeSpanCoverage(warningSpans))) {
    addReason(
      reasons,
      'fidelity_mismatch',
      'Every unreported source interval must have one exact warning anchor',
    );
  }
}

function checkPartitionInvariant(
  sourceLength: number,
  fragmentSpans: FlowSpan[],
  warningSpans: FlowSpan[],
  reasons: SourceImprintRejectionReason[],
): void {
  let cursor = 0;
  for (const span of sortSpans([...fragmentSpans, ...warningSpans])) {
    if (span.start !== cursor) {
      addReason(
        reasons,
        'anchor_invalid',
        'Fragment and declared-gap anchors must partition the complete source without overlap or omission',
      );
      return;
    }
    cursor = span.end;
  }
  if (cursor !== sourceLength) {
    addReason(
      reasons,
      'anchor_invalid',
      'Fragment and declared-gap anchors must partition the complete source without overlap or omission',
    );
  }
}

function checkFlowReadingOrder(
  fragmentSpans: FlowSpan[],
  reasons: SourceImprintRejectionReason[],
): void {
  for (let index = 1; index < fragmentSpans.length; index += 1) {
    if (fragmentSpans[index].start < fragmentSpans[index - 1].end) {
      addReason(
        reasons,
        'order_violation',
        'Fragment seq order must follow the original source interval order',
      );
      return;
    }
  }
}

function checkAnchorTruth(
  input: SourceImprintInput,
  source: string,
  reasons: SourceImprintRejectionReason[],
): void {
  for (const fragment of input.fragments) {
    const span = flowSpan(fragment.anchor);
    if (!span) continue;
    const sourceSlice = canonicalizeValidatedText(
      source.slice(span.start, span.end),
      input.text_normalization,
      reasons,
    );
    const fragmentText = canonicalizeValidatedText(
      fragment.text,
      input.text_normalization,
      reasons,
    );
    if (!sourceSlice.includes(fragmentText)) {
      addReason(
        reasons,
        'anchor_invalid',
        `Anchor for fragment seq ${fragment.seq} does not contain fragment text`,
      );
    }
  }
}

function checkWarningDeclarations(
  fragments: SourceImprintFragmentInput[],
  reasons: SourceImprintRejectionReason[],
): void {
  if (fragments.some((fragment) => fragment.text.length === 0)) {
    addReason(
      reasons,
      'fidelity_mismatch',
      'Missing source text must use a warning anchor, not an empty fragment',
    );
  }
}

export function validateSourceImprint(
  input: SourceImprintInput,
  originalText: string | null,
): { accepted: boolean; reasons: SourceImprintRejectionReason[] } {
  assertInputContract(input);
  const warnings = input.warnings || [];
  const reasons: SourceImprintRejectionReason[] = [];

  checkSequence(input.fragments, reasons);
  checkAnchorShapes(input.fragments, warnings, reasons);
  checkFidelityAndBbox(input, warnings, reasons);
  checkWarningDeclarations(input.fragments, reasons);

  const allAnchors = [
    ...input.fragments.map((fragment) => fragment.anchor),
    ...warnings.map((warning) => warning.anchor),
  ];
  const usesFlowCharContract = input.anchor_fidelity === 'char'
    && allAnchors.every((anchor) => flowSpan(anchor) !== null);

  if (usesFlowCharContract) {
    if (originalText === null) {
      addReason(reasons, 'anchor_invalid', 'Flow char validation requires the original source text');
    } else {
      const fragmentSpans = input.fragments.map((fragment) => flowSpan(fragment.anchor) as FlowSpan);
      const warningSpans = warnings.map((warning) => flowSpan(warning.anchor) as FlowSpan);
      const allSpansWithinSource = [...fragmentSpans, ...warningSpans]
        .every((span) => span.end <= originalText.length);
      if (!allSpansWithinSource) {
        addReason(reasons, 'anchor_invalid', 'Flow char interval escapes the original source text');
      } else {
        checkFlowReadingOrder(fragmentSpans, reasons);
        checkTextFidelity(input, originalText, warningSpans, reasons);
        checkUnreportedMissingIntervals(originalText.length, fragmentSpans, warningSpans, reasons);
        checkPartitionInvariant(originalText.length, fragmentSpans, warningSpans, reasons);
        checkAnchorTruth(input, originalText, reasons);
      }
    }
  }

  return { accepted: reasons.length === 0, reasons };
}

function ownedSourceFile(
  db: Database.Database,
  userId: string,
  sourceFileId: string,
): OwnedSourceFileRow {
  const row = db.prepare(`
    SELECT id, storage_key, storage_state
    FROM source_files
    WHERE id = ? AND user_id = ?
  `).get(sourceFileId, userId) as OwnedSourceFileRow | undefined;
  if (!row) throw new AppError(404, 'Source file not found');
  if (row.storage_state !== 'ready') {
    throw new AppError(409, 'Source file is not ready for imprint validation');
  }
  return row;
}

function originalTextForFlowValidation(
  sourceFile: OwnedSourceFileRow,
  input: SourceImprintInput,
  options: SourceImprintStorageOptions,
): string | null {
  const anchors = [
    ...input.fragments.map((fragment) => fragment.anchor),
    ...(input.warnings || []).map((warning) => warning.anchor),
  ];
  if (
    input.anchor_fidelity !== 'char'
    || !anchors.every((anchor) => flowSpan(anchor) !== null)
  ) {
    return null;
  }
  const filePath = resolveSourceStorageKey(sourceFile.storage_key, options.rootDir);
  let bytes: Buffer;
  try {
    bytes = readFileSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AppError(409, 'Source blob is missing', { code: 'source_blob_missing' });
    }
    throw error;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new AppError(422, 'Flow char validation requires a UTF-8 text Source');
  }
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function hydrateImprint(row: SourceImprintRow) {
  const { warnings_json: warningsJson, rejection_reasons_json: rejectionReasonsJson, ...rest } = row;
  return {
    ...rest,
    warnings: parseJson<SourceImprintWarning[]>(warningsJson),
    rejection_reasons: parseJson<SourceImprintRejectionReason[]>(rejectionReasonsJson),
  };
}

function hydrateFragment(row: ImprintFragmentRow) {
  const { anchor_json: anchorJson, style_json: styleJson, ...rest } = row;
  return {
    ...rest,
    anchor: parseJson<SourceImprintAnchor>(anchorJson),
    style: styleJson === null ? null : parseJson<Record<string, unknown>>(styleJson),
  };
}

export function getSourceImprint(
  db: Database.Database,
  userId: string,
  imprintId: string,
) {
  const row = db.prepare(`
    SELECT *
    FROM source_imprints
    WHERE id = ? AND user_id = ?
  `).get(imprintId, userId) as SourceImprintRow | undefined;
  if (!row) throw new AppError(404, 'Source imprint not found');
  const fragments = db.prepare(`
    SELECT *
    FROM imprint_fragments
    WHERE imprint_id = ?
    ORDER BY seq ASC
  `).all(imprintId) as ImprintFragmentRow[];
  return {
    imprint: hydrateImprint(row),
    fragments: fragments.map(hydrateFragment),
  };
}

export function storeSourceImprint(
  db: Database.Database,
  userId: string,
  input: SourceImprintInput,
  options: SourceImprintStorageOptions = {},
) {
  assertInputContract(input);
  const sourceFile = ownedSourceFile(db, userId, input.source_file_id);
  const originalText = originalTextForFlowValidation(sourceFile, input, options);
  const validation = validateSourceImprint(input, originalText);
  const imprintId = uuidv4();
  const createdAt = (options.now || new Date()).toISOString();
  const status = validation.accepted ? 'accepted' : 'rejected';
  const warnings = (input.warnings || []).map(canonicalizeWarning);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO source_imprints (
        id, user_id, source_file_id, transcriber_name, transcriber_version,
        transcriber_lockfile, transcriber_lockfile_hash, anchor_fidelity,
        text_normalization, fragment_count, warnings_json, status,
        rejection_reasons_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      imprintId,
      userId,
      sourceFile.id,
      requiredText(input.transcriber.name, 'transcriber.name'),
      requiredText(input.transcriber.version, 'transcriber.version'),
      requiredText(input.transcriber.lockfile, 'transcriber.lockfile'),
      requiredSha256(input.transcriber.lockfile_hash, 'transcriber.lockfile_hash'),
      input.anchor_fidelity,
      input.text_normalization,
      input.fragments.length,
      JSON.stringify(warnings),
      status,
      JSON.stringify(validation.reasons),
      createdAt,
    );

    if (status === 'accepted') {
      const insertFragment = db.prepare(`
        INSERT INTO imprint_fragments (
          id, imprint_id, seq, text, role, anchor_json, style_json, lang, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const fragment of input.fragments) {
        insertFragment.run(
          uuidv4(),
          imprintId,
          fragment.seq,
          fragment.text,
          fragment.role,
          JSON.stringify(canonicalizeAnchor(fragment.anchor)),
          fragment.style === undefined || fragment.style === null
            ? null
            : JSON.stringify(fragment.style),
          fragment.lang ?? null,
          createdAt,
        );
      }
    }
  })();

  return getSourceImprint(db, userId, imprintId);
}

function matchesLocator(anchor: SourceImprintAnchor, selector: Extract<SourceImprintAnchorQuery, { match: 'locator' }>['selector']): boolean {
  if (anchor.family !== selector.family) return false;
  if (anchor.family === 'page' && selector.family === 'page') return anchor.page === selector.page;
  if (anchor.family === 'flow' && selector.family === 'flow') return anchor.path === selector.path;
  if (anchor.family === 'table' && selector.family === 'table') return anchor.sheet === selector.sheet;
  if (anchor.family === 'slide' && selector.family === 'slide') return anchor.slide === selector.slide;
  if (anchor.family === 'time' && selector.family === 'time') return isDeepStrictEqual(anchor.ms, selector.ms);
  return false;
}

export function getImprintFragmentsByAnchor(
  db: Database.Database,
  userId: string,
  imprintId: string,
  query: SourceImprintAnchorQuery,
) {
  const { fragments } = getSourceImprint(db, userId, imprintId);
  if (query.match === 'exact') {
    const canonicalQuery = canonicalizeAnchor(query.anchor);
    return fragments.filter((fragment) => (
      isDeepStrictEqual(canonicalizeAnchor(fragment.anchor), canonicalQuery)
    ));
  }
  return fragments.filter((fragment) => matchesLocator(fragment.anchor, query.selector));
}
