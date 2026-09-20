/** Percentages within the image's bounding box after its quarter-turn rotation. */
export interface MediaImageCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MediaImageRotation = 0 | 90 | 180 | 270;

/** Absent/null edit_v1 leaves legacy media untouched and needs no migration. */
export interface MediaImageEditV1 {
  /** Explicit crop is the rendered window; zoom is not applied a second time. */
  crop: MediaImageCrop | null;
  /** Editor pose; with crop=null, centers this zoom or shows the full image for null. */
  zoom: number | null;
  rotation: MediaImageRotation;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isMediaImageEditV1(value: unknown): value is MediaImageEditV1 {
  if (!record(value) || Object.keys(value).some((key) => !['crop', 'zoom', 'rotation'].includes(key))) return false;
  if (![0, 90, 180, 270].includes(value.rotation as number)) return false;
  if (value.zoom !== null && (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom)
    || value.zoom < 1 || value.zoom > 3)) return false;
  if (value.crop === null) return true;
  if (!record(value.crop) || Object.keys(value.crop).some((key) => !['x', 'y', 'w', 'h'].includes(key))) return false;
  const { x, y, w, h } = value.crop;
  if (![x, y, w, h].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return false;
  return (x as number) >= 0 && (y as number) >= 0 && (x as number) <= 100 && (y as number) <= 100
    && (w as number) > 0 && (h as number) > 0 && (w as number) <= 100 && (h as number) <= 100
    && (x as number) + (w as number) <= 100 + 1e-7
    && (y as number) + (h as number) <= 100 + 1e-7;
}
