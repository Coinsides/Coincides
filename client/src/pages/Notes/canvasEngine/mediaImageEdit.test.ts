import { describe, expect, it } from 'vitest';
import type { MediaImageEditV1, MediaImageRotation } from '@shared/types';
import { coverFitSize, coverPositionToCrop } from '../../Courses/noteCover/geometry';
import { mediaImageCrop, mediaImageGeometry, rotateMediaCrop, rotatedMediaSize } from './mediaImageEdit';
import { readMediaBlockMetadata } from './mediaBlockService';

const image = { width: 1200, height: 800 };
describe('media image edit geometry', () => {
  it('keeps zero edit and pure rotation at the whole original image', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      expect(mediaImageCrop({ crop: null, zoom: null, rotation }, image, 0.5)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    }
    expect(mediaImageCrop(null, image)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  it.each([0, 90, 180, 270] as MediaImageRotation[])('derives zoom-only %d° crops using the existing cover geometry', (rotation) => {
    const rotated = rotatedMediaSize(image, rotation);
    const viewport = { width: 0.75, height: 1 };
    const cover = coverPositionToCrop({ x: 0, y: 0 }, coverFitSize(rotated, viewport), viewport, 2);
    expect(mediaImageCrop({ crop: null, zoom: 2, rotation }, image, 0.75)).toEqual({
      x: cover.x, y: cover.y, w: cover.width, h: cover.height,
    });
  });

  it('does not multiply zoom into the saved crop and rotates its focal window reversibly', () => {
    const crop = { x: 10, y: 25, w: 40, h: 50 };
    expect(mediaImageCrop({ crop, zoom: 3, rotation: 90 }, image)).toBe(crop);
    expect(rotateMediaCrop(crop)).toEqual({ x: 25, y: 10, w: 50, h: 40 });
    expect(rotateMediaCrop(rotateMediaCrop(rotateMediaCrop(rotateMediaCrop(crop))))).toEqual(crop);
  });

  it.each([
    [0, '120 160 600 320', ''],
    [90, '80 240 400 480', 'translate(800 0) rotate(90)'],
    [180, '120 160 600 320', 'translate(1200 800) rotate(180)'],
    [270, '80 240 400 480', 'translate(0 1200) rotate(270)'],
  ] as const)('interprets %d° in the rotated bounding box', (rotation, viewBox, transform) => {
    expect(mediaImageGeometry({ crop: { x: 10, y: 20, w: 50, h: 40 }, zoom: 2, rotation }, image))
      .toMatchObject({ viewBox, transform });
  });

  it('reads edit metadata without materializing absent values or replacing exact saved parameters', () => {
    const base = { asset_id: 'asset-one', naturalWidth: 1200, naturalHeight: 800 };
    expect(readMediaBlockMetadata({ metadata: { media: base } })).toEqual(base);
    expect(readMediaBlockMetadata({ metadata: { media: { ...base, edit_v1: null } } })?.edit_v1).toBeNull();
    const edit: MediaImageEditV1 = { crop: { x: 12.123456789, y: 25, w: 50, h: 50 }, zoom: 2, rotation: 90 };
    expect(readMediaBlockMetadata({ metadata: { media: { ...base, edit_v1: edit } } })?.edit_v1).toBe(edit);
  });
});
