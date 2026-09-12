import { describe, expect, it } from 'vitest';
import { estimateBlockHeight, estimateBlockHeightForText } from './measurementService';
import { normalizeBlockLayout, normalizeResolvedBlockLayout } from './placementService';
import { deriveFrameLocalAutoWidth } from './placementContractService';
import { supportsTextFlowBlockNavigation } from './textFlowBlockNavigation';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

const frame: PageFrameModel = { id: 'media-page', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1279, contentInset: { left: 72, right: 72, top: 96, bottom: 88 } };
const layout: BlockBoxLayout = { x: 0, y: 80, width: 120, height: 6, width_mode: 'manual',
  coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside' };
const block: NoteBlock = { id: 'short-media', placement_id: 'placement-short-media', block_type: 'media', title: null,
  content_json: {}, plain_text: '', order_index: 0, source_references: [], display_overrides_json: {},
  canvas_layout: { ...layout }, metadata: { media: { asset_id: 'asset-short', naturalWidth: 120, naturalHeight: 6 } } };

describe('NoteBlock media geometry', () => {
  it('uses stored height or natural aspect ratio without text minimum height or text content', () => {
    expect(estimateBlockHeight(block, 120)).toBe(6);
    expect(estimateBlockHeightForText(block, 'A very long text '.repeat(200), 120)).toBe(6);
    expect(estimateBlockHeight({ ...block, canvas_layout: null }, 60)).toBe(3);
    expect(supportsTextFlowBlockNavigation(block)).toBe(false);
  });

  it('keeps small manual images out of auto width and both text sizing normalizers', () => {
    expect(deriveFrameLocalAutoWidth(layout, frame, 'v2')).toBeUndefined();
    const options = { block, contentWidth: 760, surfaceMode: 'page' as const,
      estimateHeight: estimateBlockHeight, contract: 'v2' as const, pageFrames: [frame] };
    expect(normalizeBlockLayout({ ...options, fallback: { ...layout, height: 100 } })).toMatchObject(layout);
    expect(normalizeResolvedBlockLayout({ ...options, layout: { ...layout, height: 2 } })).toMatchObject({
      ...layout, height: 2,
    });
    expect(normalizeResolvedBlockLayout({ ...options, layout: { ...layout, width: 60, height: 3 } })).toMatchObject({
      ...layout, width: 60, height: 3,
    });
  });

  it('preserves a 20 by 10 image below the text block minimum width throughout normalization', () => {
    const smallLayout = { ...layout, width: 20, height: 10 };
    const smallBlock = { ...block, canvas_layout: smallLayout,
      metadata: { media: { asset_id: 'asset-small', naturalWidth: 20, naturalHeight: 10 } } };
    const options = { block: smallBlock, contentWidth: 760, surfaceMode: 'page' as const,
      estimateHeight: estimateBlockHeight, contract: 'v2' as const, pageFrames: [frame] };
    const normalized = normalizeBlockLayout({ ...options, fallback: { ...layout, width: 760, height: 100 } });
    expect(normalized).toMatchObject(smallLayout);
    expect(normalizeResolvedBlockLayout({ ...options, layout: normalized })).toMatchObject(smallLayout);
  });
});
