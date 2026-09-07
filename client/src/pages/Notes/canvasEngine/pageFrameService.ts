import { createPrimaryPageFrame } from './engineModel';
import {
  DEFAULT_BLOCK_GAP,
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  DEFAULT_PAGE_FRAME_CONTENT_INSET,
  DEFAULT_PAGE_FRAME_HEIGHT,
  PAGE_FRAME_BOTTOM_PADDING,
  type BlockBoxLayout,
} from './runtimeLayout';
import type { CanvasRect, CanvasViewport, PageFrameModel } from './types';

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
  contentX,
  height,
}: {
  contentX: number;
  height: number;
}): PageFrameModel {
  return createPrimaryPageFrame({
    x: contentX - DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    y: 0,
    width: DEFAULT_PAGE_CONTENT_WIDTH
      + DEFAULT_PAGE_FRAME_CONTENT_INSET.left
      + DEFAULT_PAGE_FRAME_CONTENT_INSET.right,
    height,
    contentInset: DEFAULT_PAGE_FRAME_CONTENT_INSET,
  });
}

export function getPageFrameOuterRect(pageFrame: PageFrameModel): CanvasRect {
  return {
    x: pageFrame.x,
    y: pageFrame.y,
    width: pageFrame.width,
    height: pageFrame.height,
  };
}

export function getPageFrameContentRect(pageFrame: PageFrameModel): CanvasRect {
  return {
    x: pageFrame.x + pageFrame.contentInset.left,
    y: pageFrame.y + pageFrame.contentInset.top,
    width: Math.max(0, pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right),
    height: Math.max(0, pageFrame.height - pageFrame.contentInset.top - pageFrame.contentInset.bottom),
  };
}

export function resolvePrimaryPageFrame({
  pageFrames,
  requestedPrimaryFrameId,
}: {
  pageFrames: PageFrameModel[];
  requestedPrimaryFrameId?: string | null;
}): PageFrameModel | null {
  if (pageFrames.length === 0) return null;
  if (requestedPrimaryFrameId) {
    const requested = pageFrames.find((pageFrame) => pageFrame.id === requestedPrimaryFrameId);
    if (requested) return requested;
  }
  if (pageFrames.length === 1) return pageFrames[0];
  return pageFrames[0];
}

export function resolvePrimaryPageFrameAfterDelete({
  pageFrames,
  currentPrimaryFrameId,
  deletedFrameId,
}: {
  pageFrames: PageFrameModel[];
  currentPrimaryFrameId?: string | null;
  deletedFrameId: string;
}): PageFrameModel | null {
  const remaining = pageFrames.filter((pageFrame) => pageFrame.id !== deletedFrameId);
  if (remaining.length === 0) return null;
  if (currentPrimaryFrameId && currentPrimaryFrameId !== deletedFrameId) {
    const current = remaining.find((pageFrame) => pageFrame.id === currentPrimaryFrameId);
    if (current) return current;
  }
  return remaining[0];
}

export function createPageModeFocusViewport({
  pageFrame,
  viewport,
  presentationViewport,
}: {
  pageFrame: PageFrameModel;
  viewport: CanvasViewport;
  presentationViewport?: CanvasViewport;
}): CanvasViewport {
  // Page display is measured independently of the canvas pan/zoom controller.
  if (presentationViewport) return presentationViewport;
  const contentRect = getPageFrameContentRect(pageFrame);
  return {
    ...viewport,
    x: contentRect.x,
    y: contentRect.y,
    width: contentRect.width,
    height: Math.min(viewport.height, contentRect.height),
    zoom: 1,
  };
}
