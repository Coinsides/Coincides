import {
  CANVAS_PRIMARY_PAGE_OFFSET_X,
  CANVAS_VIEWPORT_MAX_ZOOM,
  CANVAS_VIEWPORT_MIN_ZOOM,
  DEFAULT_CANVAS_WORLD,
  createViewport,
} from './engineModel';
import { clamp } from './geometry';
import {
  CANVAS_WORKSPACE_HEIGHT,
  CANVAS_WORKSPACE_WIDTH,
  DEFAULT_PAGE_CONTENT_WIDTH,
  type SurfaceMode,
} from './runtimeLayout';
import type {
  CanvasPoint,
  CanvasViewport,
  CanvasWorldModel,
} from './types';

const CANVAS_VIEWPORT_HEADROOM = 360;
const INITIAL_CANVAS_VIEWPORT_X = -180;
const INITIAL_CANVAS_VIEWPORT_Y = -64;

export function getPrimaryPageOffsetX(surfaceMode: SurfaceMode): number {
  return surfaceMode === 'canvas' ? CANVAS_PRIMARY_PAGE_OFFSET_X : 0;
}

export function createRuntimeViewport(
  surfaceMode: SurfaceMode,
  pageFrameHeight: number,
  viewport?: Partial<CanvasViewport>,
): CanvasViewport {
  const seed = surfaceMode === 'canvas'
    ? {
      x: INITIAL_CANVAS_VIEWPORT_X,
      y: INITIAL_CANVAS_VIEWPORT_Y,
      width: CANVAS_WORKSPACE_WIDTH,
      height: CANVAS_WORKSPACE_HEIGHT,
      zoom: 1,
    }
    : {
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

export function createRuntimeWorld(surfaceMode: SurfaceMode, pageFrameHeight: number): CanvasWorldModel {
  if (surfaceMode === 'canvas') return DEFAULT_CANVAS_WORLD;

  return {
    origin: { x: 0, y: 0 },
    width: DEFAULT_PAGE_CONTENT_WIDTH,
    height: pageFrameHeight,
  };
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
