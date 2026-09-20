import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { MediaImageEditV1 } from '../../../shared/types/mediaImageEdit.js';
import { AppError } from '../middleware/errorHandler.js';
import { mediaBlockMetadataSchema } from '../validators/index.js';

/** Product metadata refinement only; asset identity and the save door stay unchanged. */
export const mediaImageEditSchema: z.ZodType<MediaImageEditV1> = z.object({
  crop: z.object({
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
    w: z.number().finite().positive().max(100),
    h: z.number().finite().positive().max(100),
  }).strict().refine((crop) => crop.x + crop.w <= 100 + 1e-7 && crop.y + crop.h <= 100 + 1e-7,
    'Image crop must stay inside the rotated image').nullable(),
  zoom: z.number().finite().min(1).max(3).nullable(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
}).strict();

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
  const media = (metadata as Record<string, unknown>).media as Record<string, unknown>;
  if (media.edit_v1 !== undefined && media.edit_v1 !== null) {
    const edit = mediaImageEditSchema.safeParse(media.edit_v1);
    if (!edit.success) throw new AppError(400, 'Invalid image editing parameters', { code: 'invalid_media_image_edit' });
  }
  const asset = db.prepare("SELECT id FROM canvas_assets WHERE id = ? AND user_id = ? AND kind = 'image'")
    .get(result.data.asset_id, userId);
  if (!asset) {
    throw new AppError(409, 'This image is no longer available. Paste the image again.', { code: 'media_asset_unavailable' });
  }
}
