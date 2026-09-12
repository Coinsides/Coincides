import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSource, openAuthenticatedSourceBlob } from '@/pages/Sources/sourceApi';
import type {
  Dispatch,
  SetStateAction,
} from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteTrashAction } from './useNoteTrashAction';
import type { NotePaperHeaderProps } from '../layers/NotePaperHeader';
import type {
  NoteChromeLayerProps,
} from '../layers/NoteChromeLayer';
import type { NoteFloatingPanelLayerProps } from '../layers/NoteFloatingPanelLayer';
import type { NoteRuntimeDocumentLayerProps } from '../layers/NoteRuntimeDocumentLayer';
import type { NoteWritingSurfaceLayerProps } from '../layers/NoteWritingSurfaceLayer';
import type {
  Note,
  GroupFolderV1,
  SourceJumpTarget,
} from '../runtimeDataTypes';

export type UseNoteCanvasLayerPropsInput =
  Omit<NoteChromeLayerProps, 'note' | 'onAddFavorite' | 'onTrashNote'>
  & NotePaperHeaderProps
  & Omit<NoteFloatingPanelLayerProps, 'onCloseSourceJump' | 'onFocusBlock'>
  & Omit<NoteWritingSurfaceLayerProps, 'onFocusBlock' | 'onRequestFocusBlock' | 'noteId' | 'projectId'>
  & Pick<
    NoteRuntimeDocumentLayerProps,
    | 'blockEditRecoveryReceipts'
    | 'blockEditRecoveryConflicts'
    | 'onInspectBlockEditRecovery'
    | 'onReplayBlockEditRecovery'
    | 'onApplyBlockEditRecovery'
    | 'onDismissBlockEditRecovery'
    | 'onSurfacePointerDown'
    | 'templateWarning'
    | 'tray'
  >
  & {
    note: Note | null;
    sourceReferenceCount: number;
    onFloatingPanelFocusBlock: NoteFloatingPanelLayerProps['onFocusBlock'];
    onWritingSurfaceFocusBlock: NoteWritingSurfaceLayerProps['onFocusBlock'];
    onWritingSurfaceRequestBlockFocus: NoteWritingSurfaceLayerProps['onRequestFocusBlock'];
    groupFolders: GroupFolderV1[];
    onSaveGroupFolders: NoteWritingSurfaceLayerProps['onSaveGroupFolders'];
    setSourceJumpTarget: Dispatch<SetStateAction<SourceJumpTarget | null>>;
  };

