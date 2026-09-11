import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useNoteCanvasRuntime } from './useNoteCanvasRuntime';
import { useRuntimeBlockOperationsController } from './useRuntimeBlockOperationsController';
import { useRuntimeDocumentDataController } from './useRuntimeDocumentDataController';
import { useRuntimeLayoutModelController } from './useRuntimeLayoutModelController';
import { useRuntimePresentationController } from './useRuntimePresentationController';
import { useRuntimeSurfaceStateController } from './useRuntimeSurfaceStateController';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { useUIStore } from '@/stores/uiStore';
import { useSlashBlockRollbackController } from './useSlashBlockRollbackController';
import { useNoteBlockTrashController } from './useNoteBlockTrashController';
import { useTrayController } from './useTrayController';
import { usePaperInkCommands } from './usePaperInkCommands';
import { usePageFrameWalls } from './usePageFrameWalls';
import { tableObjectSavePayload } from '../tableObjectService';
import { resolveEffectiveDocumentTypographyProfile } from '../pageFrameTypographyService';
import type {
  StructuredCanvasObject,
  TableStructuredPayload,
} from '../types';

export function useNoteCanvasRuntimeController() {
  const { noteId, hostMode = 'page' } = useNoteCanvasRuntime();
  const trayDropTargetRef = useRef<HTMLElement>(null);
  const textHistoryHostRef = useRef<TextFlowHistoryHost | null>(null);
  const wallBoundaryRef = useRef<() => boolean>(() => false);
  const addToast = useUIStore((state) => state.addToast);
  const {
    activeBlockId,
    beginTemporaryLayoutMode,
    blockListRef,
    clearTemporaryLayoutMode,
    clearBlockSelection,
    closeOverlay,
    focusBlockId,
    focusedTextOwner,
    focusViewportOnRect,
    interactionState,
    layoutMode,
    layoutModeKind,
    markBlockFocused,
    markDraftFocused,
    markBlockSelected,
    releaseTextFocus,
    resolveInitialSurfaceMode,
    movingBlockIdRef,
    openBlockTrash,
    openLayoutPanel,
    pageReadingViewState,
    pageReadingViewport,
    setPageReadingGear,
    nudgePageReadingStep,
    setPageReadingViewport,
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
    snapEnabled,
    snapGuide,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showMoreActions,
    showNoteInfo,
    showViewOptions,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    suppressMeasuredReflowUntilRef,
    surfaceMode,
    surfacePolicy,
    toggleExportPreview,
    toggleLayoutMode,
    toggleMoreActions,
    toggleNoteInfo,
    toggleViewOptions,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    togglePreviewLabelOverlay,
    toggleSurfaceMode,
    viewportTransform,
    zoomViewportAt,
  } = useRuntimeSurfaceStateController({ noteId });
  const {
    applyMeasuredBlockHeightDraft,
    whenIdle,
    trackPendingWrite,
    note,
    sourceProjectionPolicy,
    coordinateContract,
    blocks,
    sortedBlocks,
    loading,
    loadError,
    titleDraft,
    setTitleDraft,
    descriptionDraft,
    setDescriptionDraft,
    templateOptions,
    templateWarning,
    savingBlockId,
    blockEditRecoveryReceipts,
    anchorsBySourceRef,
    sourceJumpTarget,
    setSourceJumpTarget,
    sourceJumpBusy,
    annotationTruths,
    readAnnotationTruths,
    setAnnotationTruthsSnapshot,
    saveAnnotationTruthsOutcome,
    textHistoryGeneration,
    captureBoardTextRanges,
    restoreBoardTextRanges,
    rebaseBoardTextRanges,
    refreshBoardTextRanges,
    contentGroups,
    groupFolders,
    purposeFrames,
    pageFrameCollection: storedPageFrameCollection,
    runtimePageFrameCollectionRef,
    resolvePlacementWriteContext,
    persistedCanvasObjects,
    persistedCanvasPlacements: storedCanvasPlacements,
    persistedContentMounts,
    persistedVisualConnectors,
    persistedImageObjects,
    persistedStructuredObjects,
    documentTypographyProfile: hydratedDocumentTypographyProfile,
    blockTextDrafts,
    setBlockTextDrafts,
    blockTextFlowDrafts,
    setBlockTextFlowDrafts,
    blockFieldDrafts,
    setBlockFieldDrafts,
    readBlockDraftSnapshot,
    defaultTextTemplate,
    insertTemplateOptions,
    saveTitle,
    saveDescription,
    saveHeaderMetadata,
    saveAnnotationTruths,
    saveContentGroups,
    saveGroupFolders,
    savePageFrameCollection,
    savePageFrameWalls,
    persistCanvasObject,
    deleteCanvasObject,
    saveDocumentTypographyProfile,
    createBlock,
    transferTextUnit,
    createDraftBlock,
    discardDraftBlock,
    finalizeDraftBlock,
    saveBlock: saveBlockRaw,
    applyBlockEditRecovery,
    dismissBlockEditRecovery,
    saveDraftBlockPlacement,
    applyTemplateToBlock,
    persistBlockLayout,
    refreshTrayState,
    toggleBlockExportRole,
    toggleBlockAIVisibility,
    trashBlock,
    forgetBlockLocally,
    restoreBlock,
    restoreBlockById,
    handleViewSource,
    layoutDrafts,
    mergeLayoutDrafts,
    setLayoutDrafts,
    sourceReferenceCount,
  } = useRuntimeDocumentDataController({
    clearBlockSelection,
    noteId,
    hostMode,
  });

  const walls = usePageFrameWalls({
    noteId, generation: textHistoryGeneration, enabled: surfaceMode === 'page' && !loading && !sourceProjectionPolicy.contentReadOnly,
    coordinateContract, collection: storedPageFrameCollection, blocks, layoutDrafts,
    getCollection: () => {
      const rendered = runtimePageFrameCollectionRef.current;
      return rendered && rendered.noteId === noteId ? rendered.collection : null;
    },
    objects: persistedCanvasObjects, placements: storedCanvasPlacements,
    zoom: pageReadingViewport?.zoom || 1, history: textHistoryHostRef,
    boundary: () => wallBoundaryRef.current(), save: savePageFrameWalls,
  });
  const pageFrameCollection = walls.collection;
  const persistedCanvasPlacements = walls.placements;

  const documentTypographyProfile = useMemo(() => resolveEffectiveDocumentTypographyProfile({
    surfaceMode,
    metadata: note?.metadata,
    pageFrames: pageFrameCollection?.pageFrames,
    hydratedProfile: hydratedDocumentTypographyProfile,
  }), [surfaceMode, note?.metadata, pageFrameCollection?.pageFrames, hydratedDocumentTypographyProfile]);

  const {
    blockTrashLoadFailed,
    blockTrashLoading,
    loadTrashedBlocks,
    restoreTrashedBlock,
    restoringBlockId,
    trashedBlocks,
  } = useNoteBlockTrashController({
    noteId,
    restoreBlock,
  });

  const handleOpenBlockTrash = useCallback(() => {
    openBlockTrash();
    void loadTrashedBlocks();
  }, [loadTrashedBlocks, openBlockTrash]);

  const persistStructuredObjectForHistory = useCallback(async (
    objectId: string,
    payload: TableStructuredPayload,
  ): Promise<boolean> => {
    const canvasObject = persistedCanvasObjects.find((item) => item.objectId === objectId);
    const placement = persistedCanvasPlacements.find((item) => item.objectId === objectId);
    const structuredObject = persistedStructuredObjects.find((item) => item.objectId === objectId);
    if (!canvasObject || !placement || !structuredObject) return false;
    const nextStructuredObject: StructuredCanvasObject = {
      ...structuredObject,
      rowCount: payload.rows.length,
      columnCount: payload.columns.length,
      payload,
    };
    return persistCanvasObject({
      canvasObject,
      placement,
      contentMounts: [],
      structuredObject: nextStructuredObject,
      payload: tableObjectSavePayload(canvasObject, placement, nextStructuredObject),
    });
  }, [persistCanvasObject, persistedCanvasObjects, persistedCanvasPlacements, persistedStructuredObjects]);

  const {
    blockLayouts,
    contentWidth,
    defaultDraftLayout,
    pageFrames,
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
    visibleBlocks,
  } = useRuntimeLayoutModelController({
    coordinateContract,
    blocks,
    blockListRef,
    documentTypographyProfile,
    layoutDrafts,
    pageOffsetX,
    pageFrameCollection,
    persistBlockLayout,
    sortedBlocks,
    surfaceMode,
    surfacePolicy,
  });

  useLayoutEffect(() => {
    resolveInitialSurfaceMode({
      blocks: sortedBlocks,
      contentWidth,
      loadedNoteId: note?.id,
      loading,
    });
  }, [contentWidth, loading, note?.id, resolveInitialSurfaceMode, sortedBlocks]);

  const textHistory = useTextFlowHistory({
    noteId: noteId ?? '', generation: textHistoryGeneration, blocks,
    history: textHistoryHostRef,
    annotationTruths,
    readAnnotationTruths,
    setAnnotationTruthsSnapshot,
    saveAnnotationTruthsOutcome,
    captureBoardTextRanges,
    restoreBoardTextRanges,
    rebaseBoardTextRanges,
    blockTextFlowDrafts,
    setBlockTextFlowDrafts,
    setBlockTextDrafts,
    saveBlock: saveBlockRaw,
    applyTemplateToBlock,
    onSaveFailure: () => addToast('error', 'Text changes could not be saved. Retry saving or undo before leaving the note.'),
    createDraftBlock, saveDraftBlockPlacement, discardDraftBlock, trashBlock, restoreBlock, transferTextUnit,
  });
  const { applyEdit: applyBlockTextFlowEdit, saveBlock } = textHistory;
  wallBoundaryRef.current = textHistory.boundary;
  const rollbackBlockSlashSession = useSlashBlockRollbackController({
    applyBlockTextFlowEdit,
    blocks,
    readBlockDraftSnapshot,
    saveBlock,
    setBlockFieldDrafts,
    setBlockTextDrafts,
  });
  const {
    activateDraft,
    dismissSlashSession,
    whenDraftIdle,
    activeSlashCommandId,
    clearSlashTarget,
    creatingDraft,
    discardDraft,
    draftActive,
    draftFocusReceipt,
    draftLayout,
    draftOwnerReconciliation,
    draftPhase,
    draftRef,
    draftText,
    handleBlockKeyDown,
    handleBlockListMouseDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftFocusReceipt,
    handleDraftKeyDown,
    handleDurableFocusReceipt,
    handleTrashBlock,
    handlePageSpaceDoubleClick,
    handleSelectSlashCommand,
    handleSurfacePointerDown,
    handleMeasuredBlockHeight,
    placementPending,
    persistDraft,
    pushStructuredMutationHistory,
    pushHistoryEntry,
    enqueueRuntimeHistoryOperation,
    whenHistoryIdle,
    isReplaying: isRuntimeHistoryReplaying,
    historyReplaying,
    resizeDraftFromTextarea,
    slashCommands,
    slashTarget,
    updateBlockFieldDraft,
    beginMoveBlock,
    beginResizeBlock,
  } = useRuntimeBlockOperationsController({
    noteId,
    generation: textHistoryGeneration,
    beforeHistoryBoundary: textHistory.boundary,
    beforeTextStructure: textHistory.boundary,
    applyBlockTextFlowEdit,
    trayDropTargetRef,
    onMoveBlockToTray: (blockId, before) => { void tray.moveBlockToTray(blockId, before); },
    coordinateContract,
    applyLayoutDrafts: mergeLayoutDrafts,
    applyMeasuredBlockHeightDraft,
    applyTemplateToBlock: textHistory.applyTemplateToBlock,
    blockLayouts,
    blockListRef,
    blocks,
    blockTextDrafts,
    blockTextFlowDrafts,
    clearBlockSelection,
    contentWidth,
    createBlock: createDraftBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    discardDraftBlock,
    finalizeDraftBlock,
    documentTypographyProfile,
    insertTemplateOptions,
    movingBlockIdRef,
    note,
    focusedTextOwner,
    onDraftFocusReceipt: markDraftFocused,
    orderedBlocks: visibleBlocks,
    pageOffsetX,
    pageFrameCollection,
    pageFrames,
    selectedPageFrameId: pageFrameCollection?.selectedFrameId || pageFrameCollection?.primaryFrameId || null,
    viewportTransform: surfaceMode === 'page' ? pageReadingViewport || viewportTransform : viewportTransform,
    persistChangedBlockLayouts: (layouts) => {
      void textHistoryHostRef.current?.enqueueRuntimeHistoryOperation(() => persistChangedBlockLayouts(layouts));
    },
    persistLayoutSnapshot,
    restoreBlockForHistory: restoreBlock,
    rollbackBlockSlashSession,
    saveBlock,
    saveDraftBlockPlacement,
    persistStructuredObjectForHistory,
    onFocusPageFrame: (pageFrame) => focusViewportOnRect(pageFrame),
    onSavePageFrameCollection: savePageFrameCollection,
    setBlockFieldDrafts,
    setBlockTextDrafts,
    setBlockTextFlowDrafts,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setLayoutDrafts,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    beginTemporaryLayoutMode,
    clearTemporaryLayoutMode,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
    templateOptions,
    trashBlock,
  });
  textHistoryHostRef.current = { pushHistoryEntry, enqueueRuntimeHistoryOperation, whenHistoryIdle, isReplaying: isRuntimeHistoryReplaying };

  const inkCommands = usePaperInkCommands({
    noteId, generation: textHistoryGeneration,
    objects: persistedCanvasObjects, placements: persistedCanvasPlacements,
    persistCanvasObject, deleteCanvasObject,
    boundary: textHistory.boundary, pushHistoryEntry, enqueueRuntimeHistoryOperation,
  });

  const handleWritingSurfaceFocusBlock = useCallback((receipt: Parameters<typeof markBlockFocused>[0]) => {
    markBlockFocused(receipt);
    handleDurableFocusReceipt(receipt);
  }, [handleDurableFocusReceipt, markBlockFocused]);

  const tray = useTrayController({
    dropTargetRef: trayDropTargetRef,
    hostMode,
    trackPendingWrite,
    coordinateContract,
    noteId, enabled: surfaceMode === 'page' && !sourceProjectionPolicy.contentReadOnly,
    blocks, objects: persistedCanvasObjects, placements: persistedCanvasPlacements,
    mounts: persistedContentMounts, selectedBlockId, blockLayouts,
    collection: pageFrameCollection, pageOffsetX, refresh: refreshTrayState,
    getRuntimeCollection: () => {
      const rendered = runtimePageFrameCollectionRef.current;
      return rendered && rendered.noteId === noteId ? rendered.collection : null;
    },
    resolvePlacementWriteContext,
    clearSelection: clearBlockSelection, pushHistory: pushHistoryEntry,
    flushBlock: async (block) => {
      const result = await saveBlock(block, blockTextDrafts[block.id] ?? block.plain_text, { silent: true });
      return result.status === 'saved';
    },
  });

  const { layerProps, runtimePageFrameCollection } = useRuntimePresentationController({
    onPageFrameWallPointerDown: walls.begin,
    activePageFrameWall: walls.activeWall,
    hostMode,
    trackPendingWrite: hostMode === 'modal' ? trackPendingWrite : undefined,
    coordinateContract,
    tray,
    onDropTrayBlock: tray.dropOnPaper,
    activeBlockId,
    activeSlashCommandId,
    anchorsBySourceRef,
    allBlocks: sortedBlocks,
    blockFieldDrafts,
    blockTrashLoadFailed,
    blockTrashLoading,
    blockEditRecoveryReceipts,
    blockLayouts,
    blockListRef,
    blockTextDrafts,
    blockTextFlowDrafts,
    creatingDraft,
    defaultDraftLayout,
    defaultTextTemplate,
    documentTypographyProfile,
    draftActive,
    draftFocusReceipt,
    draftLayout,
    draftOwnerReconciliation,
    draftPhase,
    draftRef,
    draftText,
    focusBlockId,
    focusedTextOwner,
    interactionState,
    layoutMode,
    layoutModeKind,
    note,
    pageOffsetX,
    pageFrameCollection,
    placementPending,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedVisualConnectors,
    persistedImageObjects,
    persistedStructuredObjects,
    contentLookupBlocks: sortedBlocks,
    savingBlockId,
    selectedBlockId,
    setSourceJumpTarget,
    showBlockTrash,
    showExportPreview,
    showLayoutPanel,
    showMoreActions,
    showNoteInfo,
    showViewOptions,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    slashCommands,
    slashTarget,
    snapGuide,
    sortedBlockCount: sortedBlocks.length,
    sourceJumpBusy,
    sourceJumpTarget,
    annotationTruths,
    contentGroups,
    groupFolders,
    purposeFrames,
    sourceReferenceCount,
    contentReadOnly: sourceProjectionPolicy.contentReadOnly || textHistory.replaying || historyReplaying || walls.saving,
    recoveryBlockIds: sourceProjectionPolicy.contentReadOnly || historyReplaying ? [] : textHistory.recoveryBlockIds,
    surfaceMode,
    surfacePolicy,
    surfacePolicyMode: surfacePolicy.mode,
    templateWarning,
    titleDraft,
    trashedBlocks,
    restoringBlockId,
    viewportTransform,
    visibleBlocks,
    pageReadingViewState,
    pageReadingViewport,
    onPageReadingGearChange: setPageReadingGear,
    onPageReadingStep: nudgePageReadingStep,
    onPageReadingViewportChange: setPageReadingViewport,
    onCreateBlock: createBlock,
    onActivateDraft: activateDraft,
    onBeginMoveBlock: (...args) => { if (textHistory.boundary()) beginMoveBlock(...args); },
    onBeginResizeBlock: (...args) => { if (textHistory.boundary()) beginResizeBlock(...args); },
    onBlockKeyDown: (...args) => {
      const event = args[2];
      if (['Enter', 'Tab'].includes(event.key) && !textHistory.boundary()) return;
      handleBlockKeyDown(...args);
    },
    onBlockListMouseDown: handleBlockListMouseDown,
    onBlockTextChange: (...args) => { if (!textHistory.isReplaying()) handleBlockTextChange(...args); },
    onBlockTextFlowChange: setBlockTextFlowDrafts,
    onApplyBlockTextFlowEdit: applyBlockTextFlowEdit,
    onApplyDocumentTextFlowEdit: textHistory.applyDocumentEdit,
    onExtractTextUnit: (block: Parameters<typeof textHistory.extractUnit>[0], unitId: string, layout: Parameters<typeof textHistory.extractUnit>[3]) =>
      textHistory.extractUnit(block, unitId, defaultTextTemplate, layout),
    onMoveTextUnit: textHistory.moveUnit,
    onTextEditBoundary: sourceProjectionPolicy.contentReadOnly ? undefined : textHistory.boundary,
    onApplyBlockEditRecovery: applyBlockEditRecovery,
    onApplyBlockLayoutDrafts: (layouts) => { if (textHistory.boundary()) mergeLayoutDrafts(layouts); },
    onClearSlashTarget: clearSlashTarget,
    onCloseOverlay: closeOverlay,
    onDiscardDraft: discardDraft,
    onDismissBlockEditRecovery: dismissBlockEditRecovery,
    onDraftChange: handleDraftChange,
    onDraftFocusReceipt: handleDraftFocusReceipt,
    onDraftKeyDown: handleDraftKeyDown,
    onFieldDraftChange: updateBlockFieldDraft,
    onFocusPageFrame: (pageFrame, world) => focusViewportOnRect(pageFrame, world),
    onReleaseTextFocus: releaseTextFocus,
    onFloatingPanelFocusBlock: setFocusBlockId,
    onMeasuredBlockHeight: (...args) => { if (!walls.activeWall && !walls.saving) handleMeasuredBlockHeight(...args); },
    onPageSpaceDoubleClick: handlePageSpaceDoubleClick,
    onPersistDraft: (text, options) => persistDraft(text, undefined, options),
    onPersistChangedBlockLayouts: (layouts) => {
      if (textHistory.boundary()) void enqueueRuntimeHistoryOperation(() => persistChangedBlockLayouts(layouts));
    },
    onResizeDraftFromTextarea: resizeDraftFromTextarea,
    onResetViewport: resetViewport,
    onSaveBlock: saveBlock,
    onSaveTitle: saveTitle,
    descriptionDraft,
    onDescriptionDraftChange: setDescriptionDraft,
    onSaveDescription: saveDescription,
    onSaveAnnotationTruths: saveAnnotationTruths,
    onSaveContentGroups: saveContentGroups,
    onSaveGroupFolders: saveGroupFolders,
    onSavePageFrameCollection: savePageFrameCollection,
    onPersistCanvasObject: inkCommands.persistCanvasObject,
    onPushStructuredMutationHistory: pushStructuredMutationHistory,
    onDeleteCanvasObject: inkCommands.deleteCanvasObject,
    onSaveDocumentTypographyProfile: saveDocumentTypographyProfile,
    onSelectBlock: markBlockSelected,
    onClearBlockSelection: clearBlockSelection,
    onSelectSlashCommand: handleSelectSlashCommand,
    onSurfacePointerDown: handleSurfacePointerDown,
    onTitleDraftChange: setTitleDraft,
    onToggleAIVisibility: toggleBlockAIVisibility,
    onToggleExportPreview: toggleExportPreview,
    onToggleExportRole: toggleBlockExportRole,
    onToggleLayoutMode: toggleLayoutMode,
    onToggleMoreActions: toggleMoreActions,
    onToggleNoteInfo: toggleNoteInfo,
    onToggleViewOptions: toggleViewOptions,
    onOpenBlockTrash: handleOpenBlockTrash,
    onOpenLayoutPanel: openLayoutPanel,
    onRestoreTrashedBlock: restoreTrashedBlock,
    onTogglePreviewAIVisibility: togglePreviewAIVisibility,
    onTogglePreviewBlockTypes: togglePreviewBlockTypes,
    onTogglePreviewExportStatus: togglePreviewExportStatus,
    onTogglePreviewLabelOverlay: togglePreviewLabelOverlay,
    onToggleSurfaceMode: toggleSurfaceMode,
    onTrashBlock: handleTrashBlock,
    onForgetBlockLocally: forgetBlockLocally,
    onRestoreBlockById: restoreBlockById,
    onPanViewportBy: panViewportBy,
    onScrollViewportBy: scrollViewportBy,
    onViewportSizeChange: setViewportSize,
    onViewSource: handleViewSource,
    onZoomViewportAt: zoomViewportAt,
    onWritingSurfaceFocusBlock: handleWritingSurfaceFocusBlock,
    onWritingSurfaceRequestBlockFocus: setFocusBlockId,
  });

  useLayoutEffect(() => {
    runtimePageFrameCollectionRef.current = !loading && note && note.id === noteId
      ? { noteId: note.id, collection: runtimePageFrameCollection } : null;
    return () => { runtimePageFrameCollectionRef.current = null; };
  }, [loading, note?.id, noteId, runtimePageFrameCollection, runtimePageFrameCollectionRef]);

  const dismissTransientUI = useCallback(() => {
    dismissSlashSession();
    closeOverlay();
    setSourceJumpTarget(null);
  }, [dismissSlashSession, closeOverlay, setSourceJumpTarget]);

  const flushPendingSaves = useCallback(async () => {
    await saveHeaderMetadata();
    await textHistory.flush();
    // Draft creation can schedule another adapter write after its first receipt.
    // Await that existing workflow before waiting for the adapter's write registry.
    await whenDraftIdle();
    await whenIdle();
  }, [saveHeaderMetadata, textHistory.flush, whenDraftIdle, whenIdle]);

  return {
    dismissTransientUI,
    flushPendingSaves,
    refreshBoardTextRanges,
    layerProps,
    runtimePageFrameCollection,
    loading,
    loadError,
    note,
  };
}
