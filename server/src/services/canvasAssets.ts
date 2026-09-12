import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  settleManagedFileTask,
  type ManagedFileCleanupOptions,
  type ManagedFileTask,
} from './managedFileCleanup.js';

const CANVAS_ASSET_DIR = process.env.CANVAS_ASSET_DIR || join(process.cwd(), 'uploads', 'canvas-assets');

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface OwnedNote {
  id: string;
  user_id: string;
  course_id: string;
}

interface CanvasAssetRow {
  id: string;
  user_id: string;
  course_id: string | null;
  origin_note_id: string | null;
  kind: 'image';
  storage_kind: 'local_file';
  storage_key: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  metadata: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AssetReleaseRow {
  storage_key: string;
}

interface AssetReferenceRow {
  object_id: string;
  asset_id: string;
}

interface MediaAssetReferenceRow {
  block_id: string;
  asset_id: string;
}

function getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote {
  const note = db.prepare('SELECT id, user_id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as OwnedNote | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function parseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function assetFromRow(row: CanvasAssetRow) {
  return {
    asset_id: row.id,
    kind: row.kind,
    storage_kind: row.storage_kind,
    storage_key: row.storage_key,
    filename: row.filename,
    mime_type: row.mime_type,
    byte_size: Number(row.byte_size || 0),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    sha256: row.sha256 || undefined,
    blob_url: `/api/canvas-assets/${row.id}/blob`,
    metadata: parseJson(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertImageMimeType(mimeType: string): string {
  const extension = IMAGE_MIME_EXTENSIONS[mimeType];
  if (!extension) throw new AppError(400, 'Unsupported canvas image type');
  return extension;
}

export function createCanvasImageAssetFromUpload(
  db: Database.Database,
  userId: string,
  input: {
    noteId: string;
    file: Express.Multer.File;
    width?: number | null;
    height?: number | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (!input.file?.buffer || input.file.buffer.length === 0) {
    throw new AppError(400, 'No image file uploaded');
  }
  const note = getOwnedNote(db, userId, input.noteId);
  const extension = assertImageMimeType(input.file.mimetype);
  const assetId = uuidv4();
  const userDir = join(CANVAS_ASSET_DIR, userId);
  mkdirSync(userDir, { recursive: true });
  const storageKey = `${userId}/${assetId}${extension}`;
  const filePath = join(CANVAS_ASSET_DIR, storageKey);
  writeFileSync(filePath, input.file.buffer);

  const sha256 = createHash('sha256').update(input.file.buffer).digest('hex');
  const filename = basename(input.file.originalname || `canvas-image${extension}`);

  db.prepare(`
    INSERT INTO canvas_assets (
      id, user_id, course_id, origin_note_id, kind, storage_kind, storage_key,
      filename, mime_type, byte_size, width, height, sha256, metadata,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @origin_note_id, 'image', 'local_file', @storage_key,
      @filename, @mime_type, @byte_size, @width, @height, @sha256, @metadata,
      datetime('now'), datetime('now')
    )
  `).run({
    id: assetId,
    user_id: userId,
    course_id: note.course_id,
    origin_note_id: note.id,
    storage_key: storageKey,
    filename,
    mime_type: input.file.mimetype,
    byte_size: input.file.size || input.file.buffer.length,
    width: input.width ?? null,
    height: input.height ?? null,
    sha256,
    metadata: JSON.stringify(input.metadata || {}),
  });

  return getCanvasAsset(db, userId, assetId);
}

export function getCanvasAsset(
  db: Database.Database,
  userId: string,
  assetId: string,
) {
  const row = db.prepare(`
    SELECT *
    FROM canvas_assets
    WHERE id = ? AND user_id = ?
  `).get(assetId, userId) as CanvasAssetRow | undefined;
  if (!row) throw new AppError(404, 'Canvas asset not found');
  return assetFromRow(row);
}

export function getCanvasAssetBlob(
  db: Database.Database,
  userId: string,
  assetId: string,
) {
  const row = db.prepare(`
    SELECT *
    FROM canvas_assets
    WHERE id = ? AND user_id = ?
  `).get(assetId, userId) as CanvasAssetRow | undefined;
  if (!row) throw new AppError(404, 'Canvas asset not found');
  if (row.storage_kind !== 'local_file') throw new AppError(400, 'Unsupported canvas asset storage');
  const filePath = join(CANVAS_ASSET_DIR, row.storage_key);
  if (!existsSync(filePath)) throw new AppError(404, 'Canvas asset blob not found');
  return {
    stream: createReadStream(filePath),
    mimeType: row.mime_type,
    filename: row.filename,
  };
}

export function releaseAssetReference(
  db: Database.Database,
  userId: string,
  assetId: string,
  excludeObjectId: string,
) {
  const asset = db.prepare(`
    SELECT storage_key
    FROM canvas_assets
    WHERE id = ? AND user_id = ?
  `).get(assetId, userId) as AssetReleaseRow | undefined;
  if (!asset) {
    return { asset_id: assetId, released: false, remaining_references: 0, cleanup_task: null };
  }
  // Asset references are intentionally counted by user, not by note. A duplicated
  // image can reuse one blob across notes; note-scoped cleanup would delete too early.
  const remaining = db.prepare(`
    SELECT COUNT(*) AS count
    FROM image_object_extensions
    WHERE user_id = ?
      AND asset_id = ?
      AND object_id != ?
  `).get(userId, assetId, excludeObjectId) as { count: number };

  // The block row is the reference; placements do not multiply it. Trashing a
  // media block releases its blob, while archiving a block or note retains it.
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'note_blocks'").get()) {
    const mediaReferences = db.prepare(`SELECT COUNT(*) AS count FROM note_blocks
      WHERE user_id = ? AND block_type = 'media' AND status != 'trashed'
        AND json_extract(metadata, '$.media.asset_id') = ?`)
      .get(userId, assetId) as { count: number };
    remaining.count += mediaReferences.count;
  }

  // A relocated visual owns a durable reference even after its original note is
  // removed. The existence check also keeps pre-board migration fixtures valid.
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'board_visuals'").get()) {
    const boardReferences = db.prepare(`SELECT COUNT(*) AS count FROM board_visuals bv
      JOIN boards b ON b.id = bv.board_id
      WHERE b.user_id = ? AND bv.visual_kind = 'image'
        AND json_extract(bv.data, '$.tray_source.extensions.image.asset_id') = ?`)
      .get(userId, assetId) as { count: number };
    remaining.count += boardReferences.count;
  }

  if (remaining.count > 0) {
    return { asset_id: assetId, released: false, remaining_references: remaining.count, cleanup_task: null };
  }

  const deleted = db.prepare('DELETE FROM canvas_assets WHERE id = ? AND user_id = ?')
    .run(assetId, userId);
  const cleanupTask: ManagedFileTask | null = deleted.changes > 0
    ? {
        user_id: userId,
        storage_domain: 'canvas_asset',
        operation: 'delete',
        source_storage_key: asset.storage_key,
      }
    : null;
  return {
    asset_id: assetId,
    released: deleted.changes > 0,
    remaining_references: 0,
    cleanup_task: cleanupTask,
  };
}

export function releaseCourseCanvasAssets(
  db: Database.Database,
  userId: string,
  courseId: string,
) {
  const mediaRows = db.prepare(`SELECT id AS block_id, json_extract(metadata, '$.media.asset_id') AS asset_id
    FROM note_blocks WHERE user_id = ? AND course_id = ? AND block_type = 'media'
      AND json_extract(metadata, '$.media.asset_id') IS NOT NULL`)
    .all(userId, courseId) as MediaAssetReferenceRow[];
  // These blocks are about to cascade with their Project. Detach their media
  // references inside the caller's transaction before counting shared blobs.
  db.prepare(`UPDATE note_blocks SET metadata = json_remove(metadata, '$.media')
    WHERE user_id = ? AND course_id = ? AND block_type = 'media'`).run(userId, courseId);
  const rows = db.prepare(`
    SELECT object_id, asset_id
    FROM image_object_extensions
    WHERE user_id = ?
      AND course_id = ?
    ORDER BY asset_id ASC, object_id ASC
  `).all(userId, courseId) as AssetReferenceRow[];

  let released = 0;
  const cleanupTasks: ManagedFileTask[] = [];
  for (const row of rows) {
    // The DB decision stays inside the caller's transaction. Physical cleanup is
    // returned as a task and may run only after that transaction commits.
    db.prepare(`
      DELETE FROM image_object_extensions
      WHERE object_id = ?
        AND user_id = ?
        AND course_id = ?
    `).run(row.object_id, userId, courseId);
    const decision = releaseAssetReference(db, userId, row.asset_id, row.object_id);
    if (decision.released) {
      released += 1;
      if (decision.cleanup_task) cleanupTasks.push(decision.cleanup_task);
    }
  }

  const orphanAssets = db.prepare('SELECT id AS asset_id FROM canvas_assets WHERE user_id = ? AND course_id = ?')
    .all(userId, courseId) as { asset_id: string }[];
  for (const assetId of new Set([...mediaRows, ...orphanAssets].map((row) => row.asset_id))) {
    const decision = releaseAssetReference(db, userId, assetId, '');
    if (decision.released) released += 1;
    if (decision.cleanup_task) cleanupTasks.push(decision.cleanup_task);
  }

  return { course_id: courseId, checked_references: rows.length + mediaRows.length, released, cleanup_tasks: cleanupTasks };
}

export function releaseNoteCanvasAssets(
  db: Database.Database,
  userId: string,
  noteId: string,
) {
  // A Note can share a block with another Note. Only detach a block when this
  // is its last placement; references surviving elsewhere continue to own it.
  const mediaRows = db.prepare(`SELECT DISTINCT nb.id AS block_id,
      json_extract(nb.metadata, '$.media.asset_id') AS asset_id
    FROM note_blocks nb JOIN note_block_placements p ON p.block_id = nb.id
    WHERE nb.user_id = ? AND p.note_id = ? AND nb.block_type = 'media'
      AND json_extract(nb.metadata, '$.media.asset_id') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM note_block_placements other
        WHERE other.block_id = nb.id AND other.note_id != ?)`)
    .all(userId, noteId, noteId) as MediaAssetReferenceRow[];
  for (const row of mediaRows) {
    db.prepare("UPDATE note_blocks SET metadata = json_remove(metadata, '$.media') WHERE id = ? AND user_id = ?")
      .run(row.block_id, userId);
  }
  const rows = db.prepare(`
    SELECT object_id, asset_id
    FROM image_object_extensions
    WHERE user_id = ? AND note_id = ?
    ORDER BY asset_id ASC, object_id ASC
  `).all(userId, noteId) as AssetReferenceRow[];
  const cleanupTasks: ManagedFileTask[] = [];
  for (const row of rows) {
    db.prepare('DELETE FROM image_object_extensions WHERE object_id = ? AND user_id = ? AND note_id = ?')
      .run(row.object_id, userId, noteId);
    const decision = releaseAssetReference(db, userId, row.asset_id, row.object_id);
    if (decision.cleanup_task) cleanupTasks.push(decision.cleanup_task);
  }
  const orphanAssets = db.prepare('SELECT id AS asset_id FROM canvas_assets WHERE user_id = ? AND origin_note_id = ?')
    .all(userId, noteId) as { asset_id: string }[];
  for (const assetId of new Set([...mediaRows, ...orphanAssets].map((row) => row.asset_id))) {
    const decision = releaseAssetReference(db, userId, assetId, '');
    if (decision.cleanup_task) cleanupTasks.push(decision.cleanup_task);
  }
  return cleanupTasks;
}

export function finalizeCanvasAssetCleanup(
  db: Database.Database,
  cleanupTasks: ManagedFileTask[],
  options: ManagedFileCleanupOptions = {},
) {
  return cleanupTasks.map((task) => settleManagedFileTask(db, task, options));
}
