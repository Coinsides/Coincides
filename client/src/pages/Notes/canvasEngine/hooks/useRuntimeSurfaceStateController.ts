import { useCallback } from 'react';
import { useBlockSelectionController } from './useBlockSelectionController';
import { useFloatingOverlayController } from './useFloatingOverlayController';
import { useLayoutInteractionController } from './useLayoutInteractionController';
import { useRuntimeInteractionController } from './useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './useRuntimeLayoutRefsController';
import { useSurfaceModeController } from './useSurfaceModeController';
import { useViewportTransformController } from './useViewportTransformController';

export function useRuntimeSurfaceStateController() {
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
    toggleSnapEnabled,
  } = useLayoutInteractionController();

  const {
    chromeCollapsed,
    closeOverlay,
    collapseChrome,
    expandChrome,
    showExportPreview,
    showLayoutPanel,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
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
    markBlockFocused,
    markBlockSelected,
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
    toggleSurfaceMode,
  } = useSurfaceModeController({
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
    focusViewportOnRect,
    interactionState,
    layoutModeKind,
    layoutMode,
    beginTemporaryLayoutMode,
    markBlockFocused,
    markBlockSelected,
    movingBlockIdRef,
    openLayoutPanel,
    pageOffsetX,
    panViewportBy,
    resetViewport,
    selectedBlockId,
    scrollViewportBy,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
    setSnapGuide,
    setViewportSize,
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
    toggleSnapEnabled,
    toggleSurfaceMode,
    viewportTransform,
    zoomViewportAt,
  };
}
