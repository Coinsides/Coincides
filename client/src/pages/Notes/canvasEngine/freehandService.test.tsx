import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { hitTestPaperInk } from './freehandService';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each([0.5, 1, 2])('uses 8 screen pixels at scale %s and restores query geometry', scale => {
  const { container } = render(<div><svg><path data-paper-ink-hit="thin" data-paper-ink-width="1" strokeWidth={16} /></svg></div>);
  const host = container.firstElementChild as HTMLElement;
  const path = host.querySelector('path')!;
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 500, bottom: 500 } as DOMRect);
  vi.stubGlobal('DOMPoint', class {
    constructor(public x: number, public y: number) {}
    matrixTransform() { return { x: this.x / scale, y: this.y / scale }; }
  });
  const widths: number[] = [];
  Object.defineProperties(path, {
    getScreenCTM: { value: () => ({ a: scale, b: 0, inverse: () => ({}) }) },
    isPointInStroke: { value: (point: { y: number }) => {
      const width = Number(path.getAttribute('stroke-width'));
      widths.push(width);
      return Math.abs(point.y - 100 / scale) <= width / 2;
    } },
  });
  expect(hitTestPaperInk(host, { clientX: 100, clientY: 107.9 })).toBe('thin');
  expect(hitTestPaperInk(host, { clientX: 100, clientY: 108.1 })).toBeNull();
  expect(widths).toEqual([16 / scale, 16 / scale]);
  expect(path.getAttribute('stroke-width')).toBe('16');
  expect(hitTestPaperInk(host, { clientX: -1, clientY: 100 })).toBeNull();
});
