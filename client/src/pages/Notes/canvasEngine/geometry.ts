import type {
  BlockPlacementModel,
  CanvasBoundaryKind,
  CanvasPoint,
  CanvasRect,
  CanvasViewport,
  PageFrameCrossingExportDecision,
  PageFrameCrossingExportPolicy,
  PageFrameModel,
} from './types';

export const DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY: PageFrameCrossingExportPolicy = 'include_if_center_inside';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function worldToScreen(point: CanvasPoint, viewport: CanvasViewport): CanvasPoint {
  return {
    x: (point.x - viewport.x) * viewport.zoom,
    y: (point.y - viewport.y) * viewport.zoom,
  };
}

export function screenToWorld(point: CanvasPoint, viewport: CanvasViewport): CanvasPoint {
  return {
    x: point.x / viewport.zoom + viewport.x,
    y: point.y / viewport.zoom + viewport.y,
  };
}

export function rectsIntersect(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function rectCenter(rect: CanvasRect): CanvasPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function pointInRect(point: CanvasPoint, rect: CanvasRect): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

export function intersectRects(a: CanvasRect, b: CanvasRect): CanvasRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= x || bottom <= y) return null;
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

export function getPageFrameContentGeometryRect(pageFrame: PageFrameModel): CanvasRect {
  return {
    x: pageFrame.x + pageFrame.contentInset.left,
    y: pageFrame.y + pageFrame.contentInset.top,
    width: Math.max(0, pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right),
    height: Math.max(0, pageFrame.height - pageFrame.contentInset.top - pageFrame.contentInset.bottom),
  };
}

export function resolvePageFrameCrossingExportDecision({
  rect,
  pageFrame,
  policy = DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY,
}: {
  rect: CanvasRect;
  pageFrame: PageFrameModel | null;
  policy?: PageFrameCrossingExportPolicy;
}): PageFrameCrossingExportDecision {
  if (!pageFrame) {
    return {
      policy,
      decision: 'excluded',
      reason: 'outside_page_frame',
      exportCandidate: false,
      requiresManualDecision: false,
    };
  }

  const frameRect = getPageFrameContentGeometryRect(pageFrame);
  const centerInside = pointInRect(rectCenter(rect), frameRect);
  const clippedRect = intersectRects(rect, frameRect);
  if (!clippedRect) {
    return {
      policy,
      decision: 'excluded',
      reason: 'outside_page_frame',
      exportCandidate: false,
      requiresManualDecision: false,
    };
  }

  if (policy === 'manual') {
    return {
      policy,
      decision: 'manual_required',
      reason: 'manual_required',
      exportCandidate: false,
      requiresManualDecision: true,
    };
  }

  if (policy === 'exclude_workspace') {
    return {
      policy,
      decision: 'excluded',
      reason: 'workspace_excluded',
      exportCandidate: false,
      requiresManualDecision: false,
    };
  }

  if (policy === 'include_if_intersects') {
    return {
      policy,
      decision: 'included',
      reason: 'intersects_page_frame',
      exportCandidate: true,
      requiresManualDecision: false,
    };
  }

  if (policy === 'clip_to_page_frame') {
    return {
      policy,
      decision: 'clipped',
      reason: 'intersects_page_frame',
      exportCandidate: true,
      requiresManualDecision: false,
      clippedRect,
    };
  }

  return {
    policy,
    decision: centerInside ? 'included' : 'excluded',
    reason: centerInside ? 'center_inside_page_frame' : 'intersects_page_frame',
    exportCandidate: centerInside,
    requiresManualDecision: false,
  };
}

export function expandRect(rect: CanvasRect, padding: number): CanvasRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function viewportToWorldRect(viewport: CanvasViewport): CanvasRect {
  return {
    x: viewport.x,
    y: viewport.y,
    width: viewport.width / viewport.zoom,
    height: viewport.height / viewport.zoom,
  };
}

export function classifyRectAgainstFrame(rect: CanvasRect, frame: PageFrameModel | null): CanvasBoundaryKind {
  if (!frame) return 'outside';
  const fullyInside = rect.x >= frame.x
    && rect.y >= frame.y
    && rect.x + rect.width <= frame.x + frame.width
    && rect.y + rect.height <= frame.y + frame.height;
  if (fullyInside) return 'inside';
  return rectsIntersect(rect, frame) ? 'crossing' : 'outside';
}

export function getVisibleBlockIds(
  placements: BlockPlacementModel[],
  viewport: CanvasViewport,
  overscan = 320,
): string[] {
  const worldRect = expandRect(viewportToWorldRect(viewport), overscan);
  return placements
    .filter((placement) => rectsIntersect(placement, worldRect))
    .map((placement) => placement.blockId);
}
