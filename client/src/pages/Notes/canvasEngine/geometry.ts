import type {
  BlockPlacementModel,
  CanvasBoundaryKind,
  CanvasPoint,
  CanvasRect,
  CanvasViewport,
  PageFrameModel,
} from './types';

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
