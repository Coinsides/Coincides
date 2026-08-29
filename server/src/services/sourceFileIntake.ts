import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  createSourceIdentityFloor,
  ensureSourceProjectPlacement,
  findSourceRecordByContentHash,
} from './sourceRecords.js';
import { isSourceArtifactErrorRetryable } from './sourceMaterializationErrors.js';
import {
  expandZipSourceContainer,
  type SourceContainerExpansionReport,
} from './sourceContainerIntake.js';
import { ensureHomeCourse } from './systemCourses.js';

export const SOURCE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const SOURCE_STAGING_MAX_AGE_MS = 60 * 60 * 1000;

export type SourceFormat =
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'md'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'zip'
  | 'binary';
export type SourceCapability = 'materializable' | 'stored_only';
export type SourceOriginEntryKind = 'project_upload' | 'library_upload' | 'import';

export const SOURCE_INTAKE_DECLARATION_CODES = [
  'unknown_extension',
  'signature_mismatch',
  'non_utf8_text',
  'nul_bytes',
  'binary_unparsed',
  'container_expansion_incomplete',
] as const;
export type SourceIntakeDeclarationCode = typeof SOURCE_INTAKE_DECLARATION_CODES[number];

interface SourceFormatDefinition {
  format: SourceFormat;
  extensions: string[];
  mimeTypes: string[];
  capability: SourceCapability;
  signature: 'pdf' | 'zip' | 'png' | 'jpeg' | 'webp' | 'text' | 'binary';
  parserKey: string;
  parserVersion: string;
}

