import type Database from 'better-sqlite3';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { finalizeCanvasAssetCleanup, releaseNoteCanvasAssets } from './canvasAssets.js';
import { getProjectionUserWork } from './courseLifecycle.js';
import {
  enqueueManagedFileTask,
  settleManagedFileTask,
  type ManagedFileCleanupOptions,
  type ManagedFileTask,
} from './managedFileCleanup.js';
import { getSourceBlobRoot, resolveSourceStorageKey } from './sourceFileIntake.js';

interface SourceLifecycleRow {
  id: string;
  display_name: string;
  storage_key: string;
  storage_state: 'staging' | 'ready';
  materialization_id: string;
  materialization_status: 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed';
  projection_note_id: string | null;
}

export interface SourceDeletionImpact {
  source: { id: string; display_name: string };
  placement_count: number;
  receipt_count: number;
  projection_receipt_count: number;
  retained_receipt_count: number;
  projection_note_id: string | null;
  projection_user_work: ReturnType<typeof getProjectionUserWork> | null;
  materialization_status: SourceLifecycleRow['materialization_status'];
  deletion_blocked: boolean;
  blocked_reason: string | null;
}

export interface DeleteSourceLifecycleOptions extends ManagedFileCleanupOptions {
  renameFile?: (from: string, to: string) => void;
  beforeDatabaseCommit?: () => void;
}

function sourceRow(db: Database.Database, userId: string, sourceRecordId: string): SourceLifecycleRow {
  const row = db.prepare(`
    SELECT
      sr.id,
      sr.display_name,
      sf.storage_key,
      sf.storage_state,
      sm.id AS materialization_id,
      sm.status AS materialization_status,
      sm.projection_note_id
    FROM source_records sr
    JOIN source_files sf ON sf.source_record_id = sr.id AND sf.user_id = sr.user_id
    JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    WHERE sr.id = ? AND sr.user_id = ?
  `).get(sourceRecordId, userId) as SourceLifecycleRow | undefined;
  if (!row) throw new AppError(404, 'Source not found');
  return row;
}

function scalarCount(db: Database.Database, sql: string, ...params: unknown[]): number {
  return Number((db.prepare(sql).get(...params) as { count?: number } | undefined)?.count || 0);
}

export function getSourceDeletionImpact(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): SourceDeletionImpact {
  const row = sourceRow(db, userId, sourceRecordId);
  const receiptCount = scalarCount(
    db,
    'SELECT COUNT(*) AS count FROM note_block_sources WHERE source_record_id = ?',
    sourceRecordId,
  );
  const projectionReceiptCount = row.projection_note_id
    ? scalarCount(db, `
        SELECT COUNT(DISTINCT nbs.id) AS count
        FROM note_block_sources nbs
        JOIN note_block_placements nbp ON nbp.block_id = nbs.block_id
        WHERE nbs.source_record_id = ? AND nbp.note_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM note_block_placements other
            WHERE other.block_id = nbs.block_id AND other.note_id != ?
          )
      `, sourceRecordId, row.projection_note_id, row.projection_note_id)
    : 0;
  const active = row.materialization_status === 'parsing' || row.materialization_status === 'publishing';
  return {
    source: { id: row.id, display_name: row.display_name },
    placement_count: scalarCount(
      db,
      'SELECT COUNT(*) AS count FROM source_project_placements WHERE source_record_id = ? AND user_id = ?',
      sourceRecordId,
      userId,
    ),
    receipt_count: receiptCount,
    projection_receipt_count: projectionReceiptCount,
    retained_receipt_count: Math.max(0, receiptCount - projectionReceiptCount),
    projection_note_id: row.projection_note_id,
    projection_user_work: row.projection_note_id
      ? getProjectionUserWork(db, userId, row.projection_note_id)
      : null,
    materialization_status: row.materialization_status,
    deletion_blocked: active,
    blocked_reason: active ? 'Source extraction is still active. Wait for it to finish before deleting.' : null,
  };
}

function quarantineStorageKey(userId: string, storageKey: string): string {
  return `.quarantine/${userId}/${uuidv4()}-${basename(storageKey)}`;
}

