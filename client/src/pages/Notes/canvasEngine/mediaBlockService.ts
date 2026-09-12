import type { NoteBlockMediaMetadata } from '@shared/types';

export function readMediaBlockMetadata(block: { metadata?: Record<string, unknown> | null }): NoteBlockMediaMetadata | null {
  const media = block.metadata?.media;
  if (!media || typeof media !== 'object' || Array.isArray(media)) return null;
  const value = media as Record<string, unknown>;
  if (typeof value.asset_id !== 'string' || !value.asset_id
    || typeof value.naturalWidth !== 'number' || !Number.isFinite(value.naturalWidth) || value.naturalWidth <= 0
    || typeof value.naturalHeight !== 'number' || !Number.isFinite(value.naturalHeight) || value.naturalHeight <= 0) return null;
  return { asset_id: value.asset_id, naturalWidth: value.naturalWidth, naturalHeight: value.naturalHeight,
    ...(typeof value.alt === 'string' ? { alt: value.alt } : {}) };
}

export function mediaBlockAlt(block: { metadata?: Record<string, unknown> | null }): string {
  return readMediaBlockMetadata(block)?.alt?.trim() || 'Image';
}
