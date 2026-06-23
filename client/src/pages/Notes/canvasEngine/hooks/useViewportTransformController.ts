import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { DEFAULT_CANVAS_WORLD } from '../engineModel';
import type { SurfaceMode } from '../runtimeLayout';
import type {
  CanvasPoint,
  CanvasViewport,
} from '../types';
import {
  clampViewportToWorld,
  createRuntimeViewport,
  panViewportByViewportDelta,
  scrollViewportByViewportDelta,
  zoomViewportAtViewportPoint,
} from '../viewportService';

export interface UseViewportTransformControllerOptions {
  surfaceMode: SurfaceMode;
}

export function useViewportTransformController({
  surfaceMode,
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

  const setViewportSize = useCallback((width: number, height: number) => {
    setViewportTransform((current) => clampViewportToWorld({
      ...current,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }, DEFAULT_CANVAS_WORLD));
  }, []);

  const panViewportBy = useCallback((delta: CanvasPoint) => {
    setViewportTransform((current) => (
      panViewportByViewportDelta(current, delta, DEFAULT_CANVAS_WORLD)
    ));
  }, []);

  const scrollViewportBy = useCallback((delta: CanvasPoint) => {
    setViewportTransform((current) => (
      scrollViewportByViewportDelta(current, delta, DEFAULT_CANVAS_WORLD)
    ));
  }, []);

  const zoomViewportAt = useCallback((point: CanvasPoint, nextZoom: number) => {
    setViewportTransform((current) => (
      zoomViewportAtViewportPoint({
        viewport: current,
        point,
        nextZoom,
        world: DEFAULT_CANVAS_WORLD,
      })
    ));
  }, []);

  const resetViewport = useCallback(() => {
    setViewportTransform((current) => createRuntimeViewport(surfaceMode, current.height, {
      width: current.width,
      height: current.height,
    }));
  }, [surfaceMode]);

  return {
    panViewportBy,
    resetViewport,
    scrollViewportBy,
    setViewportSize,
    viewportTransform,
    zoomViewportAt,
  };
}
