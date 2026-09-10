import { describe, expect, it } from 'vitest';
import { BOARD_SNAP_THRESHOLD_PX, snapBoardTranslation } from './boardSnapping';

describe('board object alignment snapping', () => {
  it('snaps an edge and extends its guide across both objects', () => {
    const result = snapBoardTranslation({ x: 0, y: 0, w: 100, h: 60 }, { x: 94, y: 10 },
      [{ x: 200, y: 300, w: 80, h: 100 }], 1);
    expect(BOARD_SNAP_THRESHOLD_PX).toBe(6);
    expect(result.delta).toEqual({ x: 100, y: 10 });
    expect(result.guides).toEqual([{ axis: 'x', position: 200, start: 2, end: 408 }]);
  });

  it('aligns centers independently on each axis and uses the final snapped bounds for guides', () => {
    const result = snapBoardTranslation({ x: 0, y: 0, w: 80, h: 60 }, { x: 58, y: 168 }, [
      { x: 50, y: 400, w: 100, h: 80 },
      { x: 500, y: 140, w: 100, h: 120 },
    ], 1);
    expect(result.delta).toEqual({ x: 60, y: 170 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 100, start: 162, end: 488 },
      { axis: 'y', position: 200, start: 52, end: 608 },
    ]);
  });

  it('allows a moving edge to align with another object center', () => {
    const result = snapBoardTranslation({ x: 0, y: 0, w: 80, h: 40 }, { x: 216, y: 0 },
      [{ x: 200, y: 300, w: 40, h: 70 }], 1);
    expect(result.delta).toEqual({ x: 220, y: 0 });
    expect(result.guides[0]).toMatchObject({ axis: 'x', position: 220 });
  });

  it.each([0.5, 2])('uses an inclusive six screen pixel threshold at zoom %s', (zoom) => {
    const primary = { x: 0, y: 0, w: 100, h: 40 };
    const targets = [{ x: 300, y: 400, w: 100, h: 40 }];
    const threshold = 6 / zoom;
    expect(snapBoardTranslation(primary, { x: 200 - threshold, y: 0 }, targets, zoom).delta.x).toBe(200);
    const outside = { x: 200 - threshold - 0.01, y: 0 };
    expect(snapBoardTranslation(primary, outside, targets, zoom)).toEqual({ delta: outside, guides: [] });
  });

  it('takes the closest alignment even when a farther target is earlier', () => {
    const result = snapBoardTranslation({ x: 0, y: 0, w: 40, h: 40 }, { x: 100, y: 0 }, [
      { x: 105, y: 300, w: 100, h: 40 },
      { x: 98, y: 500, w: 100, h: 40 },
    ], 1);
    expect(result.delta).toEqual({ x: 98, y: 0 });
    expect(result.guides).toEqual([{ axis: 'x', position: 98, start: -8, end: 548 }]);
  });

  it('keeps target order and then edge/center point order for exact ties', () => {
    const primary = { x: 0, y: 0, w: 40, h: 40 };
    const first = { x: 98, y: 300, w: 100, h: 40 };
    const second = { x: 102, y: 500, w: 100, h: 40 };
    expect(snapBoardTranslation(primary, { x: 100, y: 0 }, [first, second], 1).delta.x).toBe(98);
    expect(snapBoardTranslation(primary, { x: 100, y: 0 }, [second, first], 1).delta.x).toBe(102);
    const pointTie = snapBoardTranslation({ x: 0, y: 0, w: 4, h: 40 }, { x: 100, y: 0 },
      [{ x: 99, y: 300, w: 4, h: 40 }], 1);
    expect(pointTie.delta.x).toBe(99);
    expect(pointTie.guides[0].position).toBe(99);
  });

  it('aligns negative world coordinates without changing dimensions or input objects', () => {
    const primary = Object.freeze({ x: -300, y: -200, w: 80, h: 40 });
    const delta = Object.freeze({ x: 16, y: 27 });
    const targets = Object.freeze([Object.freeze({ x: -200, y: -100, w: 120, h: 80 })]);
    expect(snapBoardTranslation(primary, delta, targets, 1)).toEqual({
      delta: { x: 20, y: 27 },
      guides: [{ axis: 'x', position: -200, start: -181, end: -12 }],
    });
    expect(primary).toEqual({ x: -300, y: -200, w: 80, h: 40 });
    expect(delta).toEqual({ x: 16, y: 27 });
  });

  it('leaves free translation unchanged when no targets exist', () => {
    expect(snapBoardTranslation({ x: 0, y: 0, w: 80, h: 40 }, { x: 23, y: -19 }, [], 1)).toEqual({
      delta: { x: 23, y: -19 }, guides: [],
    });
  });
});
