import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AppError } from '../middleware/errorHandler.js';
import {
  SourceArtifactError,
  isSourceArtifactErrorRetryable,
  parseSourceArtifact,
  type SourceArtifact,
  type SourceParserInput,
} from './sourceArtifact.js';
import { getSourceMaterializationFile } from './sourceFileIntake.js';
import {
  publishSourceProjection,
  sweepOrphanSourceProjectionAssets,
  type PublishSourceProjectionHooks,
} from './sourceProjectionMaterializer.js';
import { storeSourceImprint, type SourceImprintInput } from './sourceImprints.js';

const INTERRUPTED_AFTER_MS = 10 * 60 * 1000;
const SOURCE_ARTIFACT_TRANSCRIBER_LOCKFILE = 'server/package-lock.json';
const SOURCE_ARTIFACT_TRANSCRIBER_LOCKFILE_URL = new URL('../../package-lock.json', import.meta.url);

function sourceArtifactTranscriberLockfileHash(): string {
  try {
    return createHash('sha256')
      .update(readFileSync(SOURCE_ARTIFACT_TRANSCRIBER_LOCKFILE_URL))
      .digest('hex');
  } catch (error) {
    throw new SourceArtifactError(
      'internal_interrupted',
      `SourceArtifact transcriber lockfile could not be read: ${SOURCE_ARTIFACT_TRANSCRIBER_LOCKFILE}`,
      { cause: error },
    );
  }
}

type MaterializationStatus = 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed';

