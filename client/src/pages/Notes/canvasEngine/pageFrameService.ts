import { createPrimaryPageFrame } from './engineModel';
import {
  DEFAULT_BLOCK_GAP,
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  DEFAULT_PAGE_FRAME_HEIGHT,
  PAGE_FRAME_BOTTOM_PADDING,
  type BlockBoxLayout,
} from './runtimeLayout';
import type { PageFrameModel } from './types';

function isInsidePrimaryPageFrame(layout: Pick<BlockBoxLayout, 'x' | 'width'>): boolean {
  return layout.x < DEFAULT_PAGE_CONTENT_WIDTH && layout.x + layout.width > 0;
}

export function createDefaultDraftLayout(
  blockLayouts: Record<string, BlockBoxLayout>,
  contentWidth: number,
): BlockBoxLayout {
  const bottoms = Object.values(blockLayouts)
    .filter(isInsidePrimaryPageFrame)
    .map((layout) => layout.y + layout.height);
  const y = bottoms.length > 0 ? Math.max(...bottoms) + DEFAULT_BLOCK_GAP : 0;
  const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth);

  return { x: 0, y, width, height: DEFAULT_BLOCK_HEIGHT };
}

export function calculatePageFrameHeight({
  blockLayouts,
  draftActive,
  draftLayout,
  defaultDraftLayout,
}: {
  blockLayouts: Record<string, BlockBoxLayout>;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  defaultDraftLayout: BlockBoxLayout;
}): number {
  const pageBlockBottoms = Object.values(blockLayouts)
    .filter(isInsidePrimaryPageFrame)
    .map((layout) => layout.y + layout.height);
  const effectiveDraftLayout = draftLayout || defaultDraftLayout;
  const draftBottom = draftActive && isInsidePrimaryPageFrame(effectiveDraftLayout)
    ? effectiveDraftLayout.y + effectiveDraftLayout.height
    : 0;
  const contentBottom = Math.max(0, ...pageBlockBottoms, draftBottom);

  return Math.max(DEFAULT_PAGE_FRAME_HEIGHT, contentBottom + PAGE_FRAME_BOTTOM_PADDING);
}

export function createRuntimePageFrame({
  x,
  height,
}: {
  x: number;
  height: number;
}): PageFrameModel {
  return createPrimaryPageFrame({
    x,
    y: 0,
    width: DEFAULT_PAGE_CONTENT_WIDTH,
    height,
  });
}
