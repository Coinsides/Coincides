import { describe, expect, it } from 'vitest';
import { buildDefaultBlockLayouts, normalizeBlockLayout, normalizeResolvedBlockLayout } from './placementService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

const frame: PageFrameModel = {
  id: 'width-frame', role: 'primary_page_frame', exportable: true,
  x: 123, y: 987, width: 904, height: 1279,
  contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
};

describe.each(['stored', 'resolved'] as const)('%s auto width normalization', (entry) => {
  it.each([
    { name: 'HQ remainder', x: 88, contentWidth: 760, frameWidth: 904, expected: 672 },
    { name: 'narrow render hint', x: 88, contentWidth: 500, frameWidth: 904, expected: 500 },
    { name: 'narrow frame', x: 88, contentWidth: 760, frameWidth: 644, expected: 412 },
    { name: 'negative F1 coordinate', x: -20, contentWidth: 760, frameWidth: 904, expected: 760 },
    { name: 'remainder below minimum', x: 744, contentWidth: 760, frameWidth: 904, expected: 16 },
    { name: 'exhausted remainder', x: 780, contentWidth: 760, frameWidth: 904, expected: 0 },
  ])('uses $name before measuring height and retains coordinates', ({ x, contentWidth, frameWidth, expected }) => {
    const layout: BlockBoxLayout = {
      x, y: -12.25, width: 672, height: 44, surface: 'formal_page',
      coordinate_space: 'page_frame_local', frame_id: frame.id,
    };
    const block = { id: 'width-block', canvas_layout: { ...layout } };
    const measuredWidths: number[] = [];
    const estimateHeight = (_block: typeof block, width: number) => {
      measuredWidths.push(width);
      return 100;
    };
    const options = {
      block, contentWidth, surfaceMode: 'page' as const, estimateHeight, contract: 'v2' as const,
      // The matching frame, not the first frame, supplies the remaining width.
      pageFrames: [{ ...frame, id: 'other-frame', width: 1200 }, { ...frame, width: frameWidth }],
    };
    const normalized = entry === 'stored'
      ? normalizeBlockLayout({ ...options, fallback: buildDefaultBlockLayouts([block], contentWidth, () => 44)[block.id] })
      : normalizeResolvedBlockLayout({ ...options, layout });
    expect(normalized).toMatchObject({ x, y: -12.25, width: expected, height: 100, frame_id: frame.id });
    expect(measuredWidths).toEqual([expected]);
    expect(block.canvas_layout).toEqual(layout);
  });
});
