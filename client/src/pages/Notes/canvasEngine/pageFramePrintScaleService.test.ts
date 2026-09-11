import { describe, expect, it } from 'vitest';
import type { PageFrameModel } from './types';
import {
  getPageFramePhysicalMapping,
  normalizePageFramePrintBaseline,
  PAGE_FRAME_PRINT_PRESETS,
} from './pageFramePrintScaleService';

const historicalFrame: PageFrameModel = {
  id: 'historical-frame', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1400,
  contentInset: { top: 0, right: 200, bottom: 110, left: 24 },
};

describe('historical page frame print baseline', () => {
  it('fills pageSize without replacing live walls or mutating the input', () => {
    const before = JSON.stringify(historicalFrame);
    const normalized = normalizePageFramePrintBaseline(historicalFrame);
    expect(normalized.pageSize).toBe('A4');
    expect(normalized.contentInset).toEqual(historicalFrame.contentInset);
    expect(JSON.stringify(historicalFrame)).toBe(before);
    expect(normalizePageFramePrintBaseline(normalized)).toEqual(normalized);
  });

  it('fills only absent inset edges and preserves valid zero and asymmetric values', () => {
    const partial = {
      ...historicalFrame, contentInset: { top: 0, left: 24 },
    } as PageFrameModel;
    expect(normalizePageFramePrintBaseline(partial).contentInset).toEqual({
      top: 0, left: 24,
      right: PAGE_FRAME_PRINT_PRESETS.A4.contentInset.right,
      bottom: PAGE_FRAME_PRINT_PRESETS.A4.contentInset.bottom,
    });
  });

  it('keeps current A4 and Custom geometry and physical scale independent of wall position', () => {
    for (const pageSize of ['A4', 'Custom'] as const) {
      const frame = { ...historicalFrame, pageSize };
      const normalized = normalizePageFramePrintBaseline(frame);
      expect(normalized).toEqual(frame);
      expect(getPageFramePhysicalMapping(pageSize, normalized.width))
        .toEqual(getPageFramePhysicalMapping(pageSize, frame.width));
    }
  });
});
