import {
  CANVAS_PRIMARY_PAGE_OFFSET_X,
  DEFAULT_CANVAS_WORLD,
  createViewport,
} from './engineModel';
import {
  CANVAS_WORKSPACE_HEIGHT,
  CANVAS_WORKSPACE_WIDTH,
  DEFAULT_PAGE_CONTENT_WIDTH,
  type SurfaceMode,
} from './runtimeLayout';
import type { CanvasWorldModel } from './types';

export function getPrimaryPageOffsetX(surfaceMode: SurfaceMode): number {
  return surfaceMode === 'canvas' ? CANVAS_PRIMARY_PAGE_OFFSET_X : 0;
}

export function createRuntimeViewport(surfaceMode: SurfaceMode, pageFrameHeight: number) {
  return createViewport({
    width: surfaceMode === 'canvas' ? CANVAS_WORKSPACE_WIDTH : DEFAULT_PAGE_CONTENT_WIDTH,
    height: surfaceMode === 'canvas' ? CANVAS_WORKSPACE_HEIGHT : pageFrameHeight,
    zoom: 1,
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
