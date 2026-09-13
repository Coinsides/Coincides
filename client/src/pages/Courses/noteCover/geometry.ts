import { NOTE_CARD_COVER_ASPECT_RATIO, type NoteCoverCrop } from '@shared/types';

export interface CoverSize { width: number; height: number }
export interface CoverPosition { x: number; y: number }

export const NOTE_COVER_MIN_ZOOM = 1;
export const NOTE_COVER_MAX_ZOOM = 3;

/** A card and its editor use the same viewport, regardless of display width. */
export function coverViewport(width: number): CoverSize {
  return { width, height: width / NOTE_CARD_COVER_ASPECT_RATIO };
}

/** The unzoomed image always covers both viewport axes. */
export function coverFitSize(image: CoverSize, viewport: CoverSize): CoverSize {
  const scale = Math.max(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

export function clampCoverZoom(zoom: number, maximum = NOTE_COVER_MAX_ZOOM): number {
  return Math.min(Math.max(NOTE_COVER_MIN_ZOOM, zoom), maximum);
}

export function clampCoverPosition(
  position: CoverPosition, media: CoverSize, viewport: CoverSize, zoom: number,
): CoverPosition {
  const safeZoom = Math.max(NOTE_COVER_MIN_ZOOM, zoom);
  const limitX = Math.max(0, (media.width * safeZoom - viewport.width) / 2);
  const limitY = Math.max(0, (media.height * safeZoom - viewport.height) / 2);
  return {
    x: limitX === 0 ? 0 : Math.min(limitX, Math.max(-limitX, position.x)),
    y: limitY === 0 ? 0 : Math.min(limitY, Math.max(-limitY, position.y)),
  };
}

/** Percentages refer to original image axes, never card pixels. */
export function coverPositionToCrop(
  position: CoverPosition, media: CoverSize, viewport: CoverSize, zoom: number,
): NoteCoverCrop {
  const safeZoom = Math.max(NOTE_COVER_MIN_ZOOM, zoom);
  const bounded = clampCoverPosition(position, media, viewport, safeZoom);
  const width = Math.min(100, viewport.width / (media.width * safeZoom) * 100);
  const height = Math.min(100, viewport.height / (media.height * safeZoom) * 100);
  return {
    x: Math.min(100 - width, Math.max(0, (100 - width) / 2 - bounded.x / (media.width * safeZoom) * 100)),
    y: Math.min(100 - height, Math.max(0, (100 - height) / 2 - bounded.y / (media.height * safeZoom) * 100)),
    width,
    height,
  };
}

export function centeredCoverCrop(image: CoverSize): NoteCoverCrop {
  const viewport = coverViewport(image.width);
  return coverPositionToCrop({ x: 0, y: 0 }, coverFitSize(image, viewport), viewport, NOTE_COVER_MIN_ZOOM);
}
