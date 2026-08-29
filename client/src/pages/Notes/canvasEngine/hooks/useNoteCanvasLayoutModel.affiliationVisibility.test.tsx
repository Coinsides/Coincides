import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import {
  createRuntimePageFrame,
} from '../pageFrameService';
import {
  DEFAULT_PAGE_FRAME_CONTENT_INSET,
  DEFAULT_PAGE_FRAME_HEIGHT,
} from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import {
  createDefaultDocumentTypographyProfile,
} from '../typographyProfileService';
import type { PageFrameModel } from '../types';
import { useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';

function blockFixture(
  id: string,
  layout: NonNullable<NoteBlock['canvas_layout']>,
): NoteBlock {
  return {
    id,
    placement_id: `placement-${id}`,
    display_overrides_json: {},
    canvas_layout: layout,
    block_type: 'text',
    title: null,
    content_json: { body: '' },
    plain_text: '',
    metadata: {},
    order_index: 0,
    source_references: [],
  };
}

function renderPageLayout(blocks: NoteBlock[], pageFrames: PageFrameModel[]) {
  return renderHook(() => useNoteCanvasResolvedLayoutModel({
    contentWidth: 760,
    documentTypographyProfile: createDefaultDocumentTypographyProfile(),
    layoutDrafts: {},
    sortedBlocks: blocks,
    surfaceMode: 'page',
    surfacePolicy: createSurfaceModePolicy('page'),
    pageFrames,
  }));
}

describe('Page-mode geometry-derived workspace visibility', () => {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });

  it('K-1 shows a Canvas-created block whose center is inside the PageFrame outer boundary', () => {
    const outerMarginBlock = blockFixture('outer-margin-canvas-block', {
      x: pageFrame.x + 12,
      y: pageFrame.y + 120,
      width: 40,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
    });

    const { result } = renderPageLayout([outerMarginBlock], [pageFrame]);

    expect(result.current.visibleBlocks.map((block) => block.id)).toEqual([
      outerMarginBlock.id,
    ]);
  });

  it('K-2 preserves an overflowing affiliated rect and excludes a workspace-only control', () => {
    const persistedCrossingRect = {
      x: pageFrame.x - 40,
      y: pageFrame.y + 160,
      width: 120,
      height: 80,
    };
    const crossingBlock = blockFixture('outer-crossing-canvas-block', {
      ...persistedCrossingRect,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
    });
    const workspaceOnlyBlock = blockFixture('workspace-only-canvas-block', {
      x: pageFrame.x + pageFrame.width + 240,
      y: pageFrame.y + 160,
      width: 120,
      height: 80,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'outside',
    });

    const { result } = renderPageLayout(
      [crossingBlock, workspaceOnlyBlock],
      [pageFrame],
    );

    expect(result.current.visibleBlocks.map((block) => block.id)).toEqual([
      crossingBlock.id,
    ]);
    expect(result.current.blockLayouts[crossingBlock.id]).toMatchObject(
      persistedCrossingRect,
    );
    expect(result.current.blockLayouts[workspaceOnlyBlock.id]).toBeUndefined();
    expect(crossingBlock.canvas_layout).toMatchObject({
      ...persistedCrossingRect,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
    });
  });
});