export function useNoteCanvasLayerProps(input: UseNoteCanvasLayerPropsInput): {
  chromeProps: NoteChromeLayerProps;
  documentLayerProps: NoteRuntimeDocumentLayerProps;
} | null {
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const handleTrashNote = useNoteTrashAction(input.note);

  const handleAddFavorite = useCallback(() => {
    addToast('info', 'Favorites will become persistent in a later Better Notebook patch');
  }, [addToast]);

  const handleCloseSourceJump = useCallback(() => {
    input.setSourceJumpTarget(null);
  }, [input]);

  if (!input.note) return null;

  const chromeProps: NoteChromeLayerProps = {
    hostMode: input.hostMode,
    blockTrashLoadFailed: input.blockTrashLoadFailed,
    blockTrashLoading: input.blockTrashLoading,
    contentReadOnly: input.contentReadOnly,
    exportPreview: input.exportPreview,
    layoutMode: input.layoutMode,
    layoutModeKind: input.layoutModeKind,
    note: input.note,
    pageFrameCollection: input.pageFrameCollection,
    pageFrames: input.pageFrames,
    primaryPageFrameId: input.primaryPageFrameId,
    selectedPageFrameId: input.selectedPageFrameId,
    showBlockTrash: input.showBlockTrash,
    showExportPreview: input.showExportPreview,
    showLayoutPanel: input.showLayoutPanel,
    showAppearancePanel: input.showAppearancePanel,
    showMoreActions: input.showMoreActions,
    showPreviewAIVisibility: input.showPreviewAIVisibility,
    showPreviewBlockTypes: input.showPreviewBlockTypes,
    showPreviewExportStatus: input.showPreviewExportStatus,
    showPreviewLabelOverlay: input.showPreviewLabelOverlay,
    surfaceMode: input.surfaceMode,
    surfacePolicy: input.surfacePolicy,
    trashedBlocks: input.trashedBlocks,
    documentTypographyProfile: input.documentTypographyProfile,
    restoringBlockId: input.restoringBlockId,
    onAddFavorite: handleAddFavorite,
    onTrashNote: handleTrashNote,
    onCloseOverlay: input.onCloseOverlay,
    onCreatePageFrame: input.onCreatePageFrame,
    onCreatePageStack: input.onCreatePageStack,
    onSaveDocumentTypographyProfile: input.onSaveDocumentTypographyProfile,
    onToggleExportPreview: input.onToggleExportPreview,
    onToggleAppearancePanel: input.onToggleAppearancePanel,
    onToggleLayoutMode: input.onToggleLayoutMode,
    onToggleMoreActions: input.onToggleMoreActions,
    onOpenBlockTrash: input.onOpenBlockTrash,
    onOpenLayoutPanel: input.onOpenLayoutPanel,
    onAddPageBelow: input.onAddPageBelow,
    onDeletePageFrame: input.onDeletePageFrame,
    onDetachPageFromStack: input.onDetachPageFromStack,
    onDuplicatePageFrame: input.onDuplicatePageFrame,
    onInsertPageFrame: input.onInsertPageFrame,
    onMergePageStackWithPrevious: input.onMergePageStackWithPrevious,
    onRestoreTrashedBlock: input.onRestoreTrashedBlock,
    onSelectPageFrame: input.onSelectPageFrame,
    onSetPrimaryPageFrame: input.onSetPrimaryPageFrame,
    onSplitPageStackAtFrame: input.onSplitPageStackAtFrame,
    onTogglePageStackCollapse: input.onTogglePageStackCollapse,
    onTogglePreviewAIVisibility: input.onTogglePreviewAIVisibility,
    onTogglePreviewBlockTypes: input.onTogglePreviewBlockTypes,
    onTogglePreviewExportStatus: input.onTogglePreviewExportStatus,
    onTogglePreviewLabelOverlay: input.onTogglePreviewLabelOverlay,
  };

  const floatingPanelProps: NoteFloatingPanelLayerProps = {
    sourceJumpTarget: input.sourceJumpTarget,
    onCloseSourceJump: handleCloseSourceJump,
    onFocusBlock: input.onFloatingPanelFocusBlock,
  };

  const writingSurfaceProps: NoteWritingSurfaceLayerProps = {
    continuousWeb: input.note.page_format === 'screen_note',
    paperHeader: {
      titleDraft: input.titleDraft, descriptionDraft: input.descriptionDraft,
      contentReadOnly: input.contentReadOnly,
      onTitleDraftChange: input.onTitleDraftChange, onDescriptionDraftChange: input.onDescriptionDraftChange,
      onSaveTitle: input.onSaveTitle, onSaveDescription: input.onSaveDescription,
      metadata: {
        noteId: input.note.id, readOnly: input.contentReadOnly,
        mode: input.surfaceMode, blockCount: input.sortedBlockCount,
        sourceCount: input.sourceReferenceCount, status: input.note.status,
        refreshKey: input.allBlocks,
        trackPendingWrite: input.trackPendingWrite,
        onOpenSource: async (source) => {
          const anchor = input.anchorsBySourceRef[source.reference_id];
          if (anchor) { input.onViewSource(anchor.id); return; }
          if (source.projection_note_id) {
            navigate(`/notes/${encodeURIComponent(source.projection_note_id)}`);
            return;
          }
          if (source.source_record_id) {
            await openAuthenticatedSourceBlob(await getSource(source.source_record_id), 'preview');
            return;
          }
          input.onFloatingPanelFocusBlock(source.block_id);
          addToast('info', 'Opened the reference location. The source has no available anchor.');
        },
      },
    },
    onPageFrameWallPointerDown: input.onPageFrameWallPointerDown,
    activePageFrameWall: input.activePageFrameWall,
    hostMode: input.hostMode,
    trackPendingWrite: input.trackPendingWrite,
    activeBlockId: input.activeBlockId,
    contentReadOnly: input.contentReadOnly,
    recoveryBlockIds: input.recoveryBlockIds,
    activeSlashCommandId: input.activeSlashCommandId,
    allBlocks: input.allBlocks,
    anchorsBySourceRef: input.anchorsBySourceRef,
    annotationTruths: input.annotationTruths,
    contentGroups: input.contentGroups,
    groupFolders: input.groupFolders,
    purposeFrames: input.purposeFrames,
    blockFieldDrafts: input.blockFieldDrafts,
    blockLayouts: input.blockLayouts,
    blockListRef: input.blockListRef,
    blockTextDrafts: input.blockTextDrafts,
    blockTextFlowDrafts: input.blockTextFlowDrafts,
    creatingDraft: input.creatingDraft,
    defaultDraftLayout: input.defaultDraftLayout,
    defaultTextTemplate: input.defaultTextTemplate,
    documentTypographyProfile: input.documentTypographyProfile,
    draftActive: input.draftActive,
    draftFocusReceipt: input.draftFocusReceipt,
    draftLayout: input.draftLayout,
    draftOwnerReconciliation: input.draftOwnerReconciliation,
    draftPhase: input.draftPhase,
    draftRef: input.draftRef,
    draftText: input.draftText,
    focusBlockId: input.focusBlockId,
    focusedTextOwner: input.focusedTextOwner,
    interactionState: input.interactionState,
    layoutMode: input.layoutMode,
    noteCanvasRuntime: input.noteCanvasRuntime,
    noteId: input.note.id,
    projectId: input.note.course_id,
    pageContentHeight: input.pageContentHeight,
    pageOffsetX: input.pageOffsetX,
    pageReadingViewState: input.pageReadingViewState,
    onPageReadingGearChange: input.onPageReadingGearChange,
    onPageReadingStep: input.onPageReadingStep,
    onPageReadingViewportChange: input.onPageReadingViewportChange,
    showViewOptions: input.showViewOptions,
    onToggleViewOptions: input.onToggleViewOptions,
    onCloseViewOptions: input.onCloseOverlay,
    placementPending: input.placementPending,
    primaryPageFrameX: input.primaryPageFrameX,
    primaryPageFrameWidth: input.primaryPageFrameWidth,
    savingBlockId: input.savingBlockId,
    selectedBlockId: input.selectedBlockId,
    selectedPageFrameId: input.selectedPageFrameId,
    showPreviewAIVisibility: input.showPreviewAIVisibility,
    showPreviewBlockTypes: input.showPreviewBlockTypes,
    showPreviewExportStatus: input.showPreviewExportStatus,
    showPreviewLabelOverlay: input.showPreviewLabelOverlay,
    slashCommands: input.slashCommands,
    slashTarget: input.slashTarget,
    snapGuide: input.snapGuide,
    sortedBlockCount: input.sortedBlockCount,
    sourceJumpBusy: input.sourceJumpBusy,
    surfaceMode: input.surfaceMode,
    surfacePolicyMode: input.surfacePolicyMode,
    viewportTransform: input.viewportTransform,
    visibleBlocks: input.visibleBlocks,
    onCreateBlock: input.onCreateBlock,
    onSaveAnnotationTruths: input.onSaveAnnotationTruths,
    onSaveContentGroups: input.onSaveContentGroups,
    onSaveDocumentTypographyProfile: input.onSaveDocumentTypographyProfile,
    onSaveGroupFolders: input.onSaveGroupFolders,
    onPersistCanvasObject: input.onPersistCanvasObject,
    onDeleteCanvasObject: input.onDeleteCanvasObject,
    onActivateDraft: input.onActivateDraft,
    onBeginMoveBlock: input.onBeginMoveBlock,
    onBeginResizeBlock: input.onBeginResizeBlock,
    onBlockKeyDown: input.onBlockKeyDown,
    onBlockListMouseDown: input.onBlockListMouseDown,
    onBlockTextChange: input.onBlockTextChange,
    onBlockTextFlowChange: input.onBlockTextFlowChange,
    onApplyBlockTextFlowEdit: input.onApplyBlockTextFlowEdit,
    onApplyDocumentTextFlowEdit: input.onApplyDocumentTextFlowEdit,
    onExtractTextUnit: input.onExtractTextUnit,
    onMoveTextUnit: input.onMoveTextUnit,
    onTextEditBoundary: input.onTextEditBoundary,
    onClearSlashTarget: input.onClearSlashTarget,
    onDiscardDraft: input.onDiscardDraft,
    onDraftChange: input.onDraftChange,
    onDraftFocusReceipt: input.onDraftFocusReceipt,
    onDraftKeyDown: input.onDraftKeyDown,
    onFieldDraftChange: input.onFieldDraftChange,
    onFocusBlock: input.onWritingSurfaceFocusBlock,
    onReleaseTextFocus: input.onReleaseTextFocus,
    onRequestFocusBlock: input.onWritingSurfaceRequestBlockFocus,
    onMeasuredBlockHeight: input.onMeasuredBlockHeight,
    onPageSpaceDoubleClick: input.onPageSpaceDoubleClick,
    onPersistDraft: input.onPersistDraft,
    onResizeDraftFromTextarea: input.onResizeDraftFromTextarea,
    onSaveBlock: input.onSaveBlock,
    onSelectBlock: input.onSelectBlock,
    onClearBlockSelection: input.onClearBlockSelection,
    onSelectSlashCommand: input.onSelectSlashCommand,
    onToggleAIVisibility: input.onToggleAIVisibility,
    onToggleExportRole: input.onToggleExportRole,
    onTrashBlock: input.onTrashBlock,
    onViewSource: input.onViewSource,
    onDropTrayBlock: input.onDropTrayBlock,
  };

  return {
    chromeProps,
    documentLayerProps: {
      tray: input.tray,
    blockEditRecoveryReceipts: input.blockEditRecoveryReceipts,
    blockEditRecoveryConflicts: input.blockEditRecoveryConflicts,
    onInspectBlockEditRecovery: input.onInspectBlockEditRecovery,
    onReplayBlockEditRecovery: input.onReplayBlockEditRecovery,
      floatingPanelProps,
      onApplyBlockEditRecovery: input.onApplyBlockEditRecovery,
      onDismissBlockEditRecovery: input.onDismissBlockEditRecovery,
      onSurfacePointerDown: input.onSurfacePointerDown,
      surfaceMode: input.surfaceMode,
      templateWarning: input.templateWarning,
      writingSurfaceProps,
    },
  };
}
