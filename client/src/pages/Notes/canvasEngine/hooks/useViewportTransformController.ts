import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { DEFAULT_CANVAS_WORLD } from '../engineModel';
import type { SurfaceMode } from '../runtimeLayout';
import type {
  CanvasPoint,
  CanvasRect,
  CanvasViewport,
  CanvasWorldModel,
} from '../types';
import {
  clampViewportToWorld,
  createRuntimeViewport,
  focusViewportOnWorldRect,
  panViewportByViewportDelta,
  scrollViewportByViewportDelta,
  zoomViewportAtViewportPoint,
} from '../viewportService';

export interface UseViewportTransformControllerOptions {
  surfaceMode: SurfaceMode;
  world?: CanvasWorldModel;
}

export function useViewportTransformController({
  surfaceMode,
  world,
}: UseViewportTransformControllerOptions) {
  const [viewportTransform, setViewportTransform] = useState<CanvasViewport>(() => (
    createRuntimeViewport(surfaceMode, 720)
  ));

  useEffect(() => {
    setViewportTransform((current) => createRuntimeViewport(surfaceMode, current.height, {
      width: current.width,
      height: current.height,
    }));
  }, [surfaceMode]);

  const setViewportSize = useCallback((width: number, height: number, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => clampViewportToWorld({
      ...current,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }, runtimeWorld || world || DEFAULT_CANVAS_WORLD));
  }, [world]);

  const panViewportBy = useCallback((delta: CanvasPoint, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => (
      panViewportByViewportDelta(current, delta, runtimeWorld || world || DEFAULT_CANVAS_WORLD)
    ));
  }, [world]);

  const scrollViewportBy = useCallback((delta: CanvasPoint, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => (
      scrollViewportByViewportDelta(current, delta, runtimeWorld || world || DEFAULT_CANVAS_WORLD)
    ));
  }, [world]);

  const zoomViewportAt = useCallback((point: CanvasPoint, nextZoom: number, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => (
      zoomViewportAtViewportPoint({
        viewport: current,
        point,
        nextZoom,
        world: runtimeWorld || world || DEFAULT_CANVAS_WORLD,
      })
    ));
  }, [world]);

  const focusViewportOnRect = useCallback((rect: CanvasRect, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => (
      focusViewportOnWorldRect({
        viewport: current,
        world: runtimeWorld || world || DEFAULT_CANVAS_WORLD,
        rect,
      })
    ));
  }, [world]);

  const resetViewport = useCallback(() => {
    setViewportTransform((current) => createRuntimeViewport(surfaceMode, current.height, {
      width: current.width,
      height: current.height,
    }));
  }, [surfaceMode]);

  return {
    focusViewportOnRect,
    panViewportBy,
    resetViewport,
    scrollViewportBy,
    setViewportSize,
    viewportTransform,
    zoomViewportAt,
  };
}
