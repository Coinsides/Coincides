import type Database from 'better-sqlite3';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

export type ManagedStorageDomain = 'source_blob' | 'canvas_asset';
export type ManagedFileOperation = 'delete' | 'restore';

export interface ManagedFileTask {
  user_id: string;
  storage_domain: ManagedStorageDomain;
  operation: ManagedFileOperation;
  source_storage_key: string;
  destination_storage_key?: string | null;
}

export interface ManagedFileCleanupOptions {
  sourceRootDir?: string;
  canvasAssetRootDir?: string;
  unlinkFile?: (path: string) => void;
  renameFile?: (from: string, to: string) => void;
}

interface CleanupJobRow extends ManagedFileTask {
  id: string;
  attempt_count: number;
}

function storageRoot(domain: ManagedStorageDomain, options: ManagedFileCleanupOptions): string {
  if (domain === 'source_blob') {
    return resolve(options.sourceRootDir || process.env.SOURCE_BLOB_DIR || join(process.cwd(), 'uploads', 'source-blobs'));
  }
  return resolve(options.canvasAssetRootDir || process.env.CANVAS_ASSET_DIR || join(process.cwd(), 'uploads', 'canvas-assets'));
}

function resolveManagedKey(
  domain: ManagedStorageDomain,
  storageKey: string,
  options: ManagedFileCleanupOptions,
): string {
  const root = storageRoot(domain, options);
  const target = resolve(root, storageKey);
  const fromRoot = relative(root, target);
  if (!storageKey || isAbsolute(storageKey) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
    throw new Error(`Managed ${domain} storage key escaped its root`);
  }
  return target;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1000);
}

function executeTask(task: ManagedFileTask, options: ManagedFileCleanupOptions): void {
  const sourcePath = resolveManagedKey(task.storage_domain, task.source_storage_key, options);
  if (task.operation === 'delete') {
    try {
      (options.unlinkFile || unlinkSync)(sourcePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return;
  }

  if (!task.destination_storage_key) throw new Error('Restore cleanup task requires a destination key');
  const destinationPath = resolveManagedKey(task.storage_domain, task.destination_storage_key, options);
  if (!existsSync(sourcePath) && existsSync(destinationPath)) return;
  mkdirSync(dirname(destinationPath), { recursive: true });
  (options.renameFile || renameSync)(sourcePath, destinationPath);
}

export function enqueueManagedFileTask(
  db: Database.Database,
  task: ManagedFileTask,
  error: unknown,
): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO managed_file_cleanup_jobs (
      id, user_id, storage_domain, operation, source_storage_key,
      destination_storage_key, status, attempt_count, last_error,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 1, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    task.user_id,
    task.storage_domain,
    task.operation,
    task.source_storage_key,
    task.destination_storage_key || null,
    errorMessage(error),
  );
  return id;
}

export function settleManagedFileTask(
  db: Database.Database,
  task: ManagedFileTask,
  options: ManagedFileCleanupOptions = {},
): { completed: boolean; cleanup_job_id: string | null } {
  try {
    executeTask(task, options);
    return { completed: true, cleanup_job_id: null };
  } catch (error) {
    return { completed: false, cleanup_job_id: enqueueManagedFileTask(db, task, error) };
  }
}

export function drainManagedFileCleanupJobs(
  db: Database.Database,
  options: ManagedFileCleanupOptions = {},
): { completed: number; pending: number } {
  const jobs = db.prepare(`
    SELECT id, user_id, storage_domain, operation, source_storage_key,
           destination_storage_key, attempt_count
    FROM managed_file_cleanup_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
  `).all() as CleanupJobRow[];

  let completed = 0;
  for (const job of jobs) {
    try {
      executeTask(job, options);
      db.prepare('DELETE FROM managed_file_cleanup_jobs WHERE id = ?').run(job.id);
      completed += 1;
    } catch (error) {
      db.prepare(`
        UPDATE managed_file_cleanup_jobs
        SET attempt_count = attempt_count + 1, last_error = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(errorMessage(error), job.id);
    }
  }
  return { completed, pending: jobs.length - completed };
}
