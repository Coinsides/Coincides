import type { MediaImageCrop, MediaImageEditV1, MediaImageRotation } from '@shared/types';
import {
  coverFitSize, coverPositionToCrop, type CoverSize,
} from '../../Courses/noteCover/geometry';

export function rotatedMediaSize(image: CoverSize, rotation: MediaImageRotation): CoverSize {
  return rotation === 90 || rotation === 270
    ? { width: image.height, height: image.width } : image;
}

/** Percentages are in the clockwise-rotated image's bounding box, not paper pixels. */
export function mediaImageCrop(edit: MediaImageEditV1 | null | undefined, image: CoverSize, aspectRatio?: number): MediaImageCrop {
  if (edit?.crop) return edit.crop;
  if (edit?.zoom == null) return { x: 0, y: 0, w: 100, h: 100 };
  const rotated = rotatedMediaSize(image, edit.rotation);
  const viewport = { width: aspectRatio ?? rotated.width / rotated.height, height: 1 };
  const crop = coverPositionToCrop({ x: 0, y: 0 }, coverFitSize(rotated, viewport), viewport, edit.zoom);
  return { x: crop.x, y: crop.y, w: crop.width, h: crop.height };
}

/** This is only a quarter-turn coordinate transform; cover geometry owns cropping. */
export function rotateMediaCrop(crop: MediaImageCrop): MediaImageCrop {
  return { x: Math.max(0, 100 - crop.y - crop.h), y: crop.x, w: crop.h, h: crop.w };
}

export function mediaImageGeometry(edit: MediaImageEditV1, image: CoverSize) {
  const rotated = rotatedMediaSize(image, edit.rotation);
  const crop = mediaImageCrop(edit, image);
  const transform = {
    0: '',
    90: `translate(${image.height} 0) rotate(90)`,
    180: `translate(${image.width} ${image.height}) rotate(180)`,
    270: `translate(0 ${image.width}) rotate(270)`,
  }[edit.rotation];
  const window = { x: crop.x * rotated.width / 100, y: crop.y * rotated.height / 100,
    width: crop.w * rotated.width / 100, height: crop.h * rotated.height / 100 };
  return {
    crop,
    transform,
    window,
    viewBox: [window.x, window.y, window.width, window.height].join(' '),
  };
}
