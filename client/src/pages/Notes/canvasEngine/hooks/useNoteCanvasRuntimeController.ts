import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useBlockFieldDraftController } from './useBlockFieldDraftController';
import { useBlockPlacementInteractions } from './useBlockPlacementInteractions';
import { useBlockSelectionController } from './useBlockSelectionController';
import { useCanvasContentWidth } from './useCanvasContentWidth';
import { useCanvasSurfacePointerController } from './useCanvasSurfacePointerController';
import { useDraftBlockController } from './useDraftBlockController';
import { useFloatingOverlayController } from './useFloatingOverlayController';
import { useLayoutDraftController } from './useLayoutDraftController';
import { useLayoutInteractionController } from './useLayoutInteractionController';
import { useLayoutPersistenceController } from './useLayoutPersistenceController';
import { useMeasuredBlockReflowController } from './useMeasuredBlockReflowController';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import { useNoteCanvasLayerProps } from './useNoteCanvasLayerProps';
import {
  useNoteCanvasFrameModel,
  useNoteCanvasResolvedLayoutModel,
} from './useNoteCanvasLayoutModel';
import { useNoteCanvasRuntime } from './useNoteCanvasRuntime';
import { useNoteLoadResetController } from './useNoteLoadResetController';
import { usePlacementHistory } from './usePlacementHistory';
import { useRuntimeInteractionController } from './useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './useRuntimeLayoutRefsController';
import { useSlashCommandController } from './useSlashCommandController';
import { useSurfaceModeController } from './useSurfaceModeController';
import { estimateBlockHeightForText } from '../measurementService';

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
    handleViewSource,
  } = useNoteCanvasDataAdapter({
    noteId,
    onNoteLoaded: handleNoteLoaded,
    clearLayoutDraftForBlock,
    setLayoutDraftForBlock,
  });

  const sourceReferenceCount = useMemo(
    () => sortedBlocks.reduce((total, block) => total + block.source_references.length, 0),
    [sortedBlocks],
  );

  const contentWidth = useCanvasContentWidth({
    containerRef: blockListRef,
    pageOffsetX,
    surfaceMode,
  });

  const {
    blockLayouts,
    defaultDraftLayout,
    visibleBlocks,
  } = useNoteCanvasResolvedLayoutModel({
    contentWidth,
    layoutDrafts,
    sortedBlocks,
    surfaceMode,
    surfacePolicy,
  });

  const {
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    draftTextRef,
    persistDraft,
    resizeDraftFromTextarea,
    setDraftText,
  } = useDraftBlockController({
    createBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    note,
    saveBlock,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
  });

  const {
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
  } = useNoteCanvasFrameModel({
    blockLayouts,
    defaultDraftLayout,
    draftActive,
    draftLayout,
    pageOffsetX,
    surfaceMode,
    visibleBlocks,
  });

  const {
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
  } = useLayoutPersistenceController({
    blocks,
    blockLayouts,
    persistBlockLayout,
  });

  const { updateBlockFieldDraft } = useBlockFieldDraftController({
    setBlockFieldDrafts,
    setBlockTextDrafts,
  });

  const { handleMeasuredBlockHeight } = useMeasuredBlockReflowController({
    applyMeasuredBlockHeightDraft,
    blockLayouts,
    movingBlockIdRef,
    orderedBlocks: visibleBlocks,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
  });

  const { pushLayoutHistory } = usePlacementHistory({
    applyLayoutDrafts: mergeLayoutDrafts,
    persistLayoutSnapshot,
  });

  const { beginMoveBlock, beginResizeBlock } = useBlockPlacementInteractions({
    blockLayouts,
    contentWidth,
    estimateBlockHeightForText,
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

  const {
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  } = useSlashCommandController({
    addToast,
    applyTemplateToBlock,
    blockListRef,
    blocks,
    blockTextDrafts,
    draftText,
    draftTextRef,
    insertTemplateOptions,
    persistDraft,
    saveBlock,
    setBlockTextDrafts,
    setDraftText,
    setFocusBlockId,
    setInteractionState,
    templateOptions,
    activateDraft,
  });

  const {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  } = useCanvasSurfacePointerController({
    activateDraft,
    clearBlockSelection,
    contentWidth,
    defaultDraftLayout,
    pageOffsetX,
    snapEnabled,
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
    onTrashBlock: trashBlock,
    onViewSource: handleViewSource,
    onWritingSurfaceFocusBlock: markBlockFocused,
  });

  return {
    layerProps,
    loading,
    note,
  };
}
