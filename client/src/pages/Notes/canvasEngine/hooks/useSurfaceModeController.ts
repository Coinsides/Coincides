import { useMemo } from 'react';
import { createSurfaceModePolicy } from '../modePolicyService';

export function useSurfaceModeController() {
  const surfacePolicy = useMemo(() => createSurfaceModePolicy('page'), []);
  return {
    pageOffsetX: surfacePolicy.pageOffsetX,
    surfaceMode: surfacePolicy.mode,
    surfacePolicy,
  };
}
