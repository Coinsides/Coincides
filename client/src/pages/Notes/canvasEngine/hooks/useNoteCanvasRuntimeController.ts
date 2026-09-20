import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useNoteCanvasRuntime } from './useNoteCanvasRuntime';
import { useRuntimeBlockOperationsController } from './useRuntimeBlockOperationsController';
import { useRuntimeDocumentDataController } from './useRuntimeDocumentDataController';
import { useRuntimeLayoutModelController } from './useRuntimeLayoutModelController';
import { useNotePageFlow } from './useNotePageFlow';
import { useChapterPresentation } from './useChapterPresentation';
import { useHeadingStructureController } from './useHeadingStructureController';
import { createDefaultDraftLayout } from '../pageFrameService';
import { useRuntimePresentationController } from './useRuntimePresentationController';
import { useRuntimeSurfaceStateController } from './useRuntimeSurfaceStateController';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { useUIStore } from '@/stores/uiStore';
import { useSlashBlockRollbackController } from './useSlashBlockRollbackController';
import { useNoteBlockTrashController } from './useNoteBlockTrashController';
import { useTrayController } from './useTrayController';
import { usePaperInkCommands } from './usePaperInkCommands';
import { usePageFrameWalls } from './usePageFrameWalls';
import { useNoteSkin } from './useNoteSkin';
import { useNoteBinding } from './useNoteBinding';
import { getNoteBindingCoverPage } from '../../../../../../shared/types/noteBinding';
import type { BlockBoxLayout } from '../runtimeLayout';
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
    movingBlockIdRef,
    openBlockTrash,
    openLayoutPanel,
    pageReadingViewState,
    pageReadingViewport,
    setPageReadingGear,
    nudgePageReadingStep,
    setPageReadingViewport,
    pageOffsetX,
    selectedBlockId,
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
    showAppearancePanel,
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
    toggleAppearancePanel,
    toggleViewOptions,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
    togglePreviewLabelOverlay,
    viewportTransform,
  } = useRuntimeSurfaceStateController({ noteId });
  const {
    applyMeasuredBlockHeightDraft,
    whenIdle,
    trackPendingWrite,
    note,
    saveSkin,
    saveBindingSettings,
    skinSaveError,
    sourceProjectionPolicy,
    coordinateContract,
    blocks,
    sortedBlocks,
    reorderBlocks,
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
    blockEditRecoveryConflicts,
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
    createBlock: createBlockRaw,
    transferTextUnit,
    createDraftBlock: createDraftBlockRaw,
    discardDraftBlock,
    finalizeDraftBlock,
    saveBlock: saveBlockRaw,
    applyBlockEditRecovery,
    inspectBlockEditRecovery,
    replayBlockEditRecovery,
    dismissBlockEditRecovery,
    saveDraftBlockPlacement: saveDraftBlockPlacementRaw,
    applyTemplateToBlock,
    persistBlockLayout: persistBlockLayoutRaw,
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
    noteId, generation: textHistoryGeneration, enabled: layoutMode && surfaceMode === 'page' && !loading && !sourceProjectionPolicy.contentReadOnly,
    coordinateContract, collection: storedPageFrameCollection, blocks, layoutDrafts,
    getCollection: () => {
      const rendered = runtimePageFrameCollectionRef.current;
      return rendered && rendered.noteId === noteId ? rendered.collection : null;
    },
    objects: persistedCanvasObjects, placements: storedCanvasPlacements,
    zoom: pageReadingViewport?.zoom || 1, history: textHistoryHostRef,
    boundary: () => wallBoundaryRef.current(), save: savePageFrameWalls,
  });
  const skin = useNoteSkin(note, saveSkin, skinSaveError);
  const binding = useNoteBinding(note?.id, saveBindingSettings);
  const coverFrameId = getNoteBindingCoverPage(binding.value).frameId;
  const coverLayout = useCallback((layout: BlockBoxLayout): BlockBoxLayout =>
    coverFrameId && layout.frame_id === coverFrameId ? { ...layout, width_mode: 'manual' } : layout, [coverFrameId]);
  const createBlock: typeof createBlockRaw = useCallback((template, text, options = {}) =>
    createBlockRaw(template, text, { ...options, ...(options.layout ? { layout: coverLayout(options.layout) } : {}) }),
  [createBlockRaw, coverLayout]);
  const createDraftBlock: typeof createDraftBlockRaw = useCallback((template, text, options) =>
    createDraftBlockRaw(template, text, { ...options, ...(options.layout ? { layout: coverLayout(options.layout) } : {}) }),
  [createDraftBlockRaw, coverLayout]);
  const saveDraftBlockPlacement: typeof saveDraftBlockPlacementRaw = useCallback((block, layout, key, targetNoteId) =>
    saveDraftBlockPlacementRaw(block, targetNoteId === noteId ? coverLayout(layout) : layout, key, targetNoteId),
  [saveDraftBlockPlacementRaw, coverLayout, noteId]);
  const persistBlockLayout: typeof persistBlockLayoutRaw = useCallback((block, layout) =>
    persistBlockLayoutRaw(block, coverLayout(layout)), [persistBlockLayoutRaw, coverLayout]);
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
    blockLayouts: unpaginatedBlockLayouts,
    contentWidth,
    defaultDraftLayout: unpaginatedDefaultDraftLayout,
    pageFrames,
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
    visibleBlocks,
  } = useRuntimeLayoutModelController({
    notePagePreset: note?.page_format,
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

  const chapterBoundaryRef = useRef<() => boolean>(() => false);
  const headingBusyRef = useRef<() => boolean>(() => false);
  const chapterMoveContext = useRef<{
    layouts: Record<string, BlockBoxLayout>;
    collection: typeof pageFrameCollection;
    plan?: import('../documentPageFlowService').DocumentPageFlowPlan;
  }>({ layouts: unpaginatedBlockLayouts, collection: pageFrameCollection });
  const chapters = useChapterPresentation({ noteId, blocks: visibleBlocks, orderedBlocks: sortedBlocks,
    layouts: unpaginatedBlockLayouts, flowDrafts: blockTextFlowDrafts, coverFrameId,
    readOnly: sourceProjectionPolicy.contentReadOnly, reorderBlocks, history: textHistoryHostRef,
    beforeStructure: () => chapterBoundaryRef.current(),
    coordinateContract, getMoveContext: () => chapterMoveContext.current, persistLayoutSnapshot, whenWritesIdle: whenIdle,
  });
  const { plan: pageFlowPlan, layouts: blockLayouts, fullPlan: fullPageFlowPlan, fullLayouts: fullBlockLayouts } = useNotePageFlow({
    coverFrameId,
    noteId, enabled: !loading && !sourceProjectionPolicy.contentReadOnly && !walls.activeWall && !walls.saving
      && !chapters.isMoving && !headingBusyRef.current(),
    coordinateContract, blocks: visibleBlocks, layouts: unpaginatedBlockLayouts,
    pageFrames, collection: pageFrameCollection, typography: documentTypographyProfile,
    textDrafts: blockTextDrafts, flowDrafts: blockTextFlowDrafts,
    saveCollection: savePageFrameCollection, persistLayout: persistBlockLayout,
    hiddenBlockIds: chapters.hiddenBlockIds,
  });
  chapterMoveContext.current = { layouts: fullBlockLayouts, collection: fullPageFlowPlan?.collection || pageFrameCollection,
    plan: fullPageFlowPlan };
  const flowPageFrameCollection = pageFlowPlan?.collection || pageFrameCollection;
  const defaultDraftLayout = useMemo(() => pageFlowPlan ? createDefaultDraftLayout({
    ...blockLayouts,
    ...Object.fromEntries(pageFlowPlan.fragments.map((fragment) => [fragment.id, fragment.layout])),
  }, contentWidth, pageFlowPlan.collection.pageFrames, coordinateContract) : unpaginatedDefaultDraftLayout,
  [pageFlowPlan, blockLayouts, contentWidth, coordinateContract, unpaginatedDefaultDraftLayout]);

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
  const headingStructure = useHeadingStructureController({ noteId, blocks: sortedBlocks, layouts: blockLayouts,
    coverFrameId, readOnly: sourceProjectionPolicy.contentReadOnly || chapters.isMoving, template: defaultTextTemplate, textHistory, reorderBlocks,
    onFocusBlock: setFocusBlockId,
    whenWritesIdle: whenIdle,
    onFailure: () => addToast('error', 'Heading changes could not be completed. Undo to restore the previous text.'),
  });
  headingBusyRef.current = headingStructure.isBusy;
  chapterBoundaryRef.current = () => !chapters.isMoving && !headingStructure.isBusy() && textHistory.boundary();
  wallBoundaryRef.current = () => layoutMode && textHistory.boundary();
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
    beforeHistoryBoundary: () => !chapters.isMoving && !headingStructure.isBusy() && textHistory.boundary(),
    beforeTextStructure: textHistory.boundary,
    onHeadingStructure: headingStructure.onHeadingStructure,
    canUseHeading: (block) => block ? headingStructure.canUseHeading(block)
      : !coverFrameId || defaultDraftLayout.frame_id !== coverFrameId,
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
    pageFrameCollection: flowPageFrameCollection,
    pageFrames: flowPageFrameCollection?.pageFrames || pageFrames,
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
    pageFlowPlan,
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
    blockEditRecoveryConflicts,
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
    note: note ? { ...note, binding_settings: binding.value } : null,
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
    showAppearancePanel,
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
    contentReadOnly: sourceProjectionPolicy.contentReadOnly || textHistory.replaying || historyReplaying || walls.saving || headingStructure.busy || chapters.isMoving,
    recoveryBlockIds: sourceProjectionPolicy.contentReadOnly || historyReplaying ? [] : textHistory.recoveryBlockIds,
    surfaceMode,
    surfacePolicy,
    surfacePolicyMode: surfacePolicy.mode,
    templateWarning,
    titleDraft,
    trashedBlocks,
    restoringBlockId,
    viewportTransform,
    visibleBlocks: chapters.visibleBlocks,
    chapterPresentation: chapters.presentation,
    exportContent: { blocks: visibleBlocks, layouts: fullBlockLayouts, pageFlowPlan: fullPageFlowPlan },
    pageReadingViewState,
    pageReadingViewport,
    onPageReadingGearChange: setPageReadingGear,
    onPageReadingStep: nudgePageReadingStep,
    onPageReadingViewportChange: setPageReadingViewport,
    onCreateBlock: createBlock,
    onActivateDraft: activateDraft,
    onBeginMoveBlock: (...args) => {
      if (!chapters.beginChapterMove(args[0], args[1]) && textHistory.boundary()) beginMoveBlock(...args);
    },
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
    onHeadingStructure: headingStructure.onHeadingStructure,
    onApplyDocumentTextFlowEdit: headingStructure.onDocumentEdit,
    onExtractTextUnit: (block: Parameters<typeof textHistory.extractUnit>[0], unitId: string, layout: Parameters<typeof textHistory.extractUnit>[3]) =>
      chapters.projection.chapters.some((chapter) => chapter.blockId === block.id) ? Promise.resolve(false)
        : textHistory.extractUnit(block, unitId, defaultTextTemplate, layout),
    onMoveTextUnit: (block, unitId, target, targetUnitId, edge) => {
      const chapter = chapters.projection.chapters.find((entry) => entry.blockId === block.id && entry.unitId === unitId);
      if (!chapter && chapters.projection.chapters.some((entry) => entry.blockId === target.id)) return Promise.resolve(false);
      return chapter ? chapters.moveChapter(chapter.id, target.id, edge) : textHistory.moveUnit(block, unitId, target, targetUnitId, edge);
    },
    onTextEditBoundary: sourceProjectionPolicy.contentReadOnly ? undefined : textHistory.boundary,
    onApplyBlockEditRecovery: applyBlockEditRecovery,
    onInspectBlockEditRecovery: inspectBlockEditRecovery,
    onReplayBlockEditRecovery: replayBlockEditRecovery,
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
    onResizeDraftFromTextarea: resizeDraftFromTextarea,
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
    onDeleteCanvasObject: inkCommands.deleteCanvasObject,
    onSaveDocumentTypographyProfile: saveDocumentTypographyProfile,
    onSaveBindingSettings: binding.loading || binding.error ? undefined : binding.save,
    onAddNoteBinding: binding.loading || binding.error || sourceProjectionPolicy.contentReadOnly ? undefined : async (field) => {
      if (!textHistory.boundary()) throw new Error('请先完成当前编辑。');
      const frame = flowPageFrameCollection?.pageFrames.find((frame) => frame.id === coverFrameId);
      if (!frame) throw new Error('请先添加封面页。');
      const existing = blocks.find((block) => block.block_type === 'note_ref'
        && block.content_json.field === field && unpaginatedBlockLayouts[block.id]?.frame_id === coverFrameId
        && unpaginatedBlockLayouts[block.id]?.surface !== 'tray');
      if (existing) { markBlockSelected(existing.id); setFocusBlockId(existing.id); return; }
      const width = Math.max(80, frame.width - frame.contentInset.left - frame.contentInset.right);
      const created = await createBlock({ ...defaultTextTemplate, legacy_block_type: 'note_ref' }, '', {
        contentJson: { field }, layout: { ...defaultDraftLayout, x: 0,
          y: field === 'title' ? 80 : 180, width, height: field === 'title' ? 110 : 70,
          width_mode: 'manual', frame_id: frame.id, coordinate_space: 'page_frame_local',
          surface: 'formal_page', boundary_role: 'inside',
        },
      });
      if (!created) throw new Error('绑定块未添加，请重试。');
      markBlockSelected(created.id); setFocusBlockId(created.id);
    },
    bindingError: binding.error,
    onRetryBinding: binding.retry,
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
    onToggleAppearancePanel: toggleAppearancePanel,
    onToggleViewOptions: toggleViewOptions,
    onOpenBlockTrash: handleOpenBlockTrash,
    onOpenLayoutPanel: openLayoutPanel,
    onRestoreTrashedBlock: restoreTrashedBlock,
    onTogglePreviewAIVisibility: togglePreviewAIVisibility,
    onTogglePreviewBlockTypes: togglePreviewBlockTypes,
    onTogglePreviewExportStatus: togglePreviewExportStatus,
    onTogglePreviewLabelOverlay: togglePreviewLabelOverlay,
    onTrashBlock: handleTrashBlock,
    onViewSource: handleViewSource,
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
    skin,
    showAppearancePanel,
    toggleAppearancePanel,
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
