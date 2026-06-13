import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useBlockSelectionController } from './useBlockSelectionController';
import { useFloatingOverlayController } from './useFloatingOverlayController';
import { useLayoutDraftController } from './useLayoutDraftController';
import { useLayoutInteractionController } from './useLayoutInteractionController';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import { useNoteCanvasLayerProps } from './useNoteCanvasLayerProps';
import { useNoteCanvasRuntime } from './useNoteCanvasRuntime';
import { useNoteLoadResetController } from './useNoteLoadResetController';
import { useRuntimeBlockEditingController } from './useRuntimeBlockEditingController';
import { useRuntimeBlockHistoryController } from './useRuntimeBlockHistoryController';
import { useRuntimeDocumentStatsController } from './useRuntimeDocumentStatsController';
import { useRuntimeFrameModelController } from './useRuntimeFrameModelController';
import { useRuntimeInteractionController } from './useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './useRuntimeLayoutRefsController';
import { useRuntimeLayoutModelController } from './useRuntimeLayoutModelController';
import { useRuntimeNaturalWritingController } from './useRuntimeNaturalWritingController';
import { useRuntimePlacementInteractionController } from './useRuntimePlacementInteractionController';
import { useSurfaceModeController } from './useSurfaceModeController';

export function useNoteCanvasRuntimeController() {
  const { noteId } = useNoteCanvasRuntime();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
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
    applyMeasuredBlockHeightDraft,
    clearLayoutDraftForBlock,
    layoutDrafts,
    mergeLayoutDrafts,
    resetLayoutDrafts,
    setLayoutDraftForBlock,
    setLayoutDrafts,
  } = useLayoutDraftController();

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

  const { handleNoteLoaded } = useNoteLoadResetController({
    clearBlockSelection,
    resetLayoutDrafts,
  });

  const {
    note,
    blocks,
    sortedBlocks,
    loading,
    titleDraft,
    setTitleDraft,
    newTemplateId,
    setNewTemplateId,
    templateOptions,
    templateWarning,
    newBlockText,
    setNewBlockText,
    savingBlockId,
    anchorsBySourceRef,
    sourceJumpTarget,
    setSourceJumpTarget,
    sourceJumpBusy,
    blockTextDrafts,
    setBlockTextDrafts,
    blockFieldDrafts,
    setBlockFieldDrafts,
    defaultTextTemplate,
    insertTemplateGroups,
    insertTemplateOptions,
    saveTitle,
    createBlock,
    saveBlock,
    applyTemplateToBlock,
    persistBlockLayout,
    toggleBlockExportRole,
    toggleBlockAIVisibility,
    addBlock,
    trashBlock,
    restoreBlock,
    handleViewSource,
  } = useNoteCanvasDataAdapter({
    noteId,
    onNoteLoaded: handleNoteLoaded,
    clearLayoutDraftForBlock,
    setLayoutDraftForBlock,
  });

  const { sourceReferenceCount } = useRuntimeDocumentStatsController({ sortedBlocks });

  const {
    blockLayouts,
    contentWidth,
    defaultDraftLayout,
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
    visibleBlocks,
  } = useRuntimeLayoutModelController({
    blocks,
    blockListRef,
    layoutDrafts,
    pageOffsetX,
    persistBlockLayout,
    sortedBlocks,
    surfaceMode,
    surfacePolicy,
  });

  const {
    handleTrashBlock,
    pushCreatedBlockHistory,
    pushLayoutHistory,
  } = useRuntimeBlockHistoryController({
    applyLayoutDrafts: mergeLayoutDrafts,
    blocks,
    persistLayoutSnapshot,
    restoreBlockForHistory: restoreBlock,
    trashBlock,
  });

  const {
    activateDraft,
    clearSlashTarget,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    handleBlockKeyDown,
    handleBlockListMouseDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handlePageSpaceDoubleClick,
    handleSelectSlashCommand,
    handleSurfacePointerDown,
    persistDraft,
    resizeDraftFromTextarea,
    slashCommands,
    slashTarget,
  } = useRuntimeNaturalWritingController({
    addToast,
    applyTemplateToBlock,
    blockListRef,
    blocks,
    blockTextDrafts,
    clearBlockSelection,
    contentWidth,
    createBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    insertTemplateOptions,
    note,
    onDraftPersisted: pushCreatedBlockHistory,
    pageOffsetX,
    saveBlock,
    setBlockTextDrafts,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
    snapEnabled,
    surfacePolicy,
    templateOptions,
  });

  const {
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
  } = useRuntimeFrameModelController({
    blockLayouts,
    defaultDraftLayout,
    draftActive,
    draftLayout,
    pageOffsetX,
    surfaceMode,
    visibleBlocks,
  });

  const {
    handleMeasuredBlockHeight,
    updateBlockFieldDraft,
  } = useRuntimeBlockEditingController({
    applyMeasuredBlockHeightDraft,
    blockLayouts,
    movingBlockIdRef,
    orderedBlocks: visibleBlocks,
    setBlockFieldDrafts,
    setBlockTextDrafts,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
  });

  const { beginMoveBlock, beginResizeBlock } = useRuntimePlacementInteractionController({
    blockLayouts,
    contentWidth,
    movingBlockIdRef,
    orderedBlocks: visibleBlocks,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    setInteractionState,
    setLayoutDrafts,
    setLayoutMode,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
  });

  const layerProps = useNoteCanvasLayerProps({
    activeBlockId,
    addToast,
    anchorsBySourceRef,
    blockFieldDrafts,
    blockLayouts,
    blockListRef,
    blockTextDrafts,
    chromeCollapsed,
    creatingDraft,
    defaultDraftLayout,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    exportPreview,
    focusBlockId,
    insertTemplateGroups,
    interactionState,
    layoutMode,
    navigate,
    newBlockText,
    newTemplateId,
    note,
    noteCanvasRuntime,
    pageContentHeight,
    pageOffsetX,
    primaryPageFrameX: primaryPageFrame.x,
    primaryPageFrameWidth: primaryPageFrame.width,
    savingBlockId,
    selectedBlockId,
    setSourceJumpTarget,
    showAdvancedInsert,
    showExportPreview,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    slashCommands,
    slashTarget,
    snapEnabled,
    snapGuide,
    sortedBlockCount: sortedBlocks.length,
    sourceJumpBusy,
    sourceJumpTarget,
    sourceReferenceCount,
    surfaceMode,
    surfacePolicy,
    surfacePolicyMode: surfacePolicy.mode,
    templateWarning,
    titleDraft,
    visibleBlocks,
    onActivateDraft: activateDraft,
    onAddBlock: addBlock,
    onBeginMoveBlock: beginMoveBlock,
    onBeginResizeBlock: beginResizeBlock,
    onBlockKeyDown: handleBlockKeyDown,
    onBlockListMouseDown: handleBlockListMouseDown,
    onBlockTextChange: handleBlockTextChange,
    onClearSlashTarget: clearSlashTarget,
    onCloseOverlay: closeOverlay,
    onCollapseChrome: collapseChrome,
    onDiscardDraft: discardDraft,
    onDraftChange: handleDraftChange,
    onDraftKeyDown: handleDraftKeyDown,
    onExpandChrome: expandChrome,
    onFieldDraftChange: updateBlockFieldDraft,
    onFloatingPanelFocusBlock: setFocusBlockId,
    onMeasuredBlockHeight: handleMeasuredBlockHeight,
    onNewBlockTextChange: setNewBlockText,
    onNewTemplateChange: setNewTemplateId,
    onPageSpaceDoubleClick: handlePageSpaceDoubleClick,
    onPersistDraft: persistDraft,
    onResizeDraftFromTextarea: resizeDraftFromTextarea,
    onSaveBlock: saveBlock,
    onSaveTitle: saveTitle,
    onSelectBlock: markBlockSelected,
    onSelectSlashCommand: handleSelectSlashCommand,
    onSurfacePointerDown: handleSurfacePointerDown,
    onTitleDraftChange: setTitleDraft,
    onToggleAdvancedInsert: toggleAdvancedInsert,
    onToggleAIVisibility: toggleBlockAIVisibility,
    onToggleExportPreview: toggleExportPreview,
    onToggleExportRole: toggleBlockExportRole,
    onToggleLayoutMode: toggleLayoutMode,
    onToggleMoreActions: toggleMoreActions,
    onToggleNoteInfo: toggleNoteInfo,
    onTogglePreviewAIVisibility: togglePreviewAIVisibility,
    onTogglePreviewBlockTypes: togglePreviewBlockTypes,
    onTogglePreviewExportStatus: togglePreviewExportStatus,
    onToggleSnapEnabled: toggleSnapEnabled,
    onToggleSurfaceMode: toggleSurfaceMode,
    onTrashBlock: handleTrashBlock,
    onViewSource: handleViewSource,
    onWritingSurfaceFocusBlock: markBlockFocused,
  });

  return {
    layerProps,
    loading,
    note,
  };
}
