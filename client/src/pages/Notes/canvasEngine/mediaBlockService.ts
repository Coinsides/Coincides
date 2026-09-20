import type { MediaImageEditV1, NoteBlockMediaMetadata } from '@shared/types';
import { isMediaImageEditV1 } from '../../../../../shared/types/mediaImageEdit';

export type EditableMediaBlockMetadata = NoteBlockMediaMetadata & { edit_v1?: MediaImageEditV1 | null };

export function readMediaBlockMetadata(block: { metadata?: Record<string, unknown> | null }): EditableMediaBlockMetadata | null {
  const media = block.metadata?.media;
  if (!media || typeof media !== 'object' || Array.isArray(media)) return null;
  const value = media as Record<string, unknown>;
  if (typeof value.asset_id !== 'string' || !value.asset_id
    || typeof value.naturalWidth !== 'number' || !Number.isFinite(value.naturalWidth) || value.naturalWidth <= 0
    || typeof value.naturalHeight !== 'number' || !Number.isFinite(value.naturalHeight) || value.naturalHeight <= 0) return null;
  return { asset_id: value.asset_id, naturalWidth: value.naturalWidth, naturalHeight: value.naturalHeight,
    ...(typeof value.alt === 'string' ? { alt: value.alt } : {}),
    ...(value.edit_v1 === null || isMediaImageEditV1(value.edit_v1) ? { edit_v1: value.edit_v1 } : {}) };
}

export function mediaBlockAlt(block: { metadata?: Record<string, unknown> | null }): string {
  return readMediaBlockMetadata(block)?.alt?.trim() || 'Image';
}
