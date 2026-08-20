// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  applyCanvasLayoutsToBlocks,
} from './canvasObjectRepository';
import {
  normalizeCanvasPersistencePayload,
} from './canvasPersistenceNormalizer';
import {
  createSurfaceModePolicy,
  getVisibleBlocksForSurface,
} from './modePolicyService';
import {
  buildLayoutPayload,
  projectPageFrameLocalLayoutToCanvasLayout,
} from './placementService';
import {
  DEFAULT_PAGE_CONTENT_WIDTH,
  type BlockBoxLayout,
} from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';
import type { PageFrameModel } from './types';

const PAGE_OFFSET_X = 0;

const persistedEntityPageFrame: PageFrameModel = {
  id: 'persisted-page-frame-1',
  role: 'primary_page_frame',
  exportable: true,
  x: 0,
  y: 0,
  width: 904,
  height: 1278,
  contentInset: {
    top: 0,
    right: 72,
    bottom: 96,
    left: 72,
  },
};

function blockFixture(id: string): NoteBlock {
  return {
    id,
    placement_id: `placement-${id}`,
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: { body: 'fixture' },
    plain_text: 'fixture',
    metadata: {},
    order_index: 0,
    source_references: [],
  };
}

function runSurfacePersistenceChain(blockId: string, localLayout: BlockBoxLayout) {
  const block = blockFixture(blockId);
  const projected = projectPageFrameLocalLayoutToCanvasLayout({
    layout: localLayout,
    pageFrame: persistedEntityPageFrame,
    pageOffsetX: PAGE_OFFSET_X,
  });
  const payload = buildLayoutPayload(projected);
  const hydratedPayload = normalizeCanvasPersistencePayload({
    blockLayouts: [{
      placement_id: block.placement_id,
      block_id: block.id,
      layout: payload,
    }],
  });
  const hydratedBlocks = applyCanvasLayoutsToBlocks([block], hydratedPayload.blockLayouts);
  const pageVisibleBlocks = getVisibleBlocksForSurface(
    hydratedBlocks,
    createSurfaceModePolicy('page'),
    DEFAULT_PAGE_CONTENT_WIDTH,
  );

  return { projected, payload, pageVisibleBlocks };
}

describe('Page surface persistence contract', () => {
  it('keeps default Page-local layout formal and Page-visible across projection, payload, and hydrate', () => {
    expect({
      frameX: persistedEntityPageFrame.x,
      contentInsetLeft: persistedEntityPageFrame.contentInset.left,
      pageOffsetX: PAGE_OFFSET_X,
    }).toEqual({ frameX: 0, contentInsetLeft: 72, pageOffsetX: 0 });

    const result = runSurfacePersistenceChain('default-page-block', {
      x: 0,
      y: 0,
      width: DEFAULT_PAGE_CONTENT_WIDTH,
      height: 72,
      surface: 'formal_page',
    });

    expect(result.projected).toMatchObject({ x: 72, width: 760, surface: 'formal_page' });
    expect({
      payloadSurface: result.payload.surface,
      pageVisibleBlockIds: result.pageVisibleBlocks.map((block) => block.id),
    }).toEqual({
      payloadSurface: 'formal_page',
      pageVisibleBlockIds: ['default-page-block'],
    });
  });

  it('reclassifies a truly out-of-Page layout even when its explicit surface is stale', () => {
    const result = runSurfacePersistenceChain('outside-page-block', {
      x: DEFAULT_PAGE_CONTENT_WIDTH + 24,
      y: 0,
      width: 120,
      height: 72,
      surface: 'formal_page',
    });

    expect(result.projected.surface).toBe('formal_page');
    expect(result.payload.surface).toBe('canvas_workspace');
    expect(result.pageVisibleBlocks).toEqual([]);
  });
});
