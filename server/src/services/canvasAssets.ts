import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

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
    return { asset_id: assetId, released: false, remaining_references: 0 };
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

  if (remaining.count > 0) {
    return { asset_id: assetId, released: false, remaining_references: remaining.count };
  }

  const deleted = db.prepare('DELETE FROM canvas_assets WHERE id = ? AND user_id = ?')
    .run(assetId, userId);
  if (deleted.changes > 0) {
    try {
      unlinkSync(join(CANVAS_ASSET_DIR, asset.storage_key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to unlink canvas asset blob', { assetId, error });
      }
    }
  }

  return { asset_id: assetId, released: deleted.changes > 0, remaining_references: 0 };
}

export function releaseCourseCanvasAssets(
  db: Database.Database,
  userId: string,
  courseId: string,
) {
  const rows = db.prepare(`
    SELECT object_id, asset_id
    FROM image_object_extensions
    WHERE user_id = ?
      AND course_id = ?
    ORDER BY asset_id ASC, object_id ASC
  `).all(userId, courseId) as AssetReferenceRow[];

  let released = 0;
  for (const row of rows) {
    // This must run before DELETE FROM courses, in the same transaction.
    // Delete the self extension first; otherwise asset_id ON DELETE RESTRICT
    // can block releaseAssetReference from deleting the final asset row.
    db.prepare(`
      DELETE FROM image_object_extensions
      WHERE object_id = ?
        AND user_id = ?
        AND course_id = ?
    `).run(row.object_id, userId, courseId);
    if (releaseAssetReference(db, userId, row.asset_id, row.object_id).released) {
      released += 1;
    }
  }

  return { course_id: courseId, checked_references: rows.length, released };
}
