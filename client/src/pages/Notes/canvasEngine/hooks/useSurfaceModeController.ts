import { useCallback, useMemo, useState } from 'react';
import {
  createSurfaceModePolicy,
  createSurfaceModeTransitionPolicy,
} from '../modePolicyService';
import type { SnapGuide, SurfaceMode } from '../runtimeLayout';

export interface UseSurfaceModeControllerOptions {
  clearBlockSelection: () => void;
  closeOverlay: () => void;
  setSnapGuide: (guide: SnapGuide | null) => void;
}

export function useSurfaceModeController({
  clearBlockSelection,
  closeOverlay,
  setSnapGuide,
}: UseSurfaceModeControllerOptions) {
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('page');
  const surfacePolicy = useMemo(
    () => createSurfaceModePolicy(surfaceMode),
    [surfaceMode],
  );

  const toggleSurfaceMode = useCallback(() => {
    const transition = createSurfaceModeTransitionPolicy(surfaceMode);
    setSurfaceMode(transition.nextMode);
    if (transition.closeOverlay) closeOverlay();
    if (transition.clearSnapGuide) setSnapGuide(null);
    if (transition.clearBlockSelection) clearBlockSelection();
  }, [clearBlockSelection, closeOverlay, setSnapGuide, surfaceMode]);

  return {
    pageOffsetX: surfacePolicy.pageOffsetX,
    surfaceMode,
    surfacePolicy,
    toggleSurfaceMode,
  };
}
