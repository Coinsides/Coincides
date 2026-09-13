import { describe, expect, it } from 'vitest';
import { NOTE_CARD_COVER_ASPECT_RATIO } from '@shared/types';
import { centeredCoverCrop, clampCoverPosition, clampCoverZoom, coverFitSize, coverPositionToCrop, coverViewport } from './geometry';

describe('note card cover geometry', () => {
  it('uses the one shared 2:1 viewport at any card width', () => {
    expect(NOTE_CARD_COVER_ASPECT_RATIO).toBe(2);
    expect(coverViewport(320)).toEqual({ width: 320, height: 160 });
    expect(coverViewport(710)).toEqual({ width: 710, height: 355 });
  });

  it.each([
    [{ width: 1600, height: 400 }, { width: 1200, height: 300 }],
    [{ width: 400, height: 1600 }, { width: 600, height: 2400 }],
    [{ width: 32, height: 16 }, { width: 600, height: 300 }],
    [{ width: 800, height: 800 }, { width: 600, height: 600 }],
  ])('cover fit covers both axes and preserves the source ratio: %j', (image, expected) => {
    const fitted = coverFitSize(image, coverViewport(600));
    expect(fitted).toEqual(expected);
    expect(fitted.width / fitted.height).toBeCloseTo(image.width / image.height, 12);
    expect(fitted.width).toBeGreaterThanOrEqual(600);
    expect(fitted.height).toBeGreaterThanOrEqual(300);
  });

  it('makes 1 the zoom lower bound and clamps the visible slider upper bound', () => {
    expect(clampCoverZoom(-2)).toBe(1);
    expect(clampCoverZoom(0.8)).toBe(1);
    expect(clampCoverZoom(2.3)).toBe(2.3);
    expect(clampCoverZoom(12)).toBe(3);
    expect(clampCoverZoom(5, 6)).toBe(5);
  });

  it('stops at each wall and cannot drag the fitted axis at zoom 1', () => {
    const frame = coverViewport(600);
    const wide = coverFitSize({ width: 1600, height: 400 }, frame);
    expect(clampCoverPosition({ x: 9999, y: -9999 }, wide, frame, 1)).toEqual({ x: 300, y: 0 });
    expect(clampCoverPosition({ x: -9999, y: 9999 }, wide, frame, 1)).toEqual({ x: -300, y: 0 });
    const portrait = coverFitSize({ width: 400, height: 1600 }, frame);
    expect(clampCoverPosition({ x: 9999, y: -9999 }, portrait, frame, 1)).toEqual({ x: 0, y: -1050 });
  });

  it('reclamps a previously zoomed drag when the slider returns to cover fit', () => {
    const frame = coverViewport(600);
    const media = coverFitSize({ width: 1600, height: 400 }, frame);
    expect(clampCoverPosition({ x: 800, y: -200 }, media, frame, 3)).toEqual({ x: 800, y: -200 });
    expect(clampCoverPosition({ x: 800, y: -200 }, media, frame, 1)).toEqual({ x: 300, y: 0 });
  });

  it.each([
    [{ width: 1600, height: 400 }, { x: 25, y: 0, width: 50, height: 100 }],
    [{ width: 400, height: 1600 }, { x: 0, y: 43.75, width: 100, height: 12.5 }],
    [{ width: 1200, height: 600 }, { x: 0, y: 0, width: 100, height: 100 }],
    [{ width: 900, height: 900 }, { x: 0, y: 25, width: 100, height: 50 }],
  ])('stores centered fit as source-image percentages: %j', (image, expected) => {
    expect(centeredCoverCrop(image)).toEqual(expected);
  });

  it('maps the left and right image edges to 0% and 100% without blank pixels', () => {
    const viewport = coverViewport(600);
    const media = coverFitSize({ width: 1600, height: 400 }, viewport);
    expect(coverPositionToCrop({ x: 9999, y: 9999 }, media, viewport, 1)).toEqual({ x: 0, y: 0, width: 50, height: 100 });
    expect(coverPositionToCrop({ x: -9999, y: -9999 }, media, viewport, 1)).toEqual({ x: 50, y: 0, width: 50, height: 100 });
  });

  it('keeps the identical crop when the renderer changes size', () => {
    const source = { width: 1600, height: 400 };
    const small = coverViewport(320);
    const large = coverViewport(960);
    const smallCrop = coverPositionToCrop({ x: 80, y: -20 }, coverFitSize(source, small), small, 2);
    const largeCrop = coverPositionToCrop({ x: 240, y: -60 }, coverFitSize(source, large), large, 2);
    expect(smallCrop).toEqual({ x: 31.25, y: 31.25, width: 25, height: 50 });
    expect(largeCrop).toEqual(smallCrop);
    expect(source.width * smallCrop.width / (source.height * smallCrop.height)).toBe(2);
  });

  it('keeps every tested wall and zoom inside the source for wide and tall images', () => {
    for (const source of [{ width: 4000, height: 73 }, { width: 61, height: 3900 }]) {
      const viewport = coverViewport(517);
      const media = coverFitSize(source, viewport);
      for (const zoom of [1, 1.01, 1.8, 3]) {
        for (const position of [{ x: -10000, y: -10000 }, { x: 0, y: 0 }, { x: 10000, y: 10000 }]) {
          const crop = coverPositionToCrop(position, media, viewport, zoom);
          expect(crop.x).toBeGreaterThanOrEqual(0);
          expect(crop.y).toBeGreaterThanOrEqual(0);
          expect(crop.x + crop.width).toBeLessThanOrEqual(100);
          expect(crop.y + crop.height).toBeLessThanOrEqual(100);
          expect(source.width * crop.width / (source.height * crop.height)).toBeCloseTo(2, 10);
        }
      }
    }
  });
});
