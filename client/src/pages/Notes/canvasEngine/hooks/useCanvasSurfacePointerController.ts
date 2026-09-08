import { screenLayoutToLocal, type CoordinateContract } from '../placementContractService';
import type { PageFrameModel } from '../types';
import {
  useCallback,
  type MouseEvent,
} from 'react';
import {
  createBlankDraftLayout,
  type SurfaceModePolicy,
} from '../modePolicyService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { CanvasViewport } from '../types';

export interface UseCanvasSurfacePointerControllerOptions {
  coordinateContract?: CoordinateContract;
  pageFrames?: PageFrameModel[];
  activateDraft: (layout?: BlockBoxLayout) => void;
  clearBlockSelection: () => void;
  contentWidth: number;
  defaultDraftLayout: BlockBoxLayout;
  pageOffsetX: number;
  snapEnabled: boolean;
  surfacePolicy: SurfaceModePolicy;
  viewportTransform: CanvasViewport;
}

export function useCanvasSurfacePointerController({
  activateDraft,
  coordinateContract,
  pageFrames,
  clearBlockSelection,
  contentWidth,
  defaultDraftLayout,
  pageOffsetX,
  snapEnabled,
  surfacePolicy,
  viewportTransform,
}: UseCanvasSurfacePointerControllerOptions) {
  const handleSurfacePointerDown = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('article, aside, button, input, textarea, select, [role="dialog"]')) return;
    clearBlockSelection();
  }, [clearBlockSelection]);

  const handleBlockListMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    clearBlockSelection();
  }, [clearBlockSelection]);

  const handlePageSpaceDoubleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const zoom = viewportTransform.zoom;
    const worldX = (event.clientX - rect.left) / zoom;
    const worldY = (event.clientY - rect.top) / zoom;
    const rawX = worldX - pageOffsetX;
    const rawY = worldY;
    const nextLayout = createBlankDraftLayout({
      policy: surfacePolicy,
      snapEnabled,
      rawX,
      rawY,
      contentWidth,
      defaultDraftLayout,
    });
    activateDraft(nextLayout === defaultDraftLayout || surfacePolicy.isCanvasMode
      ? nextLayout
      : screenLayoutToLocal(nextLayout, pageFrames || [], coordinateContract));
  }, [
    activateDraft,
    coordinateContract,
    pageFrames,
    contentWidth,
    defaultDraftLayout,
    pageOffsetX,
    snapEnabled,
    surfacePolicy,
    viewportTransform,
  ]);

  return {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  };
}
