// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { placeAnnotationStamp, type StampRect, type StampSide } from './annotationStampPlacement';

const anchor = { left: 80, top: 80, width: 40, height: 20 };
const size = { width: 30, height: 10 };
const bounds = { left: 0, top: 0, width: 200, height: 200 };
const topBlocker = { left: 0, top: 65, width: 200, height: 15 };
const bottomBlocker = { left: 0, top: 100, width: 200, height: 15 };
const leftBlocker = { left: 45, top: 0, width: 35, height: 200 };
const rightBlocker = { left: 120, top: 0, width: 35, height: 200 };

function place(options: Partial<Parameters<typeof placeAnnotationStamp>[0]> = {}) {
  return placeAnnotationStamp({ anchor, size, bounds, obstacles: [], occupied: [], ...options });
}

function intersects(a: StampRect, b: StampRect) {
  return a.left < b.left + b.width && a.left + a.width > b.left
    && a.top < b.top + b.height && a.top + a.height > b.top;
}

describe('annotation stamp placement', () => {
  it.each([
    ['top', [], 80, 68],
    ['bottom', [topBlocker], 80, 102],
    ['left', [topBlocker, bottomBlocker], 48, 80],
    ['right', [topBlocker, bottomBlocker, leftBlocker], 122, 80],
  ] satisfies [StampSide, StampRect[], number, number][])(
    'chooses %s in strict top/bottom/left/right priority', (side, obstacles, left, top) => {
      const result = place({ obstacles });
      expect(result).toEqual({ left, top, ...size, side });
      expect(obstacles.some((rect) => intersects(result!, rect))).toBe(false);
    },
  );

  it('falls below a highlight at the paper top without leaving the page frame', () => {
    expect(place({ anchor: { ...anchor, top: 0 } })).toEqual({ left: 80, top: 22, ...size, side: 'bottom' });
  });

  it('slides along the same side to avoid an unhighlighted body character', () => {
    const character = { left: 85, top: 68, width: 10, height: 10 };
    const result = place({ obstacles: [character] });
    expect(result).toEqual({ left: 95, top: 68, ...size, side: 'top' });
    expect(intersects(result!, character)).toBe(false);
  });

  it('slides before the anchor when that is the nearest clear slot', () => {
    expect(place({ obstacles: [{ left: 105, top: 68, width: 30, height: 10 }] }))
      .toEqual({ left: 75, top: 68, ...size, side: 'top' });
  });

  it('places a peer next to an already placed stamp without overlap', () => {
    const first = place()!;
    const second = place({ occupied: [first] })!;
    expect(second).toEqual({ left: 50, top: 68, ...size, side: 'top' });
    expect(intersects(first, second)).toBe(false);
  });

  it('falls to the next direction when peer stamps occupy every adjacent top slot', () => {
    expect(place({ occupied: [{ left: 49, top: 68, width: 102, height: 10 }] }))
      .toEqual({ left: 80, top: 102, ...size, side: 'bottom' });
  });

  it('keeps a sliding stamp inside the right page boundary', () => {
    expect(place({ anchor: { ...anchor, left: 185, width: 15 } }))
      .toEqual({ left: 170, top: 68, ...size, side: 'top' });
  });

  it('does not slide far from the highlight to unrelated whitespace', () => {
    expect(place({ obstacles: [{ left: 49, top: 65, width: 102, height: 15 }] }))
      .toEqual({ left: 80, top: 102, ...size, side: 'bottom' });
  });

  it('returns no placement when all adjacent directions are full', () => {
    expect(place({ obstacles: [topBlocker, bottomBlocker, leftBlocker, rightBlocker] })).toBeNull();
  });

  it('returns no placement when a badge cannot fit inside the page', () => {
    expect(place({ size: { width: 201, height: 201 } })).toBeNull();
  });

  it('allows edge contact but rejects any positive-area text overlap', () => {
    const character = { left: 110, top: 68, width: 10, height: 10 };
    expect(place({ obstacles: [character] })).toEqual({ left: 80, top: 68, ...size, side: 'top' });
    const nearlyTouching = { ...character, left: 109.999 };
    const result = place({ obstacles: [nearlyTouching] })!;
    expect(intersects(result, nearlyTouching)).toBe(false);
    expect(result.left).toBeCloseTo(79.999);
  });

  it('uses exact fractional edges at a scaled paper size', () => {
    expect(place({
      anchor: { left: 20.25, top: 10.5, width: 12.5, height: 3.75 },
      size: { width: 7.5, height: 2.5 },
      bounds: { left: 0, top: 0, width: 50, height: 50 },
      gap: 0.5,
      obstacles: [{ left: 22.25, top: 7.5, width: 1.25, height: 2.5 }],
    })).toEqual({ left: 23.5, top: 7.5, width: 7.5, height: 2.5, side: 'top' });
  });

  it('is deterministic regardless of obstacle enumeration order', () => {
    const obstacles = [
      { left: 85, top: 68, width: 5, height: 10 },
      { left: 105, top: 68, width: 5, height: 10 },
    ];
    expect(place({ obstacles })).toEqual(place({ obstacles: [...obstacles].reverse() }));
    expect(place({ obstacles })).toEqual(place({ obstacles }));
  });

  it('leaves input rectangles and arrays unchanged', () => {
    const input = Object.freeze({
      anchor: Object.freeze({ ...anchor }),
      size: Object.freeze({ ...size }),
      bounds: Object.freeze({ ...bounds }),
      obstacles: Object.freeze([Object.freeze({ ...topBlocker })]),
      occupied: Object.freeze([Object.freeze({ left: 80, top: 102, ...size })]),
    });
    const before = JSON.stringify(input);
    expect(placeAnnotationStamp(input)?.side).toBe('bottom');
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    { size: { width: 0, height: 10 } },
    { size: { width: Number.NaN, height: 10 } },
    { bounds: { ...bounds, height: Number.POSITIVE_INFINITY } },
    { gap: -1 },
  ])('rejects unusable measured geometry: %j', (options) => {
    expect(place(options)).toBeNull();
  });
});
