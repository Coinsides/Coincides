import { clamp } from './geometry';
import {
  getPageFrameContentRect,
  getPageFrameOuterRect,
} from './pageFrameService';
import type {
  CanvasPlacement,
  CanvasRect,
  PageFrameModel,
} from './types';

export const PAGE_FRAME_AFFILIATION_MODE = 'geometry_derived_no_ownership';

export type PageFrameAffiliationKind = 'inside' | 'crossing' | 'workspace_only';
export type PageFrameAffiliationReason = 'center_inside' | 'intersects' | 'outside_all_frames';

export interface PageFrameAffiliation {
  kind: PageFrameAffiliationKind;
  pageFrameId: string | null;
  mode: typeof PAGE_FRAME_AFFILIATION_MODE;
  reason: PageFrameAffiliationReason;
  ownership: 'none';
  exportCandidate: boolean;
}

export interface ClassifyPlacementAgainstPageFrameInput {
  placement: Pick<CanvasPlacement, 'x' | 'y' | 'width' | 'height'>;
  pageFrame: PageFrameModel;
  boundary?: 'content' | 'outer';
}

export interface DerivePlacementPageFrameAffiliationInput {
  placement: Pick<CanvasPlacement, 'x' | 'y' | 'width' | 'height'>;
  pageFrames: PageFrameModel[];
  boundary?: 'content' | 'outer';
}

function placementRect(placement: Pick<CanvasPlacement, 'x' | 'y' | 'width' | 'height'>): CanvasRect {
  return {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  };
}

function rectCenter(rect: CanvasRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function pointInRect(point: { x: number; y: number }, rect: CanvasRect): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

function rectIntersects(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function pageFrameBoundaryRect(
  pageFrame: PageFrameModel,
  boundary: 'content' | 'outer',
): CanvasRect {
  return boundary === 'outer'
    ? getPageFrameOuterRect(pageFrame)
    : getPageFrameContentRect(pageFrame);
}

function workspaceOnlyAffiliation(): PageFrameAffiliation {
  return {
    kind: 'workspace_only',
    pageFrameId: null,
    mode: PAGE_FRAME_AFFILIATION_MODE,
    reason: 'outside_all_frames',
    ownership: 'none',
    exportCandidate: false,
  };
}

export function classifyPlacementAgainstPageFrame({
  placement,
  pageFrame,
  boundary = 'content',
}: ClassifyPlacementAgainstPageFrameInput): PageFrameAffiliation {
  const rect = placementRect(placement);
  const frameRect = pageFrameBoundaryRect(pageFrame, boundary);
  const center = rectCenter(rect);

  if (pointInRect(center, frameRect)) {
    return {
      kind: 'inside',
      pageFrameId: pageFrame.id,
      mode: PAGE_FRAME_AFFILIATION_MODE,
      reason: 'center_inside',
      ownership: 'none',
      exportCandidate: true,
    };
  }

  if (rectIntersects(rect, frameRect)) {
    return {
      kind: 'crossing',
      pageFrameId: pageFrame.id,
      mode: PAGE_FRAME_AFFILIATION_MODE,
      reason: 'intersects',
      ownership: 'none',
      exportCandidate: true,
    };
  }

  return workspaceOnlyAffiliation();
}

export function derivePlacementPageFrameAffiliation({
  placement,
  pageFrames,
  boundary = 'content',
}: DerivePlacementPageFrameAffiliationInput): PageFrameAffiliation {
  const affiliations = pageFrames.map((pageFrame) => classifyPlacementAgainstPageFrame({
    placement,
    pageFrame,
    boundary,
  }));
  return affiliations.find((affiliation) => affiliation.kind === 'inside')
    || affiliations.find((affiliation) => affiliation.kind === 'crossing')
    || workspaceOnlyAffiliation();
}

export function clampCrossingPlacementIntoPageFrameContent({
  placement,
  pageFrames,
}: DerivePlacementPageFrameAffiliationInput): CanvasRect {
  const rect = placementRect(placement);
  const affiliation = derivePlacementPageFrameAffiliation({
    placement,
    pageFrames,
    boundary: 'content',
  });
  if (affiliation.kind !== 'crossing' || !affiliation.pageFrameId) return rect;

  const pageFrame = pageFrames.find((frame) => frame.id === affiliation.pageFrameId);
  if (!pageFrame) return rect;
  const contentRect = getPageFrameContentRect(pageFrame);

  // Release collection is translation-only. An oversized rect has no legal
  // full-fit translation, so keep its geometry instead of silently resizing it.
  if (rect.width > contentRect.width || rect.height > contentRect.height) return rect;

  return {
    ...rect,
    x: clamp(rect.x, contentRect.x, contentRect.x + contentRect.width - rect.width),
    y: clamp(rect.y, contentRect.y, contentRect.y + contentRect.height - rect.height),
  };
}
