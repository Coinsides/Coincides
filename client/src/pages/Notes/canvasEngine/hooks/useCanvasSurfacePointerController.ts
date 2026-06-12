import {
  useCallback,
  type MouseEvent,
} from 'react';
import {
  createBlankDraftLayout,
  type SurfaceModePolicy,
} from '../modePolicyService';
import type { BlockBoxLayout } from '../runtimeLayout';

export interface UseCanvasSurfacePointerControllerOptions {
  activateDraft: (layout?: BlockBoxLayout) => void;
  clearBlockSelection: () => void;
  contentWidth: number;
  defaultDraftLayout: BlockBoxLayout;
  pageOffsetX: number;
  snapEnabled: boolean;
  surfacePolicy: SurfaceModePolicy;
}

export function useCanvasSurfacePointerController({
  activateDraft,
  clearBlockSelection,
  contentWidth,
  defaultDraftLayout,
  pageOffsetX,
  snapEnabled,
  surfacePolicy,
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
    const rawX = event.clientX - rect.left - pageOffsetX;
    const rawY = event.clientY - rect.top;
    activateDraft(createBlankDraftLayout({
      policy: surfacePolicy,
      snapEnabled,
      rawX,
      rawY,
      contentWidth,
      defaultDraftLayout,
    }));
  }, [
    activateDraft,
    contentWidth,
    defaultDraftLayout,
    pageOffsetX,
    snapEnabled,
    surfacePolicy,
  ]);

  return {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  };
}
