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
    exportPreview: input.exportPreview,
    layoutMode: input.layoutMode,
    layoutModeKind: input.layoutModeKind,
    note: input.note,
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
    onAddFavorite: handleAddFavorite,
    onBackProject: handleBackProject,
    onCloseOverlay: input.onCloseOverlay,
    onCollapseChrome: input.onCollapseChrome,
    onExpandChrome: input.onExpandChrome,
    onSaveTitle: input.onSaveTitle,
    onTitleDraftChange: input.onTitleDraftChange,
    onToggleExportPreview: input.onToggleExportPreview,
    onToggleLayoutMode: input.onToggleLayoutMode,
    onToggleMoreActions: input.onToggleMoreActions,
    onToggleNoteInfo: input.onToggleNoteInfo,
    onOpenLayoutPanel: input.onOpenLayoutPanel,
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
    activeSlashCommandId: input.activeSlashCommandId,
    anchorsBySourceRef: input.anchorsBySourceRef,
    annotationTruths: input.annotationTruths,
    contentGroups: input.contentGroups,
    groupFolders: input.groupFolders,
    blockFieldDrafts: input.blockFieldDrafts,
    blockLayouts: input.blockLayouts,
    blockListRef: input.blockListRef,
    blockTextDrafts: input.blockTextDrafts,
    blockTextFlowDrafts: input.blockTextFlowDrafts,
    creatingDraft: input.creatingDraft,
    defaultDraftLayout: input.defaultDraftLayout,
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
    onSaveAnnotationTruths: input.onSaveAnnotationTruths,
    onSaveContentGroups: input.onSaveContentGroups,
    onSaveGroupFolders: input.onSaveGroupFolders,
    onActivateDraft: input.onActivateDraft,
    onBeginMoveBlock: input.onBeginMoveBlock,
    onBeginResizeBlock: input.onBeginResizeBlock,
    onBlockKeyDown: input.onBlockKeyDown,
    onBlockListMouseDown: input.onBlockListMouseDown,
    onBlockTextChange: input.onBlockTextChange,
    onBlockTextFlowChange: input.onBlockTextFlowChange,
    onClearSlashTarget: input.onClearSlashTarget,
    onDiscardDraft: input.onDiscardDraft,
    onDraftChange: input.onDraftChange,
    onDraftKeyDown: input.onDraftKeyDown,
    onFieldDraftChange: input.onFieldDraftChange,
    onFocusBlock: input.onWritingSurfaceFocusBlock,
    onMeasuredBlockHeight: input.onMeasuredBlockHeight,
    onPageSpaceDoubleClick: input.onPageSpaceDoubleClick,
    onPanViewportBy: input.onPanViewportBy,
    onPersistDraft: input.onPersistDraft,
    onResizeDraftFromTextarea: input.onResizeDraftFromTextarea,
    onResetViewport: input.onResetViewport,
    onSaveBlock: input.onSaveBlock,
    onScrollViewportBy: input.onScrollViewportBy,
    onSelectBlock: input.onSelectBlock,
    onSelectSlashCommand: input.onSelectSlashCommand,
    onToggleAIVisibility: input.onToggleAIVisibility,
    onToggleExportRole: input.onToggleExportRole,
    onTrashBlock: input.onTrashBlock,
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