const SOURCE_FORMATS: SourceFormatDefinition[] = [
  {
    format: 'pdf',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    capability: 'materializable',
    signature: 'pdf',
    parserKey: 'native-pdf',
    parserVersion: '2.4.5',
  },
  {
    format: 'docx',
    extensions: ['.docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    capability: 'materializable',
    signature: 'zip',
    parserKey: 'native-docx',
    parserVersion: '1.12.0',
  },
  {
    format: 'txt',
    extensions: ['.txt'],
    mimeTypes: ['text/plain'],
    capability: 'materializable',
    signature: 'text',
    parserKey: 'native-text',
    parserVersion: 'utf8-v1',
  },
  {
    format: 'md',
    extensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/plain'],
    capability: 'materializable',
    signature: 'text',
    parserKey: 'native-text',
    parserVersion: 'utf8-v1',
  },
  {
    format: 'png',
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    capability: 'materializable',
    signature: 'png',
    parserKey: 'native-image',
    parserVersion: 'passthrough-v1',
  },
  {
    format: 'jpeg',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg'],
    capability: 'materializable',
    signature: 'jpeg',
    parserKey: 'native-image',
    parserVersion: 'passthrough-v1',
  },
  {
    format: 'webp',
    extensions: ['.webp'],
    mimeTypes: ['image/webp'],
    capability: 'materializable',
    signature: 'webp',
    parserKey: 'native-image',
    parserVersion: 'passthrough-v1',
  },
  {
    format: 'pptx',
    extensions: ['.pptx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    capability: 'stored_only',
    signature: 'zip',
    parserKey: 'stored-only',
    parserVersion: 'none',
  },
  {
    format: 'xlsx',
    extensions: ['.xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    capability: 'stored_only',
    signature: 'zip',
    parserKey: 'stored-only',
    parserVersion: 'none',
  },
  {
    format: 'csv',
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
    capability: 'stored_only',
    signature: 'text',
    parserKey: 'stored-only',
    parserVersion: 'none',
  },
  {
    format: 'zip',
    extensions: ['.zip'],
    mimeTypes: ['application/zip', 'application/x-zip-compressed'],
    capability: 'stored_only',
    signature: 'zip',
    parserKey: 'stored-only',
    parserVersion: 'none',
  },
];

const BINARY_FALLBACK_DEFINITION: SourceFormatDefinition = {
  format: 'binary',
  extensions: [],
  mimeTypes: ['application/octet-stream'],
  capability: 'stored_only',
  signature: 'binary',
  parserKey: 'stored-only',
  parserVersion: 'none',
};

const TEXT_FALLBACK_DEFINITION = SOURCE_FORMATS.find((definition) => definition.format === 'txt')!;

export interface SourceTempFileInput {
  path: string;
  originalname: string;
  mimetype: string;
  size?: number;
}

export interface SourceFileIntakeInput {
  course_id?: string;
  origin_entry_kind?: SourceOriginEntryKind;
  file: SourceTempFileInput;
  file_mtime?: string | null;
}

export interface SourceStorageOptions {
  rootDir?: string;
  now?: Date;
  renameFile?: (from: string, to: string) => void;
  afterIdentityStaged?: (sourceRecordId: string) => void;
  beforeReadyFlip?: (sourceRecordId: string) => void;
  expandContainers?: boolean;
  onContainerExpansion?: (report: SourceContainerExpansionReport) => void;
}

interface SourceInternalRow {
  id: string;
  user_id: string;
  display_name: string;
  origin_course_id: string | null;
  origin_course_name_snapshot: string | null;
  origin_entry_kind: SourceOriginEntryKind;
  metadata: string;
  created_at: string;
  updated_at: string;
  source_file_id: string;
  original_filename: string;
  storage_key: string;
  storage_state: 'staging' | 'ready';
  mime_type: string;
  byte_size: number;
  content_hash: string;
  file_mtime: string | null;
  uploaded_at: string;
  materialization_id: string;
  parser_key: string;
  parser_version: string;
  materialization_status: 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed';
  attempt_count: number;
  projection_note_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  intake_declarations_json: string;
}

interface DuplicateRow {
  source_record_id: string;
  source_file_id: string;
  storage_key: string;
  storage_state: 'staging' | 'ready';
  uploaded_at: string;
}

interface InspectedSourceTempFile {
  temp_path: string;
  original_filename: string;
  extension: string;
  mime_type: string;
  byte_size: number;
  content_hash: string;
  format: SourceFormat;
  capability: SourceCapability;
  parser_key: string;
  parser_version: string;
  intake_declarations: SourceIntakeDeclarationCode[];
  fallback_text: string | null;
}

function sourceError(
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): AppError {
  return new AppError(statusCode, message, { code, ...details });
}

export function getSourceBlobRoot(rootDir?: string): string {
  return resolve(rootDir || process.env.SOURCE_BLOB_DIR || join(process.cwd(), 'uploads', 'source-blobs'));
}

export function getSourceTempDirectory(rootDir?: string): string {
  return join(getSourceBlobRoot(rootDir), '.tmp');
}

export function ensureSourceStorageDirectories(rootDir?: string): void {
  const root = getSourceBlobRoot(rootDir);
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, '.tmp'), { recursive: true });
}

function isWithin(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return pathFromParent === '' || (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== '..' && !isAbsolute(pathFromParent));
}

function assertTempPath(tempPath: string, rootDir?: string): string {
  const resolvedTemp = resolve(tempPath);
  const tempRoot = getSourceTempDirectory(rootDir);
  if (!isWithin(tempRoot, resolvedTemp)) {
    throw sourceError(400, 'invalid_temp_path', 'Source upload temp path is outside the managed storage root');
  }
  return resolvedTemp;
}

export function resolveSourceStorageKey(storageKey: string, rootDir?: string): string {
  const root = getSourceBlobRoot(rootDir);
  const filePath = resolve(root, storageKey);
  if (!storageKey || isAbsolute(storageKey) || !isWithin(root, filePath) || filePath === root) {
    throw sourceError(500, 'invalid_storage_key', 'Source storage key escaped the managed blob root');
  }
  return filePath;
}

function cleanFilename(filename: string, fallbackExtension = ''): string {
  const safe = basename(String(filename || '').replace(/\\/g, '/'))
    .replace(/[\u0000\r\n"]/g, '')
    .trim();
  return safe || `source${fallbackExtension}`;
}

function normalizeMimeType(mimeType: string): string {
  return String(mimeType || '').split(';', 1)[0].trim().toLowerCase();
}

function definitionForFilename(filename: string): SourceFormatDefinition {
  const extension = extname(filename).toLowerCase();
  const definition = definitionForFilenameOrNull(filename);
  if (!definition) {
    throw sourceError(400, 'unsupported_file_type', `Unsupported Source file extension: ${extension || '(none)'}`);
  }
  return definition;
}

function definitionForFilenameOrNull(filename: string): SourceFormatDefinition | null {
  const extension = extname(filename).toLowerCase();
  return SOURCE_FORMATS.find((candidate) => candidate.extensions.includes(extension)) || null;
}

function hasZipSignature(buffer: Buffer): boolean {
  return buffer.length >= 4
    && buffer[0] === 0x50
    && buffer[1] === 0x4b
    && ((buffer[2] === 0x03 && buffer[3] === 0x04)
      || (buffer[2] === 0x05 && buffer[3] === 0x06)
      || (buffer[2] === 0x07 && buffer[3] === 0x08));
}

function hasSignature(signature: SourceFormatDefinition['signature'], head: Buffer): boolean {
  if (signature === 'pdf') {
    return head.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) >= 0;
  }
  if (signature === 'zip') return hasZipSignature(head);
  if (signature === 'png') {
    return head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (signature === 'jpeg') {
    return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (signature === 'webp') {
    return head.length >= 12
      && head.subarray(0, 4).toString('ascii') === 'RIFF'
      && head.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

function definitionForDistinctMagic(head: Buffer): SourceFormatDefinition | null {
  for (const signature of ['pdf', 'png', 'jpeg', 'webp'] as const) {
    if (hasSignature(signature, head)) {
      return SOURCE_FORMATS.find((definition) => definition.signature === signature) || null;
    }
  }
  return null;
}

function assertSignature(definition: SourceFormatDefinition, head: Buffer): void {
  let valid = false;
  if (definition.signature === 'text') {
    if (head.includes(0)) {
      throw sourceError(400, 'invalid_text_encoding', 'Text Source contains NUL bytes');
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(head);
      valid = true;
    } catch {
      throw sourceError(400, 'invalid_text_encoding', 'Text Source must be valid UTF-8');
    }
  } else {
    valid = hasSignature(definition.signature, head);
  }

  if (!valid) {
    throw sourceError(400, 'invalid_file_signature', 'Source file signature does not match its extension and MIME type');
  }
}

async function hashFile(filePath: string): Promise<string> {
  return await new Promise<string>((resolveHash, rejectHash) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', rejectHash);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

export async function inspectSourceTempFile(
  file: SourceTempFileInput,
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
  mode: 'strict' | 'intake' = 'strict',
): Promise<InspectedSourceTempFile> {
  ensureSourceStorageDirectories(options.rootDir);
  const tempPath = assertTempPath(file.path, options.rootDir);
  if (!existsSync(tempPath)) {
    throw sourceError(400, 'temp_file_missing', 'Source upload temp file is missing');
  }
  const stats = statSync(tempPath);
  if (!stats.isFile()) throw sourceError(400, 'invalid_temp_file', 'Source upload temp path is not a file');
  if (stats.size === 0) throw sourceError(400, 'empty_file', 'Source file is empty');
  if (stats.size > SOURCE_UPLOAD_MAX_BYTES) {
    throw sourceError(413, 'file_too_large', 'Source file exceeds the 50MB upload limit', {
      maximum_bytes: SOURCE_UPLOAD_MAX_BYTES,
      actual_bytes: stats.size,
    });
  }

  const originalFilename = cleanFilename(file.originalname);
  const claimedDefinition = definitionForFilenameOrNull(originalFilename);
  let definition = claimedDefinition || (mode === 'intake'
    ? BINARY_FALLBACK_DEFINITION
    : definitionForFilename(originalFilename));
  let mimeType = normalizeMimeType(file.mimetype) || 'application/octet-stream';
  if (mode === 'strict' && claimedDefinition && !definition.mimeTypes.includes(mimeType)) {
    throw sourceError(400, 'mime_extension_mismatch', 'Source MIME type does not match its file extension', {
      mime_type: mimeType,
      extension: extname(originalFilename).toLowerCase(),
    });
  }

  const head = Buffer.alloc(Math.min(stats.size, 8192));
  const stream = createReadStream(tempPath, { start: 0, end: Math.max(0, head.length - 1) });
  let offset = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes.copy(head, offset);
    offset += bytes.length;
  }
  const declarationSet = new Set<SourceIntakeDeclarationCode>();
  let fallbackText: string | null = null;
  const inspectedHead = head.subarray(0, offset);
  if (mode === 'strict') {
    assertSignature(definition, inspectedHead);
  } else {
    const detectedDefinition = definitionForDistinctMagic(inspectedHead);
    if (!claimedDefinition) declarationSet.add('unknown_extension');
    if (claimedDefinition && !claimedDefinition.mimeTypes.includes(mimeType)) {
      declarationSet.add('signature_mismatch');
    }

    if (detectedDefinition) {
      if (!claimedDefinition
        || detectedDefinition.signature !== claimedDefinition.signature
        || !detectedDefinition.mimeTypes.includes(mimeType)) {
        declarationSet.add('signature_mismatch');
      }
      definition = detectedDefinition;
      if (!definition.mimeTypes.includes(mimeType)) mimeType = definition.mimeTypes[0];
    } else if (hasZipSignature(inspectedHead)) {
      if (claimedDefinition?.signature === 'zip') {
        definition = claimedDefinition;
        if (!definition.mimeTypes.includes(mimeType)) {
          declarationSet.add('signature_mismatch');
          mimeType = definition.mimeTypes[0];
        }
      } else {
        if (claimedDefinition || mimeType !== 'application/octet-stream') {
          declarationSet.add('signature_mismatch');
        }
        declarationSet.add('binary_unparsed');
        definition = BINARY_FALLBACK_DEFINITION;
        mimeType = definition.mimeTypes[0];
      }
    } else {
      const bytes = readFileSync(tempPath);
      const containsNul = bytes.includes(0);
      let decodedText: string | null = null;
      if (containsNul) {
        declarationSet.add('nul_bytes');
      } else {
        try {
          decodedText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch {
          declarationSet.add('non_utf8_text');
        }
      }

      if (decodedText !== null && (!claimedDefinition || claimedDefinition.signature === 'text')) {
        definition = claimedDefinition || TEXT_FALLBACK_DEFINITION;
        if (!definition.mimeTypes.includes(mimeType)) {
          if (claimedDefinition || mimeType !== 'application/octet-stream') {
            declarationSet.add('signature_mismatch');
          }
          mimeType = definition.mimeTypes[0];
        }
        if (!claimedDefinition) fallbackText = decodedText;
      } else {
        if (claimedDefinition && claimedDefinition.signature !== 'text') {
          declarationSet.add('signature_mismatch');
        }
        declarationSet.add('binary_unparsed');
        definition = BINARY_FALLBACK_DEFINITION;
        mimeType = definition.mimeTypes[0];
      }
    }
  }
  const declarations = SOURCE_INTAKE_DECLARATION_CODES.filter((code) => declarationSet.has(code));

  return {
    temp_path: tempPath,
    original_filename: originalFilename,
    extension: extname(originalFilename).toLowerCase(),
    mime_type: mimeType,
    byte_size: stats.size,
    content_hash: await hashFile(tempPath),
    format: definition.format,
    capability: definition.capability,
    parser_key: definition.parserKey,
    parser_version: definition.parserVersion,
    intake_declarations: declarations,
    fallback_text: fallbackText,
  };
}

function plainTextLineFragments(text: string) {
  const fragments: Array<{
    seq: number;
    text: string;
    role: 'para' | 'blank';
    anchor: { family: 'flow'; path: string; char: [number, number]; line: [number, number] };
  }> = [];
  let start = 0;
  let line = 1;

  const pushLine = (end: number) => {
    const lineText = text.slice(start, end);
    fragments.push({
      seq: fragments.length,
      text: lineText,
      role: lineText.replace(/[\r\n]+$/u, '').trim().length === 0 ? 'blank' : 'para',
      anchor: {
        family: 'flow',
        path: `body/line[${line}]`,
        char: [start, end],
        line: [line, line],
      },
    });
    start = end;
    line += 1;
  };

  for (let cursor = 0; cursor < text.length; cursor += 1) {
    if (text[cursor] === '\r' && text[cursor + 1] === '\n') {
      cursor += 1;
      pushLine(cursor + 1);
    } else if (text[cursor] === '\r' || text[cursor] === '\n') {
      pushLine(cursor + 1);
    }
  }
  if (start < text.length) pushLine(text.length);
  return fragments;
}

const TEXT_FALLBACK_TRANSCRIBER = {
  name: 'source-intake-text-fallback',
  version: '1',
  lockfile: 'server/package-lock.json',
} as const;

async function ensurePlainTextFallbackImprint(
  db: Database.Database,
  userId: string,
  sourceFileId: string,
  text: string,
  options: Pick<SourceStorageOptions, 'rootDir' | 'now'>,
): Promise<void> {
  // Resolve the cyclic dependency before the idempotency check so concurrent
  // callers cannot both observe "missing" while this import yields.
  const { storeSourceImprint } = await import('./sourceImprints.js');
  const existing = db.prepare(`
    SELECT 1
    FROM source_imprints
    WHERE source_file_id = ?
      AND user_id = ?
      AND transcriber_name = ?
      AND transcriber_version = ?
      AND transcriber_lockfile = ?
      AND status = 'accepted'
    LIMIT 1
  `).get(
    sourceFileId,
    userId,
    TEXT_FALLBACK_TRANSCRIBER.name,
    TEXT_FALLBACK_TRANSCRIBER.version,
    TEXT_FALLBACK_TRANSCRIBER.lockfile,
  );
  if (existing) return;

  const stored = storeSourceImprint(db, userId, {
    source_file_id: sourceFileId,
    transcriber: TEXT_FALLBACK_TRANSCRIBER,
    anchor_fidelity: 'char',
    text_normalization: 'none',
    fragments: plainTextLineFragments(text),
    warnings: [],
  }, options);
  if (stored.imprint.status !== 'accepted') {
    throw new Error('Source text fallback imprint was rejected by the Source imprint contract');
  }
}

function ownedCourseId(db: Database.Database, userId: string, courseId: string): string {
  const row = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId) as { id: string } | undefined;
  if (!row) throw new AppError(404, 'Project not found');
  return row.id;
}

function resolveTargetCourse(
  db: Database.Database,
  userId: string,
  input: Pick<SourceFileIntakeInput, 'course_id' | 'origin_entry_kind'>,
): { courseId: string; originEntryKind: SourceOriginEntryKind } {
  const originEntryKind = input.origin_entry_kind || 'project_upload';
  if (originEntryKind === 'library_upload') {
    return { courseId: ensureHomeCourse(db, userId).id, originEntryKind };
  }
  if (!input.course_id) throw sourceError(400, 'project_required', 'course_id is required for this Source intake');
  return { courseId: ownedCourseId(db, userId, input.course_id), originEntryKind };
}

function allocateDisplayName(db: Database.Database, userId: string, filename: string): string {
  const extension = extname(filename);
  const stem = extension ? filename.slice(0, -extension.length) : filename;
  let candidate = filename;
  let suffix = 1;
  while (db.prepare(`
    SELECT 1 FROM source_records
    WHERE user_id = ? AND display_name = ? COLLATE NOCASE
  `).get(userId, candidate)) {
    candidate = `${stem} (${suffix})${extension}`;
    suffix += 1;
  }
  return candidate;
}

function getInternalSourceRow(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): SourceInternalRow {
  const row = db.prepare(`
    SELECT
      sr.*,
      sf.id AS source_file_id,
      sf.original_filename,
      sf.storage_key,
      sf.storage_state,
      sf.mime_type,
      sf.byte_size,
      sf.content_hash,
      sf.file_mtime,
      sf.uploaded_at,
      sf.intake_declarations_json,
      sm.id AS materialization_id,
      sm.parser_key,
      sm.parser_version,
      sm.status AS materialization_status,
      sm.attempt_count,
      sm.projection_note_id,
      sm.error_code,
      sm.error_message,
      sm.started_at,
      sm.completed_at
    FROM source_records sr
    JOIN source_files sf ON sf.source_record_id = sr.id AND sf.user_id = sr.user_id
    JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    WHERE sr.id = ? AND sr.user_id = ?
  `).get(sourceRecordId, userId) as SourceInternalRow | undefined;
  if (!row) throw new AppError(404, 'Source not found');
  return row;
}

function definitionForStoredRow(
  row: Pick<SourceInternalRow, 'original_filename' | 'mime_type' | 'parser_key'>,
): SourceFormatDefinition {
  const claimed = definitionForFilenameOrNull(row.original_filename);
  if (claimed && claimed.mimeTypes.includes(row.mime_type) && claimed.parserKey === row.parser_key) {
    return claimed;
  }
  return SOURCE_FORMATS.find((definition) => (
    definition.mimeTypes.includes(row.mime_type) && definition.parserKey === row.parser_key
  )) || BINARY_FALLBACK_DEFINITION;
}

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseIntakeDeclarations(value: string): SourceIntakeDeclarationCode[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const declarations = new Set(parsed.filter((entry) => typeof entry === 'string'));
    return SOURCE_INTAKE_DECLARATION_CODES.filter((code) => declarations.has(code));
  } catch {
    return [];
  }
}

export function getSourceRecordDetail(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
) {
  const row = getInternalSourceRow(db, userId, sourceRecordId);
  const definition = definitionForStoredRow(row);
  const blobPath = resolveSourceStorageKey(row.storage_key, options.rootDir);
  const blobAvailable = row.storage_state === 'ready' && existsSync(blobPath);
  const projectionAvailable = Boolean(row.projection_note_id && db.prepare(`
    SELECT 1
    FROM notes
    WHERE id = ? AND user_id = ? AND note_class = 'source_projection'
  `).get(row.projection_note_id, userId));
  const placements = db.prepare(`
    SELECT spp.id, spp.course_id, c.name AS course_name, spp.created_at
    FROM source_project_placements spp
    JOIN courses c ON c.id = spp.course_id AND c.user_id = spp.user_id
    WHERE spp.source_record_id = ? AND spp.user_id = ?
    ORDER BY spp.created_at ASC, spp.id ASC
  `).all(sourceRecordId, userId) as Array<{
    id: string;
    course_id: string;
    course_name: string;
    created_at: string;
  }>;

  return {
    id: row.id,
    display_name: row.display_name,
    origin: {
      course_id: row.origin_course_id,
      course_name_snapshot: row.origin_course_name_snapshot,
      entry_kind: row.origin_entry_kind,
    },
    metadata: parseMetadata(row.metadata),
    file: {
      id: row.source_file_id,
      original_filename: row.original_filename,
      mime_type: row.mime_type,
      byte_size: Number(row.byte_size),
      content_hash: row.content_hash,
      file_mtime: row.file_mtime,
      uploaded_at: row.uploaded_at,
      storage_state: row.storage_state,
      format: definition.format,
      capability: definition.capability,
      intake_declarations: parseIntakeDeclarations(row.intake_declarations_json),
      blob_available: blobAvailable,
      blob_url: `/api/sources/${row.id}/blob`,
      issue: row.storage_state === 'ready' && !blobAvailable
        ? { code: 'blob_missing', message: 'The Source record exists but its original blob is missing.' }
        : null,
    },
    materialization: {
      id: row.materialization_id,
      parser_key: row.parser_key,
      parser_version: row.parser_version,
      status: row.materialization_status,
      attempt_count: Number(row.attempt_count),
      projection_note_id: row.projection_note_id,
      projection_available: projectionAvailable,
      error_code: row.error_code,
      error_message: row.error_message,
      retryable: row.materialization_status === 'failed'
        && isSourceArtifactErrorRetryable(row.error_code),
      started_at: row.started_at,
      completed_at: row.completed_at,
    },
    placements,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface SourceFileIntakeResult {
  created: boolean;
  deduplicated: boolean;
  source: ReturnType<typeof getSourceRecordDetail>;
}

function setSourceFileIntakeDeclaration(
  db: Database.Database,
  userId: string,
  sourceFileId: string,
  code: SourceIntakeDeclarationCode,
  present: boolean,
): void {
  const row = db.prepare(`
    SELECT intake_declarations_json
    FROM source_files
    WHERE id = ? AND user_id = ?
  `).get(sourceFileId, userId) as { intake_declarations_json: string } | undefined;
  if (!row) throw new Error('Source intake declaration target was not found');

  const declarations = new Set(parseIntakeDeclarations(row.intake_declarations_json));
  if (declarations.has(code) === present) return;
  if (present) declarations.add(code);
  else declarations.delete(code);
  const next = SOURCE_INTAKE_DECLARATION_CODES.filter((candidate) => declarations.has(candidate));
  const updated = db.prepare(`
    UPDATE source_files
    SET intake_declarations_json = ?
    WHERE id = ? AND user_id = ?
  `).run(JSON.stringify(next), sourceFileId, userId);
  if (updated.changes !== 1) {
    throw new Error('Source intake declaration did not update exactly one row');
  }
}

async function expandStoredZipContainer(
  db: Database.Database,
  userId: string,
  target: { courseId: string; originEntryKind: SourceOriginEntryKind },
  stored: SourceFileIntakeResult,
  options: SourceStorageOptions,
): Promise<SourceFileIntakeResult> {
  const containerRow = getInternalSourceRow(db, userId, stored.source.id);
  const report = await expandZipSourceContainer({
    zipPath: resolveSourceStorageKey(containerRow.storage_key, options.rootDir),
    tempDirectory: getSourceTempDirectory(options.rootDir),
    maximumEntryBytes: SOURCE_UPLOAD_MAX_BYTES,
    intakeEntry: async (entry) => {
      const definition = definitionForFilenameOrNull(entry.original_filename);
      const child = await intakeSourceTempFile(db, userId, {
        course_id: target.courseId,
        origin_entry_kind: target.originEntryKind,
        file: {
          path: entry.path,
          originalname: entry.original_filename,
          mimetype: definition?.mimeTypes[0] || 'application/octet-stream',
        },
      }, {
        rootDir: options.rootDir,
        now: options.now,
        expandContainers: false,
      });
      return {
        source_record_id: child.source.id,
        source_file_id: child.source.file.id,
        content_hash: child.source.file.content_hash,
      };
    },
  });

  setSourceFileIntakeDeclaration(
    db,
    userId,
    stored.source.file.id,
    'container_expansion_incomplete',
    report.incomplete,
  );
  try {
    options.onContainerExpansion?.(report);
  } catch (error) {
    console.warn('Source container expansion observer failed', { error });
  }
  return {
    ...stored,
    source: getSourceRecordDetail(db, userId, stored.source.id, options),
  };
}

function storedSourceIsZipContainer(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): boolean {
  const row = getInternalSourceRow(db, userId, sourceRecordId);
  return extname(row.original_filename).toLowerCase() === '.zip'
    || definitionForStoredRow(row).format === 'zip';
}

async function finishStoredSourceIntake(
  db: Database.Database,
  userId: string,
  target: { courseId: string; originEntryKind: SourceOriginEntryKind },
  inspected: InspectedSourceTempFile,
  stored: SourceFileIntakeResult,
  options: SourceStorageOptions,
): Promise<SourceFileIntakeResult> {
  const isZipContainer = inspected.extension === '.zip'
    || stored.source.file.format === 'zip'
    || extname(stored.source.file.original_filename).toLowerCase() === '.zip';
  if (options.expandContainers === false || !isZipContainer) return stored;
  setSourceFileIntakeDeclaration(
    db,
    userId,
    stored.source.file.id,
    'container_expansion_incomplete',
    true,
  );
  return expandStoredZipContainer(db, userId, target, stored, options);
}

export function listSourceRecords(
  db: Database.Database,
  userId: string,
  filter: { course_id?: string } = {},
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
) {
  if (filter.course_id) ownedCourseId(db, userId, filter.course_id);
  const rows = filter.course_id
    ? db.prepare(`
        SELECT sr.id
        FROM source_records sr
        JOIN source_project_placements spp
          ON spp.source_record_id = sr.id AND spp.user_id = sr.user_id
        WHERE sr.user_id = ? AND spp.course_id = ?
        ORDER BY sr.created_at DESC, sr.id DESC
      `).all(userId, filter.course_id) as Array<{ id: string }>
    : db.prepare(`
        SELECT id FROM source_records
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
      `).all(userId) as Array<{ id: string }>;
  return rows.map((row) => getSourceRecordDetail(db, userId, row.id, options));
}

export function getSourceBlob(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
) {
  const row = getInternalSourceRow(db, userId, sourceRecordId);
  if (row.storage_state !== 'ready') {
    throw sourceError(409, 'blob_not_ready', 'Source original is not ready yet');
  }
  const filePath = resolveSourceStorageKey(row.storage_key, options.rootDir);
  if (!existsSync(filePath)) {
    throw sourceError(404, 'blob_missing', 'Source original blob is missing');
  }
  return {
    stream: createReadStream(filePath),
    mime_type: row.mime_type,
    filename: row.original_filename,
    byte_size: Number(row.byte_size),
  };
}

export interface SourceMaterializationFile {
  source_record_id: string;
  source_file_id: string;
  materialization_id: string;
  user_id: string;
  course_id: string;
  display_name: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  content_hash: string;
  parser_key: string;
  parser_version: string;
  storage_key: string;
  file_path: string;
}

export function getSourceMaterializationFile(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
): SourceMaterializationFile {
  const row = getInternalSourceRow(db, userId, sourceRecordId);
  if (row.storage_state !== 'ready') {
    throw sourceError(409, 'blob_not_ready', 'Source original is not ready for materialization');
  }
  const filePath = resolveSourceStorageKey(row.storage_key, options.rootDir);
  if (!existsSync(filePath)) {
    throw sourceError(404, 'blob_missing', 'Source original blob is missing');
  }
  const placement = db.prepare(`
    SELECT spp.course_id
    FROM source_project_placements spp
    JOIN courses c ON c.id = spp.course_id AND c.user_id = spp.user_id
    WHERE spp.source_record_id = ? AND spp.user_id = ?
    ORDER BY spp.created_at ASC, spp.id ASC
    LIMIT 1
  `).get(sourceRecordId, userId) as { course_id: string } | undefined;
  if (!placement) {
    throw sourceError(409, 'source_without_placement', 'Source has no Project placement for its projection');
  }
  return {
    source_record_id: row.id,
    source_file_id: row.source_file_id,
    materialization_id: row.materialization_id,
    user_id: row.user_id,
    course_id: placement.course_id,
    display_name: row.display_name,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    byte_size: Number(row.byte_size),
    content_hash: row.content_hash,
    parser_key: row.parser_key,
    parser_version: row.parser_version,
    storage_key: row.storage_key,
    file_path: filePath,
  };
}

function discardFile(path: string | null | undefined): void {
  if (!path) return;
  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Failed to remove Source temp file', { path, error });
    }
  }
}

export function discardSourceTempFile(path: string | null | undefined, rootDir?: string): void {
  if (!path) return;
  const managedPath = assertTempPath(path, rootDir);
  discardFile(managedPath);
}

function duplicateRowByHash(db: Database.Database, userId: string, hash: string): DuplicateRow | null {
  return (db.prepare(`
    SELECT
      sr.id AS source_record_id,
      sf.id AS source_file_id,
      sf.storage_key,
      sf.storage_state,
      sf.uploaded_at
    FROM source_files sf
    JOIN source_records sr ON sr.id = sf.source_record_id AND sr.user_id = sf.user_id
    WHERE sf.user_id = ? AND sf.content_hash = ?
  `).get(userId, hash) as DuplicateRow | undefined) || null;
}

function isOlderThan(timestamp: string, thresholdMs: number, now: Date): boolean {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) && now.getTime() - parsed > thresholdMs;
}

function finalizeDuplicate(
  db: Database.Database,
  userId: string,
  courseId: string,
  duplicate: DuplicateRow,
  inspected: InspectedSourceTempFile,
  options: SourceStorageOptions,
) {
  const finalPath = resolveSourceStorageKey(duplicate.storage_key, options.rootDir);
  const now = options.now || new Date();
  if (duplicate.storage_state === 'staging') {
    if (existsSync(finalPath)) {
      db.prepare(`
        UPDATE source_files SET storage_state = 'ready'
        WHERE id = ? AND user_id = ? AND storage_state = 'staging'
      `).run(duplicate.source_file_id, userId);
    } else if (isOlderThan(duplicate.uploaded_at, SOURCE_STAGING_MAX_AGE_MS, now)) {
      db.prepare('DELETE FROM source_records WHERE id = ? AND user_id = ?')
        .run(duplicate.source_record_id, userId);
      return null;
    } else {
      discardFile(inspected.temp_path);
      throw sourceError(409, 'upload_in_progress', 'An upload with the same content hash is still being committed', {
        source_record_id: duplicate.source_record_id,
      });
    }
  } else if (!existsSync(finalPath)) {
    mkdirSync(dirname(finalPath), { recursive: true });
    try {
      (options.renameFile || renameSync)(inspected.temp_path, finalPath);
    } catch {
      discardFile(inspected.temp_path);
      throw sourceError(500, 'blob_repair_failed', 'The existing Source blob is missing and could not be repaired');
    }
  }

  try {
    ensureSourceProjectPlacement(db, userId, duplicate.source_record_id, courseId);
    return {
      created: false,
      deduplicated: true,
      source: getSourceRecordDetail(db, userId, duplicate.source_record_id, options),
    };
  } finally {
    discardFile(inspected.temp_path);
  }
}

export async function intakeSourceTempFile(
  db: Database.Database,
  userId: string,
  input: SourceFileIntakeInput,
  options: SourceStorageOptions = {},
): Promise<SourceFileIntakeResult> {
  let inspected: InspectedSourceTempFile;
  try {
    inspected = await inspectSourceTempFile(input.file, options, 'intake');
  } catch (error) {
    try {
      discardSourceTempFile(input.file.path, options.rootDir);
    } catch {
      // A rejected unmanaged path must not be unlinked by this service.
    }
    throw error;
  }
  if (inspected.extension === '.zip') {
    const declarations = new Set(inspected.intake_declarations);
    declarations.add('container_expansion_incomplete');
    inspected.intake_declarations = SOURCE_INTAKE_DECLARATION_CODES
      .filter((code) => declarations.has(code));
  }

  let target: ReturnType<typeof resolveTargetCourse>;
  try {
    target = resolveTargetCourse(db, userId, input);
  } catch (error) {
    discardFile(inspected.temp_path);
    throw error;
  }

  const existing = duplicateRowByHash(db, userId, inspected.content_hash);
  if (existing) {
    const expandsExistingZip = options.expandContainers !== false
      && (inspected.extension === '.zip'
        || storedSourceIsZipContainer(db, userId, existing.source_record_id));
    if (expandsExistingZip) {
      setSourceFileIntakeDeclaration(
        db,
        userId,
        existing.source_file_id,
        'container_expansion_incomplete',
        true,
      );
    }
    const duplicateResult = finalizeDuplicate(db, userId, target.courseId, existing, inspected, options);
    if (duplicateResult) {
      if (inspected.fallback_text !== null) {
        await ensurePlainTextFallbackImprint(
          db,
          userId,
          duplicateResult.source.file.id,
          inspected.fallback_text,
          options,
        );
      }
      return finishStoredSourceIntake(db, userId, target, inspected, duplicateResult, options);
    }
  }

  const sourceFileId = uuidv4();
  const storageExtension = definitionForFilenameOrNull(inspected.original_filename)
    ? inspected.extension
    : '';
  const storageKey = `${userId}/${sourceFileId}${storageExtension}`;
  const finalPath = resolveSourceStorageKey(storageKey, options.rootDir);
  mkdirSync(dirname(finalPath), { recursive: true });

  let sourceRecordId: string | null = null;
  let renameAttempted = false;
  let renamed = false;
  let storedResult: SourceFileIntakeResult | null = null;
  try {
    const stageIdentity = () => db.transaction(() => {
      const created = createSourceIdentityFloor(db, userId, {
        course_id: target.courseId,
        display_name: allocateDisplayName(db, userId, inspected.original_filename),
        origin_entry_kind: target.originEntryKind,
        file: {
          id: sourceFileId,
          original_filename: inspected.original_filename,
          storage_key: storageKey,
          storage_state: 'staging',
          mime_type: inspected.mime_type,
          byte_size: inspected.byte_size,
          content_hash: inspected.content_hash,
          file_mtime: input.file_mtime || null,
        },
        materialization: {
          parser_key: inspected.parser_key,
          parser_version: inspected.parser_version,
        },
      });
      const declarations = db.prepare(`
        UPDATE source_files
        SET intake_declarations_json = ?
        WHERE id = ? AND user_id = ?
      `).run(JSON.stringify(inspected.intake_declarations), sourceFileId, userId);
      if (declarations.changes !== 1) {
        throw new Error('Source intake declarations did not update exactly one row');
      }
      return created;
    })();

    let created: ReturnType<typeof stageIdentity> | null = null;
    try {
      created = stageIdentity();
    } catch (error) {
      const raced = duplicateRowByHash(db, userId, inspected.content_hash);
      if (raced) {
        const expandsRacedZip = options.expandContainers !== false
          && (inspected.extension === '.zip'
            || storedSourceIsZipContainer(db, userId, raced.source_record_id));
        if (expandsRacedZip) {
          setSourceFileIntakeDeclaration(
            db,
            userId,
            raced.source_file_id,
            'container_expansion_incomplete',
            true,
          );
        }
        const duplicateResult = finalizeDuplicate(db, userId, target.courseId, raced, inspected, options);
        if (duplicateResult) storedResult = duplicateResult;
        else created = stageIdentity();
      } else {
        throw error;
      }
    }

    if (!storedResult) {
      if (!created) throw new Error('Source identity staging returned no result');
      sourceRecordId = created.source_record.id;
      options.afterIdentityStaged?.(sourceRecordId);
      renameAttempted = true;
      (options.renameFile || renameSync)(inspected.temp_path, finalPath);
      renamed = true;
      options.beforeReadyFlip?.(sourceRecordId);
      const ready = db.prepare(`
        UPDATE source_files
        SET storage_state = 'ready'
        WHERE id = ? AND user_id = ? AND storage_state = 'staging'
      `).run(sourceFileId, userId);
      if (ready.changes !== 1) throw new Error('Source ready flip did not update exactly one row');

      storedResult = {
        created: true,
        deduplicated: false,
        source: getSourceRecordDetail(db, userId, sourceRecordId, options),
      };
    }
  } catch (error) {
    if (renamed) {
      throw sourceError(503, 'ready_flip_interrupted', 'Source blob was committed but its ready state was interrupted', {
        source_record_id: sourceRecordId,
      });
    }
    if (sourceRecordId) {
      db.prepare('DELETE FROM source_records WHERE id = ? AND user_id = ?').run(sourceRecordId, userId);
    }
    discardFile(inspected.temp_path);
    if (error instanceof AppError) throw error;
    if (renameAttempted) {
      throw sourceError(500, 'blob_commit_failed', 'Source blob could not be committed to managed storage');
    }
    throw sourceError(500, 'source_stage_failed', 'Source identity could not be staged');
  }

  if (!storedResult) {
    throw sourceError(500, 'source_stage_failed', 'Source identity was staged without a readable result');
  }
  if (inspected.fallback_text !== null) {
    await ensurePlainTextFallbackImprint(
      db,
      userId,
      storedResult.source.file.id,
      inspected.fallback_text,
      options,
    );
  }
  return finishStoredSourceIntake(db, userId, target, inspected, storedResult, options);
}

export function precheckSourceHash(
  db: Database.Database,
  userId: string,
  input: {
    course_id?: string;
    origin_entry_kind?: SourceOriginEntryKind;
    content_hash: string;
  },
  options: Pick<SourceStorageOptions, 'rootDir'> = {},
) {
  const hash = String(input.content_hash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw sourceError(400, 'invalid_content_hash', 'content_hash must be a SHA-256 hex digest');
  }
  const target = resolveTargetCourse(db, userId, input);
  const match = findSourceRecordByContentHash(db, userId, hash);
  if (!match) return { exists: false, source: null, placement_created: false };
  const placement = ensureSourceProjectPlacement(db, userId, match.source_record_id, target.courseId);
  return {
    exists: true,
    source: getSourceRecordDetail(db, userId, match.source_record_id, options),
    placement_created: placement.created,
  };
}

export function sweepSourceStorage(
  db: Database.Database,
  options: Pick<SourceStorageOptions, 'rootDir' | 'now'> = {},
) {
  ensureSourceStorageDirectories(options.rootDir);
  const now = options.now || new Date();
  const cutoff = now.getTime() - SOURCE_STAGING_MAX_AGE_MS;
  let removedTempOrphans = 0;
  let recoveredStaging = 0;
  let removedStaleStaging = 0;

  for (const entry of readdirSync(getSourceTempDirectory(options.rootDir), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = join(getSourceTempDirectory(options.rootDir), entry.name);
    if (statSync(filePath).mtimeMs < cutoff) {
      discardFile(filePath);
      removedTempOrphans += 1;
    }
  }

  const stagingRows = db.prepare(`
    SELECT sr.id AS source_record_id, sf.id AS source_file_id, sf.user_id, sf.storage_key, sf.uploaded_at
    FROM source_files sf
    JOIN source_records sr ON sr.id = sf.source_record_id AND sr.user_id = sf.user_id
    WHERE sf.storage_state = 'staging'
    ORDER BY sf.uploaded_at ASC, sf.id ASC
  `).all() as Array<{
    source_record_id: string;
    source_file_id: string;
    user_id: string;
    storage_key: string;
    uploaded_at: string;
  }>;

  for (const row of stagingRows) {
    const finalPath = resolveSourceStorageKey(row.storage_key, options.rootDir);
    if (existsSync(finalPath)) {
      db.prepare(`
        UPDATE source_files SET storage_state = 'ready'
        WHERE id = ? AND user_id = ? AND storage_state = 'staging'
      `).run(row.source_file_id, row.user_id);
      recoveredStaging += 1;
    } else if (isOlderThan(row.uploaded_at, SOURCE_STAGING_MAX_AGE_MS, now)) {
      db.prepare('DELETE FROM source_records WHERE id = ? AND user_id = ?')
        .run(row.source_record_id, row.user_id);
      removedStaleStaging += 1;
    }
  }

  return {
    removed_temp_orphans: removedTempOrphans,
    recovered_staging: recoveredStaging,
    removed_stale_staging: removedStaleStaging,
  };
}
