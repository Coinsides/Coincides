import { describe, expect, it } from 'vitest';
import type { PageFrameModel } from './types';
import {
  getPageFramePhysicalMapping,
  normalizePageFramePrintBaseline,
  PAGE_FRAME_PRINT_PRESETS,
} from './pageFramePrintScaleService';
import { normalizePageFrameCollection } from './pageFrameCollectionService';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';

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

  it.each(['A4', 'Letter'] as const)('keeps explicit shorter %s geometry through collection normalization and pagination', (pageSize) => {
    const frame: PageFrameModel = { ...historicalFrame, pageSize, width: 700, height: 400,
      contentInset: { top: 30, right: 42, bottom: 40, left: 24 } };
    expect(normalizePageFramePrintBaseline(frame)).toEqual(frame);
    expect(normalizePageFramePrintBaseline(normalizePageFramePrintBaseline(frame))).toEqual(frame);
    const collection = normalizePageFrameCollection({ pageFrames: [frame], primaryFrameId: frame.id });
    expect(collection.pageFrames[0]!.height).toBe(400);
    const plan = resolveDocumentPageFlowPlan({ collection, blocks: [{ blockId: 'short-page-content', kind: 'text',
      text: '一二三四五六', layout: { x: 0, y: 0, width: 999, height: 600,
        width_mode: 'auto', coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: frame.id } }],
    measureTextLines: ({ text, startOffset = 0 }) => ({ lines: Array.from(text.slice(startOffset), (_, index) => ({
      startOffset: startOffset + index, endOffset: startOffset + index + 1, widthPx: 20, heightPx: 100,
    })) }) });
    expect(plan.fragments.map((fragment) => fragment.textRange)).toEqual([{ start: 0, end: 3 }, { start: 3, end: 6 }]);
    expect(plan.frames.map((page) => page.frame.height)).toEqual([400, 400]);
  });
});
