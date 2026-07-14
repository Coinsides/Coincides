import { useCallback } from 'react';
import type {
  Dispatch,
  SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
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
  Omit<NoteChromeLayerProps, 'note' | 'onAddFavorite' | 'onBackProject'>
  & Omit<NoteFloatingPanelLayerProps, 'onCloseSourceJump' | 'onFocusBlock'>
  & Omit<NoteWritingSurfaceLayerProps, 'onFocusBlock' | 'noteId' | 'projectId'>
  & Pick<NoteRuntimeDocumentLayerProps, 'onSurfacePointerDown' | 'templateWarning'>
  & {
    note: Note | null;
    onFloatingPanelFocusBlock: NoteFloatingPanelLayerProps['onFocusBlock'];
    onWritingSurfaceFocusBlock: NoteWritingSurfaceLayerProps['onFocusBlock'];
    groupFolders: GroupFolderV1[];
    onSaveGroupFolders: NoteWritingSurfaceLayerProps['onSaveGroupFolders'];
    setSourceJumpTarget: Dispatch<SetStateAction<SourceJumpTarget | null>>;
  };

export function useNoteCanvasLayerProps(input: UseNoteCanvasLayerPropsInput): {
  chromeProps: NoteChromeLayerProps;
  documentLayerProps: NoteRuntimeDocumentLayerProps;
} | null {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const courseId = input.note?.course_id;

  const handleAddFavorite = useCallback(() => {
    addToast('info', 'Favorites will become persistent in a later Better Notebook patch');
  }, [addToast]);

  const handleBackProject = useCallback(() => {
    if (!courseId) return;
    navigate(`/projects/${courseId}`);
  }, [courseId, navigate]);

  const handleCloseSourceJump = useCallback(() => {
    input.setSourceJumpTarget(null);
  }, [input]);

  if (!input.note) return null;

  const chromeProps: NoteChromeLayerProps = {
    chromeCollapsed: input.chromeCollapsed,
    contentReadOnly: input.contentReadOnly,
    exportPreview: input.exportPreview,
    layoutMode: input.layoutMode,
    layoutModeKind: input.layoutModeKind,
    note: input.note,
    pageFrameCollection: input.pageFrameCollection,
    pageFrames: input.pageFrames,
    primaryPageFrameId: input.primaryPageFrameId,
    selectedPageFrameId: input.selectedPageFrameId,
    showExportPreview: input.showExportPreview,
    showLayoutPanel: input.showLayoutPanel,
    showMoreActions: input.showMoreActions,
    showNoteInfo: input.showNoteInfo,
    showPreviewAIVisibility: input.showPreviewAIVisibility,
    showPreviewBlockTypes: input.showPreviewBlockTypes,
    showPreviewExportStatus: input.showPreviewExportStatus,
    showPreviewLabelOverlay: input.showPreviewLabelOverlay,
    snapEnabled: input.snapEnabled,
    sortedBlockCount: input.sortedBlockCount,
    sourceReferenceCount: input.sourceReferenceCount,
    surfaceMode: input.surfaceMode,
    surfacePolicy: input.surfacePolicy,
    titleDraft: input.titleDraft,
    documentTypographyProfile: input.documentTypographyProfile,
    onAddFavorite: handleAddFavorite,
    onBackProject: handleBackProject,
    onCloseOverlay: input.onCloseOverlay,
    onCollapseChrome: input.onCollapseChrome,
    onCreatePageFrame: input.onCreatePageFrame,
    onCreatePageStack: input.onCreatePageStack,
    onExpandChrome: input.onExpandChrome,
    onSaveTitle: input.onSaveTitle,
    onSaveDocumentTypographyProfile: input.onSaveDocumentTypographyProfile,
    onTitleDraftChange: input.onTitleDraftChange,
    onToggleExportPreview: input.onToggleExportPreview,
    onToggleLayoutMode: input.onToggleLayoutMode,
    onToggleMoreActions: input.onToggleMoreActions,
    onToggleNoteInfo: input.onToggleNoteInfo,
    onOpenLayoutPanel: input.onOpenLayoutPanel,
    onAddPageBelow: input.onAddPageBelow,
    onDeletePageFrame: input.onDeletePageFrame,
    onDetachPageFromStack: input.onDetachPageFromStack,
    onDuplicatePageFrame: input.onDuplicatePageFrame,
    onInsertPageFrame: input.onInsertPageFrame,
    onMergePageStackWithPrevious: input.onMergePageStackWithPrevious,
    onSelectPageFrame: input.onSelectPageFrame,
    onSetPrimaryPageFrame: input.onSetPrimaryPageFrame,
    onSplitPageStackAtFrame: input.onSplitPageStackAtFrame,
    onTogglePageStackCollapse: input.onTogglePageStackCollapse,
    onTogglePreviewAIVisibility: input.onTogglePreviewAIVisibility,
    onTogglePreviewBlockTypes: input.onTogglePreviewBlockTypes,
    onTogglePreviewExportStatus: input.onTogglePreviewExportStatus,
    onTogglePreviewLabelOverlay: input.onTogglePreviewLabelOverlay,
    onToggleSnapEnabled: input.onToggleSnapEnabled,
    onToggleSurfaceMode: input.onToggleSurfaceMode,
  };

  const floatingPanelProps: NoteFloatingPanelLayerProps = {
    sourceJumpTarget: input.sourceJumpTarget,
    onCloseSourceJump: handleCloseSourceJump,
    onFocusBlock: input.onFloatingPanelFocusBlock,
  };

  const writingSurfaceProps: NoteWritingSurfaceLayerProps = {
    activeBlockId: input.activeBlockId,
    contentReadOnly: input.contentReadOnly,
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
    draftLayout: input.draftLayout,
    draftRef: input.draftRef,
    draftText: input.draftText,
    focusBlockId: input.focusBlockId,
    interactionState: input.interactionState,
    layoutMode: input.layoutMode,
    noteCanvasRuntime: input.noteCanvasRuntime,
    noteId: input.note.id,
    projectId: input.note.course_id,
    pageContentHeight: input.pageContentHeight,
    pageOffsetX: input.pageOffsetX,
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
    onSavePurposeFrames: input.onSavePurposeFrames,
    onPersistCanvasObject: input.onPersistCanvasObject,
    onPushStructuredMutationHistory: input.onPushStructuredMutationHistory,
    onDeleteCanvasObject: input.onDeleteCanvasObject,
    onActivateDraft: input.onActivateDraft,
    onBeginMoveBlock: input.onBeginMoveBlock,
    onBeginResizeBlock: input.onBeginResizeBlock,
    onBlockKeyDown: input.onBlockKeyDown,
    onBlockListMouseDown: input.onBlockListMouseDown,
    onBlockTextChange: input.onBlockTextChange,
    onBlockTextFlowChange: input.onBlockTextFlowChange,
    onClearSlashTarget: input.onClearSlashTarget,
    onCreatePageFrame: input.onCreatePageFrame,
    onCreatePageStack: input.onCreatePageStack,
    onAddPageBelow: input.onAddPageBelow,
    onDiscardDraft: input.onDiscardDraft,
    onDraftChange: input.onDraftChange,
    onDraftKeyDown: input.onDraftKeyDown,
    onFieldDraftChange: input.onFieldDraftChange,
    onFocusBlock: input.onWritingSurfaceFocusBlock,
    onMeasuredBlockHeight: input.onMeasuredBlockHeight,
    onPageSpaceDoubleClick: input.onPageSpaceDoubleClick,
    onPanViewportBy: input.onPanViewportBy,
    onDeletePageFrame: input.onDeletePageFrame,
    onDetachPageFromStack: input.onDetachPageFromStack,
    onDuplicatePageFrame: input.onDuplicatePageFrame,
    onMovePageFrame: input.onMovePageFrame,
    onSetPrimaryPageFrame: input.onSetPrimaryPageFrame,
    onResizePageFrame: input.onResizePageFrame,
    onPersistDraft: input.onPersistDraft,
    onResizeDraftFromTextarea: input.onResizeDraftFromTextarea,
    onResetViewport: input.onResetViewport,
    onSaveBlock: input.onSaveBlock,
    onScrollViewportBy: input.onScrollViewportBy,
    onSelectBlock: input.onSelectBlock,
    onSelectPageFrame: input.onSelectPageFrame,
    onSelectSlashCommand: input.onSelectSlashCommand,
    onToggleAIVisibility: input.onToggleAIVisibility,
    onToggleExportRole: input.onToggleExportRole,
    onTogglePageStackCollapse: input.onTogglePageStackCollapse,
    onTrashBlock: input.onTrashBlock,
    onForgetBlockLocally: input.onForgetBlockLocally,
    onRestoreBlockById: input.onRestoreBlockById,
    onViewportSizeChange: input.onViewportSizeChange,
    onViewSource: input.onViewSource,
    onZoomViewportAt: input.onZoomViewportAt,
  };

  return {
    chromeProps,
    documentLayerProps: {
      floatingPanelProps,
      onSurfacePointerDown: input.onSurfacePointerDown,
      surfaceMode: input.surfaceMode,
      templateWarning: input.templateWarning,
      writingSurfaceProps,
    },
  };
}
