import { useBlockSelectionController } from './useBlockSelectionController';
import { useFloatingOverlayController } from './useFloatingOverlayController';
import { useLayoutInteractionController } from './useLayoutInteractionController';
import { useRuntimeInteractionController } from './useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './useRuntimeLayoutRefsController';
import { useSurfaceModeController } from './useSurfaceModeController';

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
    layoutMode,
    setLayoutMode,
    setSnapGuide,
    snapEnabled,
    snapGuide,
    toggleLayoutMode,
    toggleSnapEnabled,
  } = useLayoutInteractionController();

  const {
    chromeCollapsed,
    closeOverlay,
    collapseChrome,
    expandChrome,
    showAdvancedInsert,
    showExportPreview,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    toggleAdvancedInsert,
    toggleExportPreview,
    toggleMoreActions,
    toggleNoteInfo,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
  } = useFloatingOverlayController({ setInteractionState });

  const {
    activeBlockId,
    clearBlockSelection,
    focusBlockId,
    markBlockFocused,
    markBlockSelected,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setSelectedBlockId,
  } = useBlockSelectionController({
    onBeforeBlockFocus: suppressMeasuredReflowForSelection,
    onBeforeBlockSelect: suppressMeasuredReflowForSelection,
    setInteractionState,
  });

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

  return {
    activeBlockId,
    blockListRef,
    chromeCollapsed,
    clearBlockSelection,
    closeOverlay,
    collapseChrome,
    expandChrome,
    focusBlockId,
    interactionState,
    layoutMode,
    markBlockFocused,
    markBlockSelected,
    movingBlockIdRef,
    pageOffsetX,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setLayoutMode,
    setSelectedBlockId,
    setSnapGuide,
    showAdvancedInsert,
    showExportPreview,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    snapEnabled,
    snapGuide,
    suppressMeasuredReflowUntilRef,
    surfaceMode,
    surfacePolicy,
    toggleAdvancedInsert,
    toggleExportPreview,
    toggleLayoutMode,
    toggleMoreActions,
    toggleNoteInfo,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    toggleSnapEnabled,
    toggleSurfaceMode,
  };
}
