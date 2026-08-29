import { useCallback } from 'react';
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
    focusViewportOnRect,
    panViewportBy,
    resetViewport,
    scrollViewportBy,
    setViewportSize,
    viewportTransform,
    zoomViewportAt,
  } = useViewportTransformController({ surfaceMode });

  return {
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
