import { useCallback, useMemo, useState } from 'react';
import {
  createSurfaceModePolicy,
  getNextSurfaceMode,
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
    setSurfaceMode((current) => getNextSurfaceMode(current));
    closeOverlay();
    setSnapGuide(null);
    clearBlockSelection();
  }, [clearBlockSelection, closeOverlay, setSnapGuide]);

  return {
    pageOffsetX: surfacePolicy.pageOffsetX,
    surfaceMode,
    surfacePolicy,
    toggleSurfaceMode,
  };
}
