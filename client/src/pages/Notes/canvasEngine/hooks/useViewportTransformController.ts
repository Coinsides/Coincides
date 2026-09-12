import {
  useCallback,
  useState,
} from 'react';
import { DEFAULT_CANVAS_WORLD } from '../engineModel';
import type { SurfaceMode } from '../runtimeLayout';
import type {
  CanvasViewport,
  CanvasWorldModel,
} from '../types';
import {
  clampViewportToWorld,
  createRuntimeViewport,
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

  const setViewportSize = useCallback((width: number, height: number, runtimeWorld?: CanvasWorldModel) => {
    setViewportTransform((current) => clampViewportToWorld({
      ...current,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }, runtimeWorld || world || DEFAULT_CANVAS_WORLD));
  }, [world]);

  return {
    setViewportSize,
    viewportTransform,
  };
}
