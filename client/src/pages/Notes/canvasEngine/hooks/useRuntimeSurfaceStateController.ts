import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { usePageReadingViewportController } from './usePageReadingViewportController';
import { scrollPageReadingToRect } from '../pageReadingDomService';
import type { CanvasRect, CanvasViewport, CanvasWorldModel } from '../types';
import { useBlockSelectionController } from './useBlockSelectionController';
import { useFloatingOverlayController } from './useFloatingOverlayController';
import { useLayoutInteractionController } from './useLayoutInteractionController';
import { useRuntimeInteractionController } from './useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './useRuntimeLayoutRefsController';
import { useSurfaceModeController } from './useSurfaceModeController';
import { useViewportTransformController } from './useViewportTransformController';

export function useRuntimeSurfaceStateController({ noteId }: { noteId?: string }) {
  const {
    interactionState,
    setInteractionState,
  } = useRuntimeInteractionController();

  const {
    blockListRef,
    movingBlockIdRef,
    suppressMeasuredReflowForSelection,
    suppressMeasuredReflowUntilRef,
  } = useRuntimeLayoutRefsController();

  const {
    beginTemporaryLayoutMode,
    clearTemporaryLayoutMode,
    disableLayoutMode,
    enablePersistentLayoutMode,
    layoutMode,
    layoutModeKind,
    setSnapGuide,
    snapEnabled,
    snapGuide,
  } = useLayoutInteractionController();

  const {
    closeOverlay,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showAppearancePanel,
    showMoreActions,
    showViewOptions,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    openBlockTrash,
    openLayoutPanel,
    toggleExportPreview,
    toggleAppearancePanel,
    toggleMoreActions,
    toggleViewOptions,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    togglePreviewLabelOverlay,
  } = useFloatingOverlayController({ setInteractionState });

  const handleBeforeBlockInteraction = useCallback(() => {
    suppressMeasuredReflowForSelection();
    clearTemporaryLayoutMode();
  }, [clearTemporaryLayoutMode, suppressMeasuredReflowForSelection]);

  const {
    activeBlockId,
    clearBlockSelection: clearBlockSelectionBase,
    focusBlockId,
    focusedTextOwner,
    markBlockFocused,
    markDraftFocused,
    markBlockSelected,
    releaseTextFocus,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setSelectedBlockId,
  } = useBlockSelectionController({
    onBeforeBlockFocus: handleBeforeBlockInteraction,
    onBeforeBlockSelect: handleBeforeBlockInteraction,
    setInteractionState,
  });

  const clearBlockSelection = useCallback(() => {
    clearTemporaryLayoutMode();
    clearBlockSelectionBase();
  }, [clearBlockSelectionBase, clearTemporaryLayoutMode]);

  const togglePersistentLayoutMode = useCallback(() => {
    if (layoutModeKind === 'persistent') {
      disableLayoutMode();
      closeOverlay();
      return;
    }

    enablePersistentLayoutMode();
  }, [
    closeOverlay,
    disableLayoutMode,
    enablePersistentLayoutMode,
    layoutModeKind,
  ]);

  const {
    pageOffsetX,
    surfaceMode,
    surfacePolicy,
  } = useSurfaceModeController();

  const {
    setViewportSize,
    viewportTransform,
  } = useViewportTransformController({ surfaceMode });

  const pageReading = usePageReadingViewportController({ noteId });
  const [pageViewportState, setPageViewportState] = useState<{ noteId?: string; viewport?: CanvasViewport }>({ noteId });
  const pageReadingViewport = pageViewportState.noteId === noteId ? pageViewportState.viewport : undefined;
  const setPageReadingViewport = useCallback((viewport: CanvasViewport) => {
    setPageViewportState((current) => current.noteId === noteId && current.viewport
      && (['x', 'y', 'width', 'height', 'zoom'] as const).every((field) => current.viewport?.[field] === viewport[field])
      ? current : { noteId, viewport });
  }, [noteId]);
  const pageFocusFrameRef = useRef<number | null>(null);
  useLayoutEffect(() => () => {
    if (pageFocusFrameRef.current !== null) cancelAnimationFrame(pageFocusFrameRef.current);
    pageFocusFrameRef.current = null;
  }, [noteId, surfaceMode]);
  const focusViewportOnRect = useCallback((rect: CanvasRect, _world?: CanvasWorldModel) => {
    if (pageFocusFrameRef.current !== null) cancelAnimationFrame(pageFocusFrameRef.current);
    // New-page/continuation callers focus before their taller DOM has committed.
    pageFocusFrameRef.current = requestAnimationFrame(() => {
      pageFocusFrameRef.current = null;
      scrollPageReadingToRect(blockListRef.current, rect);
    });
  }, [blockListRef]);

  return {
    ...pageReading,
    pageReadingViewport,
    setPageReadingViewport,
    activeBlockId,
    blockListRef,
    clearTemporaryLayoutMode,
    clearBlockSelection,
    closeOverlay,
    focusBlockId,
    focusedTextOwner,
    focusViewportOnRect,
    interactionState,
    layoutModeKind,
    layoutMode,
    beginTemporaryLayoutMode,
    markBlockFocused,
    markDraftFocused,
    markBlockSelected,
    releaseTextFocus,
    movingBlockIdRef,
    openBlockTrash,
    openLayoutPanel,
    pageOffsetX,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
    setSnapGuide,
    setViewportSize,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showAppearancePanel,
    showMoreActions,
    showViewOptions,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    snapEnabled,
    snapGuide,
    suppressMeasuredReflowUntilRef,
    surfaceMode,
    surfacePolicy,
    toggleExportPreview,
    toggleAppearancePanel,
    toggleLayoutMode: togglePersistentLayoutMode,
    toggleMoreActions,
    toggleViewOptions,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    togglePreviewLabelOverlay,
    viewportTransform,
  };
}