export function deleteSourceWithCompensation(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: DeleteSourceLifecycleOptions = {},
) {
  const row = sourceRow(db, userId, sourceRecordId);
  const impact = getSourceDeletionImpact(db, userId, sourceRecordId);
  if (impact.deletion_blocked) {
    throw new AppError(409, impact.blocked_reason || 'Source deletion is temporarily blocked', {
      code: 'source_materialization_active',
      status: impact.materialization_status,
    });
  }

  const rootDir = getSourceBlobRoot(options.sourceRootDir);
  const originalPath = resolveSourceStorageKey(row.storage_key, rootDir);
  const originalExists = row.storage_state === 'ready' && existsSync(originalPath);
  const quarantineKey = originalExists ? quarantineStorageKey(userId, row.storage_key) : null;
  const quarantinePath = quarantineKey ? resolveSourceStorageKey(quarantineKey, rootDir) : null;
  const renameFile = options.renameFile || renameSync;
  let quarantined = false;

  if (quarantinePath) {
    mkdirSync(dirname(quarantinePath), { recursive: true });
    try {
      renameFile(originalPath, quarantinePath);
      quarantined = true;
    } catch (error) {
      throw new AppError(500, 'Source original could not be moved into deletion quarantine', {
        code: 'source_quarantine_failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const cleanupTasks: ManagedFileTask[] = [];
  const projectionBlockIds = row.projection_note_id
    ? (db.prepare('SELECT block_id FROM note_block_placements WHERE note_id = ?')
        .all(row.projection_note_id) as Array<{ block_id: string }>).map((block) => block.block_id)
    : [];
  try {
    db.transaction(() => {
      if (row.projection_note_id) {
        cleanupTasks.push(...releaseNoteCanvasAssets(db, userId, row.projection_note_id));
        db.prepare(`
          UPDATE content_group_members
          SET source_sync_status = 'stale', updated_at = datetime('now')
          WHERE user_id = ? AND note_id = ?
        `).run(userId, row.projection_note_id);
      }

      const deleted = db.prepare('DELETE FROM source_records WHERE id = ? AND user_id = ?')
        .run(sourceRecordId, userId);
      if (deleted.changes !== 1) throw new AppError(404, 'Source not found');

      if (row.projection_note_id) {
        db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ? AND note_class = \'source_projection\'')
          .run(row.projection_note_id, userId);
        for (const blockId of projectionBlockIds) {
          const remainingPlacement = db.prepare('SELECT 1 FROM note_block_placements WHERE block_id = ? LIMIT 1')
            .get(blockId);
          if (remainingPlacement) continue;
          db.prepare(`
            UPDATE content_group_members
            SET target_id = NULL, source_sync_status = 'stale', updated_at = datetime('now')
            WHERE user_id = ? AND kind IN ('note_block', 'block') AND target_id = ?
          `).run(userId, blockId);
          db.prepare('DELETE FROM note_blocks WHERE id = ? AND user_id = ? AND source_kind = \'source_projection\'')
            .run(blockId, userId);
        }
      }
      db.prepare(`
        DELETE FROM operation_batches
        WHERE user_id = ? AND source_type = 'source_materialization' AND source_id = ?
      `).run(userId, row.materialization_id);
      options.beforeDatabaseCommit?.();
    })();
  } catch (error) {
    if (quarantined && quarantineKey && quarantinePath) {
      try {
        mkdirSync(dirname(originalPath), { recursive: true });
        renameFile(quarantinePath, originalPath);
      } catch (restoreError) {
        enqueueManagedFileTask(db, {
          user_id: userId,
          storage_domain: 'source_blob',
          operation: 'restore',
          source_storage_key: quarantineKey,
          destination_storage_key: row.storage_key,
        }, restoreError);
      }
    }
    throw error;
  }

  const assetCleanup = finalizeCanvasAssetCleanup(db, cleanupTasks, options);
  const sourceCleanup = quarantineKey
    ? settleManagedFileTask(db, {
        user_id: userId,
        storage_domain: 'source_blob',
        operation: 'delete',
        source_storage_key: quarantineKey,
      }, options)
    : { completed: true, cleanup_job_id: null };

  return {
    source_record_id: sourceRecordId,
    deleted: true,
    projection_deleted: Boolean(row.projection_note_id),
    receipts_degraded: impact.retained_receipt_count,
    original_was_missing: !originalExists,
    cleanup_jobs_created: assetCleanup.filter((result) => !result.completed).length
      + (sourceCleanup.completed ? 0 : 1),
  };
}
