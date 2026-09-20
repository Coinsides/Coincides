/** The card viewport is fixed; stored crop percentages never depend on card width. */
export const NOTE_CARD_COVER_ASPECT_RATIO = 2;

export interface NoteCoverCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NoteCoverFrame {
  crop: NoteCoverCrop;
  /** 1 is the centered cover-fit lower bound. */
  zoom: number;
}

export const DEFAULT_NOTE_COVER_FRAME: NoteCoverFrame = { crop: { x: 0, y: 0, width: 100, height: 100 }, zoom: 1 };

/** The card crop's centered cover-fit calculation, shared by every consuming frame. */
export function createCenteredNoteCoverFrame(width: number, height: number, aspectRatio = NOTE_CARD_COVER_ASPECT_RATIO): NoteCoverFrame {
  const viewportHeight = width / aspectRatio;
  const scale = Math.max(1, viewportHeight / height);
  const cropWidth = Math.min(100, 100 / scale);
  const cropHeight = Math.min(100, viewportHeight / (height * scale) * 100);
  return { crop: { x: (100 - cropWidth) / 2, y: (100 - cropHeight) / 2, width: cropWidth, height: cropHeight }, zoom: 1 };
}

/** Original asset plus non-destructive, source-image percentage viewports. */
export interface NoteCover {
  assetId: string;
  card: NoteCoverFrame;
  /** Reserved for the future cover page; v1 does not accept or render it. */
  page?: never;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNoteCover(value: unknown): value is NoteCover {
  if (!record(value) || typeof value.assetId !== 'string' || !value.assetId.trim()
    || value.page !== undefined) return false;
  return isNoteCoverFrame(value.card);
}

export function isNoteCoverFrame(value: unknown): value is NoteCoverFrame {
  if (!record(value) || !record(value.crop)) return false;
  const { x, y, width, height } = value.crop;
  if (![x, y, width, height, value.zoom].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return false;
  return (x as number) >= 0 && (y as number) >= 0
    && (x as number) <= 100 && (y as number) <= 100
    && (width as number) > 0 && (width as number) <= 100
    && (height as number) > 0 && (height as number) <= 100
    && (x as number) + (width as number) <= 100 + 1e-6
    && (y as number) + (height as number) <= 100 + 1e-6
    && (value.zoom as number) >= 1;
}

/** Projection reads only the explicit binding slot, never media content. */
export function readNoteCover(metadata: unknown): NoteCover | null {
  if (!record(metadata) || !record(metadata.binding)) return null;
  return isNoteCover(metadata.binding.cover) ? metadata.binding.cover : null;
}
