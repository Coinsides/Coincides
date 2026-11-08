import { describe, expect, it } from 'vitest';
import type { SourcePage, SourcePageRegister } from '@/pages/Sources/sourceApi';
import { SOURCE_PAGE_GAP, sourcePageAtScroll, sourcePageLayout } from './sourcePageLayout';

const page = (page_number: number, image_width = 1240, image_height = 1754): SourcePage => ({
  page_number, asset_id: `asset-${page_number}`, image_width, image_height, pdf_width: 595, pdf_height: 842,
});
const register = (input: Partial<SourcePageRegister>): SourcePageRegister => ({
  source_id: 'source', supported: true, status: 'complete', expected: 0, completed: 0, failed_pages: [], pages: [], ...input,
});

describe('original page layout', () => {
  it('keeps each page at its own shape, including a landscape page', () => {
    const layout = sourcePageLayout(register({ expected: 2, pages: [page(1), page(2, 1240, 620)] }), 800);
    expect(layout.slots[0].height).toBeCloseTo(800 * (1754 / 1240));
    expect(layout.slots[1].height).toBeCloseTo(400);
    expect(layout.slots[1].top).toBeCloseTo(layout.slots[0].height + SOURCE_PAGE_GAP);
    expect(layout.height).toBeCloseTo(layout.slots[1].top + 400);
  });

  it('fits a large picture to the page width and never enlarges a small one', () => {
    const large = sourcePageLayout(register({ expected: 1, pages: [page(1, 6000, 4000)] }), 800).slots[0];
    expect([large.width, large.height]).toEqual([800, 800 * (4000 / 6000)]);
    const small = sourcePageLayout(register({ expected: 1, pages: [page(1, 300, 200)] }), 800).slots[0];
    expect([small.width, small.height]).toEqual([300, 200]);
    const tall = sourcePageLayout(register({ expected: 1, pages: [page(1, 400, 4000)] }), 800).slots[0];
    expect([tall.width, tall.height]).toEqual([400, 4000]);
  });

  it('reserves a slot for every expected page and marks what is missing or failed', () => {
    const { slots } = sourcePageLayout(register({ status: 'failed', expected: 3, failed_pages: [2], pages: [page(1, 1000, 500)] }), 800);
    expect(slots.map((slot) => [slot.pageNumber, Boolean(slot.page), slot.failed])).toEqual([
      [1, true, false], [2, false, true], [3, false, true],
    ]);
    expect(slots[1].height).toBeCloseTo(400);
    const running = sourcePageLayout(register({ status: 'partial', expected: 3, failed_pages: [2], pages: [page(1)] }), 800).slots;
    expect(running.map((slot) => slot.failed)).toEqual([false, true, false]);
  });

  it('caps the page width and has no slots before the register is known', () => {
    expect(sourcePageLayout(register({ expected: 1, pages: [page(1)] }), 5000).pageWidth).toBe(904);
    expect(sourcePageLayout(null, 800).slots).toEqual([]);
  });

  it('reports the page at the reading line', () => {
    const { slots } = sourcePageLayout(register({ expected: 3, pages: [page(1, 100, 100), page(2, 100, 100), page(3, 100, 100)] }), 500);
    expect(sourcePageAtScroll(slots, 0)).toBe(1);
    expect(sourcePageAtScroll(slots, slots[1].top + 24)).toBe(2);
    expect(sourcePageAtScroll(slots, slots[2].top + 200)).toBe(3);
    expect(sourcePageAtScroll([], 100)).toBe(1);
  });
});
