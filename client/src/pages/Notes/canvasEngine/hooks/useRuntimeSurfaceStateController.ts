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
    chromeCollapsed,
    closeOverlay,
    collapseChrome,
    expandChrome,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    openBlockTrash,
    openLayoutPanel,
    toggleExportPreview,
    toggleMoreActions,
    toggleNoteInfo,
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
    resolveInitialSurfaceMode,
    surfaceMode,
    surfacePolicy,
    toggleSurfaceMode,
  } = useSurfaceModeController({
    noteId,
    clearBlockSelection,
    closeOverlay,
    setSnapGuide,
  });

  const {
    focusViewportOnRect: focusCanvasViewportOnRect,
    panViewportBy,
    resetViewport,
    scrollViewportBy,
    setViewportSize,
    viewportTransform,
    zoomViewportAt,
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
  const focusViewportOnRect = useCallback((rect: CanvasRect, world?: CanvasWorldModel) => {
    if (surfaceMode === 'page') {
      if (pageFocusFrameRef.current !== null) cancelAnimationFrame(pageFocusFrameRef.current);
      // New-page/continuation callers focus before their taller DOM has committed.
      pageFocusFrameRef.current = requestAnimationFrame(() => {
        pageFocusFrameRef.current = null;
        scrollPageReadingToRect(blockListRef.current, rect);
      });
    } else focusCanvasViewportOnRect(rect, world);
  }, [blockListRef, focusCanvasViewportOnRect, surfaceMode]);

  return {
    ...pageReading,
    pageReadingViewport,
    setPageReadingViewport,
    activeBlockId,
    blockListRef,
    chromeCollapsed,
    clearTemporaryLayoutMode,
    clearBlockSelection,
    closeOverlay,
    collapseChrome,
    expandChrome,
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
    panViewportBy,
    resetViewport,
    resolveInitialSurfaceMode,
    selectedBlockId,
    scrollViewportBy,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
    setSnapGuide,
    setViewportSize,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showMoreActions,
    showNoteInfo,
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
    toggleLayoutMode: togglePersistentLayoutMode,
    toggleMoreActions,
    toggleNoteInfo,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    togglePreviewLabelOverlay,
    toggleSurfaceMode,
    viewportTransform,
    zoomViewportAt,
  };
}