interface MaterializationRow {
  id: string;
  source_record_id: string;
  source_file_id: string;
  user_id: string;
  parser_key: string;
  parser_version: string;
  status: MaterializationStatus;
  attempt_count: number;
  projection_note_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceMaterializationHooks extends PublishSourceProjectionHooks {
  afterClaim?: () => void;
  afterParse?: (artifact: SourceArtifact) => void;
  afterPublishingState?: () => void;
}

export interface SourceMaterializationOptions {
  sourceRootDir?: string;
  canvasAssetRootDir?: string;
  now?: Date;
  parseArtifact?: (input: SourceParserInput) => Promise<SourceArtifact>;
  hooks?: SourceMaterializationHooks;
}

export interface SourceMaterializationResult {
  claimed: boolean;
  materialization_id: string;
  source_record_id: string;
  status: MaterializationStatus;
  attempt_count: number;
  projection_note_id: string | null;
  operation_batch_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean;
}

function ownedMaterialization(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): MaterializationRow {
  const row = db.prepare(`
    SELECT sm.*
    FROM source_materializations sm
    JOIN source_records sr ON sr.id = sm.source_record_id AND sr.user_id = sm.user_id
    WHERE sm.source_record_id = ? AND sm.user_id = ?
  `).get(sourceRecordId, userId) as MaterializationRow | undefined;
  if (!row) throw new AppError(404, 'Source materialization not found');
  return row;
}

function operationBatchId(
  db: Database.Database,
  userId: string,
  materializationId: string,
): string | null {
  const row = db.prepare(`
    SELECT id FROM operation_batches
    WHERE user_id = ? AND source_type = 'source_materialization' AND source_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(userId, materializationId) as { id: string } | undefined;
  return row?.id || null;
}

function resultFromRow(
  db: Database.Database,
  row: MaterializationRow,
  claimed: boolean,
): SourceMaterializationResult {
  return {
    claimed,
    materialization_id: row.id,
    source_record_id: row.source_record_id,
    status: row.status,
    attempt_count: Number(row.attempt_count || 0),
    projection_note_id: row.projection_note_id,
    operation_batch_id: row.status === 'materialized'
      ? operationBatchId(db, row.user_id, row.id)
      : null,
    error_code: row.error_code,
    error_message: row.error_message,
    retryable: row.status === 'failed' && isSourceArtifactErrorRetryable(row.error_code),
  };
}

function currentResult(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  claimed = false,
): SourceMaterializationResult {
  return resultFromRow(db, ownedMaterialization(db, userId, sourceRecordId), claimed);
}

export function claimSourceMaterialization(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  now = new Date(),
): SourceMaterializationResult {
  const before = ownedMaterialization(db, userId, sourceRecordId);
  if (before.parser_key === 'stored-only') {
    throw new AppError(409, 'This Source format is stored-only and cannot be materialized', {
      code: 'unsupported_format',
      capability: 'stored_only',
    });
  }
  if (before.status === 'materialized' || before.status === 'parsing' || before.status === 'publishing') {
    return resultFromRow(db, before, false);
  }
  if (before.status === 'failed' && !isSourceArtifactErrorRetryable(before.error_code)) {
    throw new AppError(409, 'Source materialization failure is not retryable', {
      code: 'materialization_not_retryable',
      error_code: before.error_code,
    });
  }

  const timestamp = now.toISOString();
  const claimed = db.prepare(`
    UPDATE source_materializations
    SET status = 'parsing', attempt_count = attempt_count + 1,
        error_code = NULL, error_message = NULL, started_at = ?, completed_at = NULL,
        updated_at = ?
    WHERE id = ? AND user_id = ? AND source_record_id = ?
      AND (
        status = 'received'
        OR (status = 'failed' AND error_code IN ('parser_failure', 'internal_interrupted'))
      )
  `).run(timestamp, timestamp, before.id, userId, sourceRecordId);
  return currentResult(db, userId, sourceRecordId, claimed.changes === 1);
}

function failMaterialization(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  errorCode: string,
  errorMessage: string,
  now: Date,
): SourceMaterializationResult {
  const message = errorMessage.trim().slice(0, 1000) || 'Source materialization failed';
  db.prepare(`
    UPDATE source_materializations
    SET status = 'failed', projection_note_id = NULL, error_code = ?, error_message = ?,
        completed_at = ?, updated_at = ?
    WHERE source_record_id = ? AND user_id = ?
      AND status IN ('parsing', 'publishing')
  `).run(errorCode, message, now.toISOString(), now.toISOString(), sourceRecordId, userId);
  return currentResult(db, userId, sourceRecordId);
}

function parserInput(source: ReturnType<typeof getSourceMaterializationFile>): SourceParserInput {
  return {
    parser_key: source.parser_key,
    parser_version: source.parser_version,
    file_path: source.file_path,
    original_filename: source.original_filename,
    mime_type: source.mime_type,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pageAnchorForBlock(block: SourceArtifact['blocks'][number]) {
  const locatorPage = isRecord(block.locator) ? block.locator.page_index : undefined;
  const blockIndex = isRecord(block.locator) ? block.locator.block_index : undefined;
  if (
    !Number.isInteger(block.page_index)
    || (block.page_index as number) < 1
    || locatorPage !== block.page_index
    || !Number.isInteger(blockIndex)
    || (blockIndex as number) < 0
  ) {
    throw new SourceArtifactError('parser_failure', 'PDF SourceArtifact block is missing its page-local locator');
  }
  return {
    family: 'page' as const,
    page: block.page_index as number,
    block_index: blockIndex as number,
  };
}

function flowAnchorForBlock(block: SourceArtifact['blocks'][number]) {
  const locatorKind = isRecord(block.locator) ? block.locator.kind : undefined;
  const locatorIndex = isRecord(block.locator) ? block.locator.index : undefined;
  if (
    block.page_index !== null
    || typeof locatorKind !== 'string'
    || locatorKind.trim().length === 0
    || !Number.isInteger(locatorIndex)
    || (locatorIndex as number) < 1
  ) {
    throw new SourceArtifactError('parser_failure', 'Flow SourceArtifact block is missing its format-native locator');
  }
  return {
    family: 'flow' as const,
    path: `${locatorKind}[${locatorIndex}]`,
  };
}

function sourceArtifactImprintInput(
  sourceFileId: string,
  artifact: SourceArtifact,
): SourceImprintInput | null {
  if (artifact.artifact_kind !== 'document') return null;
  const paged = artifact.parser_key === 'native-pdf';
  return {
    source_file_id: sourceFileId,
    transcriber: {
      name: artifact.parser_key,
      version: artifact.parser_version,
      lockfile: SOURCE_ARTIFACT_TRANSCRIBER_LOCKFILE,
      lockfile_hash: sourceArtifactTranscriberLockfileHash(),
    },
    anchor_fidelity: paged ? 'page' : 'element',
    text_normalization: 'whitespace',
    fragments: artifact.blocks.map((block, seq) => ({
      seq,
      text: block.text,
      role: block.writing_role === 'heading' ? 'heading' : 'para',
      anchor: paged ? pageAnchorForBlock(block) : flowAnchorForBlock(block),
    })),
    warnings: [],
  };
}

function ensureSourceArtifactImprint(
  db: Database.Database,
  userId: string,
  sourceFileId: string,
  artifact: SourceArtifact,
  options: SourceMaterializationOptions,
): void {
  const input = sourceArtifactImprintInput(sourceFileId, artifact);
  if (!input) return;
  const existing = db.prepare(`
    SELECT 1
    FROM source_imprints
    WHERE source_file_id = ?
      AND user_id = ?
      AND transcriber_lockfile_hash = ?
      AND status = 'accepted'
    LIMIT 1
  `).get(
    sourceFileId,
    userId,
    input.transcriber.lockfile_hash,
  );
  if (existing) return;

  const stored = storeSourceImprint(db, userId, input, {
    rootDir: options.sourceRootDir,
    now: options.now,
  });
  if (stored.imprint.status !== 'accepted') {
    throw new SourceArtifactError(
      'parser_failure',
      'SourceArtifact imprint was rejected by the Source imprint contract',
    );
  }
}

async function executeClaimedSourceMaterialization(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: SourceMaterializationOptions,
): Promise<SourceMaterializationResult> {
  const now = options.now || new Date();
  try {
    options.hooks?.afterClaim?.();
    const source = getSourceMaterializationFile(db, userId, sourceRecordId, {
      rootDir: options.sourceRootDir,
    });
    const artifact = options.parseArtifact
      ? await options.parseArtifact(parserInput(source))
      : await parseSourceArtifact(parserInput(source));
    if (artifact.schema_version !== 'source-artifact.v1') {
      throw new SourceArtifactError('parser_failure', 'Parser returned an unsupported SourceArtifact version');
    }
    options.hooks?.afterParse?.(artifact);
    ensureSourceArtifactImprint(db, userId, source.source_file_id, artifact, options);

    const publishingAt = (options.now || new Date()).toISOString();
    const publishing = db.prepare(`
      UPDATE source_materializations
      SET status = 'publishing', updated_at = ?
      WHERE id = ? AND source_record_id = ? AND user_id = ? AND status = 'parsing'
    `).run(publishingAt, source.materialization_id, sourceRecordId, userId);
    if (publishing.changes !== 1) return currentResult(db, userId, sourceRecordId);
    options.hooks?.afterPublishingState?.();

    publishSourceProjection(db, source, artifact, {
      canvasAssetRootDir: options.canvasAssetRootDir,
      now: options.now,
      hooks: options.hooks,
    });
    return currentResult(db, userId, sourceRecordId);
  } catch (error) {
    if (error instanceof SourceArtifactError) {
      return failMaterialization(db, userId, sourceRecordId, error.code, error.message, options.now || new Date());
    }
    if (error instanceof AppError) {
      const code = (error.details as { code?: string } | undefined)?.code;
      return failMaterialization(
        db,
        userId,
        sourceRecordId,
        code === 'blob_missing' ? 'internal_interrupted' : 'parser_failure',
        error.message,
        options.now || new Date(),
      );
    }
    return failMaterialization(
      db,
      userId,
      sourceRecordId,
      'internal_interrupted',
      error instanceof Error ? error.message : 'Source materialization was interrupted',
      options.now || new Date(),
    );
  }
}

export async function materializeSourceNow(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: SourceMaterializationOptions = {},
): Promise<SourceMaterializationResult> {
  const claim = claimSourceMaterialization(db, userId, sourceRecordId, options.now || new Date());
  if (!claim.claimed) return claim;
  return executeClaimedSourceMaterialization(db, userId, sourceRecordId, options);
}

const scheduled = new Map<string, Promise<SourceMaterializationResult>>();

export function scheduleSourceMaterialization(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: SourceMaterializationOptions = {},
): SourceMaterializationResult {
  const key = `${userId}:${sourceRecordId}`;
  if (scheduled.has(key)) return currentResult(db, userId, sourceRecordId);
  const claim = claimSourceMaterialization(db, userId, sourceRecordId, options.now || new Date());
  if (!claim.claimed) return claim;

  const task = new Promise<SourceMaterializationResult>((resolve) => {
    setImmediate(() => {
      void executeClaimedSourceMaterialization(db, userId, sourceRecordId, options).then(resolve);
    });
  }).finally(() => {
    scheduled.delete(key);
  });
  scheduled.set(key, task);
  return claim;
}

export async function waitForScheduledSourceMaterializations(): Promise<void> {
  await Promise.all([...scheduled.values()]);
}

export function sweepSourceMaterializations(
  db: Database.Database,
  options: {
    now?: Date;
    interruptedAfterMs?: number;
    canvasAssetRootDir?: string;
  } = {},
) {
  const now = options.now || new Date();
  const threshold = options.interruptedAfterMs ?? INTERRUPTED_AFTER_MS;
  const rows = db.prepare(`
    SELECT id, status, started_at, updated_at
    FROM source_materializations
    WHERE status IN ('parsing', 'publishing')
  `).all() as Array<{
    id: string;
    status: 'parsing' | 'publishing';
    started_at: string | null;
    updated_at: string;
  }>;

  let interruptedRunsFailed = 0;
  for (const row of rows) {
    const timestamp = Date.parse(row.updated_at || row.started_at || '');
    if (!Number.isFinite(timestamp) || now.getTime() - timestamp <= threshold) continue;
    const failed = db.prepare(`
      UPDATE source_materializations
      SET status = 'failed', projection_note_id = NULL,
          error_code = 'internal_interrupted',
          error_message = 'Materialization was interrupted before atomic publication completed',
          completed_at = ?, updated_at = ?
      WHERE id = ? AND status IN ('parsing', 'publishing')
    `).run(now.toISOString(), now.toISOString(), row.id);
    interruptedRunsFailed += failed.changes;
  }

  const orphanAssetsRemoved = sweepOrphanSourceProjectionAssets(db, {
    canvasAssetRootDir: options.canvasAssetRootDir,
    now,
    staleAfterMs: threshold,
  });
  return {
    interrupted_runs_failed: interruptedRunsFailed,
    orphan_projection_assets_removed: orphanAssetsRemoved,
  };
}

export function resumeReceivedSourceMaterializations(
  db: Database.Database,
  options: SourceMaterializationOptions = {},
): number {
  const rows = db.prepare(`
    SELECT sm.source_record_id, sm.user_id
    FROM source_materializations sm
    JOIN source_files sf ON sf.id = sm.source_file_id AND sf.user_id = sm.user_id
    WHERE sm.status = 'received'
      AND sf.storage_state = 'ready'
      AND sm.parser_key != 'stored-only'
    ORDER BY sm.created_at ASC, sm.id ASC
  `).all() as Array<{ source_record_id: string; user_id: string }>;
  for (const row of rows) {
    scheduleSourceMaterialization(db, row.user_id, row.source_record_id, options);
  }
  return rows.length;
}
