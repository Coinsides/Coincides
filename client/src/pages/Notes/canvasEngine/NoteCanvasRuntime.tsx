import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useBlockFieldDraftController } from './hooks/useBlockFieldDraftController';
import { useCanvasContentWidth } from './hooks/useCanvasContentWidth';
import { useBlockPlacementInteractions } from './hooks/useBlockPlacementInteractions';
import { useBlockSelectionController } from './hooks/useBlockSelectionController';
import { useCanvasSurfacePointerController } from './hooks/useCanvasSurfacePointerController';
import { useDraftBlockController } from './hooks/useDraftBlockController';
import { useFloatingOverlayController } from './hooks/useFloatingOverlayController';
import { useLayoutDraftController } from './hooks/useLayoutDraftController';
import { useLayoutInteractionController } from './hooks/useLayoutInteractionController';
import { useNoteCanvasDataAdapter } from './hooks/useNoteCanvasDataAdapter';
import { useNoteLoadResetController } from './hooks/useNoteLoadResetController';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import {
  useNoteCanvasFrameModel,
  useNoteCanvasResolvedLayoutModel,
} from './hooks/useNoteCanvasLayoutModel';
import { useLayoutPersistenceController } from './hooks/useLayoutPersistenceController';
import { useMeasuredBlockReflowController } from './hooks/useMeasuredBlockReflowController';
import { usePlacementHistory } from './hooks/usePlacementHistory';
import { useRuntimeInteractionController } from './hooks/useRuntimeInteractionController';
import { useRuntimeLayoutRefsController } from './hooks/useRuntimeLayoutRefsController';
import { useSlashCommandController } from './hooks/useSlashCommandController';
import { useSurfaceModeController } from './hooks/useSurfaceModeController';
import {
  NoteChromeLayer,
} from './layers/NoteChromeLayer';
import { NoteRuntimeDocumentLayer } from './layers/NoteRuntimeDocumentLayer';
import { estimateBlockHeightForText } from './measurementService';
import styles from '../NoteDetail.module.css';

export default function NoteCanvasRuntime() {
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
    moveBlock,
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

  if (loading || !note) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <NoteChromeLayer
        chromeCollapsed={chromeCollapsed}
        exportPreview={exportPreview}
        layoutMode={layoutMode}
        note={note}
        showExportPreview={showExportPreview}
        showMoreActions={showMoreActions}
        showNoteInfo={showNoteInfo}
        showPreviewAIVisibility={showPreviewAIVisibility}
        showPreviewBlockTypes={showPreviewBlockTypes}
        showPreviewExportStatus={showPreviewExportStatus}
        snapEnabled={snapEnabled}
        sortedBlockCount={sortedBlocks.length}
        sourceReferenceCount={sourceReferenceCount}
        surfaceMode={surfaceMode}
        surfacePolicy={surfacePolicy}
        titleDraft={titleDraft}
        onAddFavorite={() => addToast('info', 'Favorites will become persistent in a later Better Notebook patch')}
        onBackProject={() => navigate(`/projects/${note.course_id}`)}
        onCloseOverlay={closeOverlay}
        onCollapseChrome={collapseChrome}
        onExpandChrome={expandChrome}
        onSaveTitle={saveTitle}
        onTitleDraftChange={setTitleDraft}
        onToggleExportPreview={toggleExportPreview}
        onToggleLayoutMode={toggleLayoutMode}
        onToggleMoreActions={toggleMoreActions}
        onToggleNoteInfo={toggleNoteInfo}
        onTogglePreviewAIVisibility={togglePreviewAIVisibility}
        onTogglePreviewBlockTypes={togglePreviewBlockTypes}
        onTogglePreviewExportStatus={togglePreviewExportStatus}
        onToggleSnapEnabled={toggleSnapEnabled}
        onToggleSurfaceMode={toggleSurfaceMode}
      />

      <NoteRuntimeDocumentLayer
        surfaceMode={surfaceMode}
        templateWarning={templateWarning}
        onSurfacePointerDown={handleSurfacePointerDown}
        floatingPanelProps={{
          insertTemplateGroups,
          newBlockText,
          newTemplateId,
          showAdvancedInsert,
          sourceJumpTarget,
          onAddBlock: addBlock,
          onCloseOverlay: closeOverlay,
          onCloseSourceJump: () => setSourceJumpTarget(null),
          onFocusBlock: setFocusBlockId,
          onNewBlockTextChange: setNewBlockText,
          onNewTemplateChange: setNewTemplateId,
          onToggleAdvancedInsert: toggleAdvancedInsert,
        }}
        writingSurfaceProps={{
          activeBlockId,
          anchorsBySourceRef,
          blockFieldDrafts,
          blockLayouts,
          blockListRef,
          blockTextDrafts,
          creatingDraft,
          defaultDraftLayout,
          draftActive,
          draftLayout,
          draftRef,
          draftText,
          focusBlockId,
          interactionState,
          layoutMode,
          noteCanvasRuntime,
          pageContentHeight,
          pageOffsetX,
          primaryPageFrameWidth: primaryPageFrame.width,
          savingBlockId,
          selectedBlockId,
          showPreviewAIVisibility,
          showPreviewBlockTypes,
          showPreviewExportStatus,
          slashCommands,
          slashTarget,
          snapGuide,
          sortedBlockCount: sortedBlocks.length,
          sourceJumpBusy,
          surfaceMode,
          surfacePolicyMode: surfacePolicy.mode,
          visibleBlocks,
          onActivateDraft: activateDraft,
          onBeginMoveBlock: beginMoveBlock,
          onBeginResizeBlock: beginResizeBlock,
          onBlockKeyDown: handleBlockKeyDown,
          onBlockListMouseDown: handleBlockListMouseDown,
          onBlockTextChange: handleBlockTextChange,
          onClearSlashTarget: clearSlashTarget,
          onDiscardDraft: discardDraft,
          onDraftChange: handleDraftChange,
          onDraftKeyDown: handleDraftKeyDown,
          onFieldDraftChange: updateBlockFieldDraft,
          onFocusBlock: markBlockFocused,
          onMeasuredBlockHeight: handleMeasuredBlockHeight,
          onPageSpaceDoubleClick: handlePageSpaceDoubleClick,
          onPersistDraft: persistDraft,
          onResizeDraftFromTextarea: resizeDraftFromTextarea,
          onSaveBlock: saveBlock,
          onSelectBlock: markBlockSelected,
          onSelectSlashCommand: handleSelectSlashCommand,
          onToggleAIVisibility: toggleBlockAIVisibility,
          onToggleExportRole: toggleBlockExportRole,
          onTrashBlock: trashBlock,
          onViewSource: handleViewSource,
        }}
      />
    </div>
  );
}
