import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { mediaBlockMetadataSchema } from '../validators/index.js';

export function mediaBlockAssetId(blockType: string, metadata: unknown): string | null {
  if (blockType !== 'media') return null;
  let parsed = metadata;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const result = mediaBlockMetadataSchema.safeParse((parsed as Record<string, unknown>).media);
  return result.success ? result.data.asset_id : null;
}

/** A media block stores an asset identity in metadata, never an image extension. */
export function assertMediaBlockAsset(
  db: Database.Database,
  userId: string,
  block: { block_type: string; metadata?: unknown },
) {
  if (block.block_type !== 'media') return;
  let metadata = block.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  const result = mediaBlockMetadataSchema.safeParse(
    metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>).media : undefined,
  );
  if (!result.success) throw new AppError(400, 'Media blocks require an image asset and its natural dimensions');
  const asset = db.prepare("SELECT id FROM canvas_assets WHERE id = ? AND user_id = ? AND kind = 'image'")
    .get(result.data.asset_id, userId);
  if (!asset) {
    throw new AppError(409, 'This image is no longer available. Paste the image again.', { code: 'media_asset_unavailable' });
  }
}
