import {
  CANVAS_VIEWPORT_MAX_ZOOM,
  CANVAS_VIEWPORT_MIN_ZOOM,
  DEFAULT_CANVAS_WORLD,
  createViewport,
} from './engineModel';
import { clamp, worldToScreen } from './geometry';
import {
  DEFAULT_PAGE_CONTENT_WIDTH,
  type SurfaceMode,
} from './runtimeLayout';
import type {
  BlockPlacementModel,
  CanvasPoint,
  CanvasRect,
  CanvasViewport,
  CanvasWorldModel,
  PageFrameModel,
} from './types';

const CANVAS_VIEWPORT_HEADROOM = 360;
export const CANVAS_WORLD_PADDING = 800;

export function getPrimaryPageOffsetX(_surfaceMode: SurfaceMode): number {
  return 0;
}

export function getPageViewportCenteringOffsetX(
  containerLeft: number,
  containerClientWidth: number,
  viewportWidth: number,
): number {
  return viewportWidth / 2 - (containerLeft + containerClientWidth / 2);
}

export function createRuntimeViewport(
  _surfaceMode: SurfaceMode,
  pageFrameHeight: number,
  viewport?: Partial<CanvasViewport>,
): CanvasViewport {
  const seed = {
      x: 0,
      y: 0,
      width: DEFAULT_PAGE_CONTENT_WIDTH,
      height: pageFrameHeight,
      zoom: 1,
    };

  return createViewport({
    ...seed,
    ...viewport,
    minZoom: CANVAS_VIEWPORT_MIN_ZOOM,
    maxZoom: CANVAS_VIEWPORT_MAX_ZOOM,
  });
}

export function createRuntimeWorld(
  _surfaceMode: SurfaceMode,
  pageFrameHeight: number,
  _options: {
    pageFrames?: PageFrameModel[];
    blockPlacements?: BlockPlacementModel[];
  } = {},
): CanvasWorldModel {
  return {
    origin: { x: 0, y: 0 },
    width: DEFAULT_PAGE_CONTENT_WIDTH,
    height: pageFrameHeight,
  };
}

export function focusViewportOnWorldRect({
  viewport,
  world = DEFAULT_CANVAS_WORLD,
  rect,
  padding = 120,
}: {
  viewport: CanvasViewport;
  world?: CanvasWorldModel;
  rect: CanvasRect;
  padding?: number;
}): CanvasViewport {
  const zoom = clamp(
    viewport.zoom,
    viewport.minZoom ?? CANVAS_VIEWPORT_MIN_ZOOM,
    viewport.maxZoom ?? CANVAS_VIEWPORT_MAX_ZOOM,
  );
  const visibleWidth = viewport.width / zoom;
  const visibleHeight = viewport.height / zoom;
  const targetX = rect.width + padding * 2 >= visibleWidth
    ? rect.x - padding
    : rect.x + rect.width / 2 - visibleWidth / 2;
  const targetY = rect.height + padding * 2 >= visibleHeight
    ? rect.y - padding
    : rect.y + rect.height / 2 - visibleHeight / 2;

  return clampViewportToWorld({
    ...viewport,
    zoom,
    x: targetX,
    y: targetY,
  }, world);
}

export function clampViewportToWorld(
  viewport: CanvasViewport,
  world: CanvasWorldModel = DEFAULT_CANVAS_WORLD,
): CanvasViewport {
  const minZoom = viewport.minZoom ?? CANVAS_VIEWPORT_MIN_ZOOM;
  const maxZoom = viewport.maxZoom ?? CANVAS_VIEWPORT_MAX_ZOOM;
  const zoom = clamp(viewport.zoom, minZoom, maxZoom);
  const maxX = Math.max(
    -CANVAS_VIEWPORT_HEADROOM,
    world.origin.x + world.width - (viewport.width / zoom) + CANVAS_VIEWPORT_HEADROOM,
  );
  const maxY = Math.max(
    -CANVAS_VIEWPORT_HEADROOM,
    world.origin.y + world.height - (viewport.height / zoom) + CANVAS_VIEWPORT_HEADROOM,
  );

  return {
    ...viewport,
    zoom,
    minZoom,
    maxZoom,
    x: clamp(viewport.x, world.origin.x - CANVAS_VIEWPORT_HEADROOM, maxX),
    y: clamp(viewport.y, world.origin.y - CANVAS_VIEWPORT_HEADROOM, maxY),
  };
}

export function panViewportByViewportDelta(
  viewport: CanvasViewport,
  delta: CanvasPoint,
  world?: CanvasWorldModel,
): CanvasViewport {
  return clampViewportToWorld({
    ...viewport,
    x: viewport.x - delta.x / viewport.zoom,
    y: viewport.y - delta.y / viewport.zoom,
  }, world);
}

export function scrollViewportByViewportDelta(
  viewport: CanvasViewport,
  delta: CanvasPoint,
  world?: CanvasWorldModel,
): CanvasViewport {
  return clampViewportToWorld({
    ...viewport,
    x: viewport.x + delta.x / viewport.zoom,
    y: viewport.y + delta.y / viewport.zoom,
  }, world);
}

export function zoomViewportAtViewportPoint({
  viewport,
  point,
  nextZoom,
  world,
}: {
  viewport: CanvasViewport;
  point: CanvasPoint;
  nextZoom: number;
  world?: CanvasWorldModel;
}): CanvasViewport {
  const minZoom = viewport.minZoom ?? CANVAS_VIEWPORT_MIN_ZOOM;
  const maxZoom = viewport.maxZoom ?? CANVAS_VIEWPORT_MAX_ZOOM;
  const zoom = clamp(nextZoom, minZoom, maxZoom);
  const worldPoint = {
    x: viewport.x + point.x / viewport.zoom,
    y: viewport.y + point.y / viewport.zoom,
  };

  return clampViewportToWorld({
    ...viewport,
    zoom,
    x: worldPoint.x - point.x / zoom,
    y: worldPoint.y - point.y / zoom,
  }, world);
}

export function viewportPointToWorldPoint(
  point: CanvasPoint,
  viewport: CanvasViewport,
): CanvasPoint {
  return {
    x: viewport.x + point.x / viewport.zoom,
    y: viewport.y + point.y / viewport.zoom,
  };
}

export function worldPointToViewportPoint(
  point: CanvasPoint,
  viewport: CanvasViewport,
): CanvasPoint {
  return worldToScreen(point, viewport);
}
