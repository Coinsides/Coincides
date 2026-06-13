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
  SourceJumpTarget,
} from '../runtimeDataTypes';

export type UseNoteCanvasLayerPropsInput =
  Omit<NoteChromeLayerProps, 'note' | 'onAddFavorite' | 'onBackProject'>
  & Omit<NoteFloatingPanelLayerProps, 'onCloseSourceJump' | 'onFocusBlock'>
  & Omit<NoteWritingSurfaceLayerProps, 'onFocusBlock'>
  & Pick<NoteRuntimeDocumentLayerProps, 'onSurfacePointerDown' | 'templateWarning'>
  & {
    note: Note | null;
    onFloatingPanelFocusBlock: NoteFloatingPanelLayerProps['onFocusBlock'];
    onWritingSurfaceFocusBlock: NoteWritingSurfaceLayerProps['onFocusBlock'];
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
    note: input.note,
    showExportPreview: input.showExportPreview,
    showMoreActions: input.showMoreActions,
    showNoteInfo: input.showNoteInfo,
    showPreviewAIVisibility: input.showPreviewAIVisibility,
    showPreviewBlockTypes: input.showPreviewBlockTypes,
    showPreviewExportStatus: input.showPreviewExportStatus,
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
    onTogglePreviewAIVisibility: input.onTogglePreviewAIVisibility,
    onTogglePreviewBlockTypes: input.onTogglePreviewBlockTypes,
    onTogglePreviewExportStatus: input.onTogglePreviewExportStatus,
    onToggleSnapEnabled: input.onToggleSnapEnabled,
    onToggleSurfaceMode: input.onToggleSurfaceMode,
  };

  const floatingPanelProps: NoteFloatingPanelLayerProps = {
    insertTemplateGroups: input.insertTemplateGroups,
    newBlockText: input.newBlockText,
    newTemplateId: input.newTemplateId,
    showAdvancedInsert: input.showAdvancedInsert,
    sourceJumpTarget: input.sourceJumpTarget,
    surfaceMode: input.surfaceMode,
    onAddBlock: input.onAddBlock,
    onCloseOverlay: input.onCloseOverlay,
    onCloseSourceJump: handleCloseSourceJump,
    onFocusBlock: input.onFloatingPanelFocusBlock,
    onNewBlockTextChange: input.onNewBlockTextChange,
    onNewTemplateChange: input.onNewTemplateChange,
    onToggleAdvancedInsert: input.onToggleAdvancedInsert,
  };

  const writingSurfaceProps: NoteWritingSurfaceLayerProps = {
    activeBlockId: input.activeBlockId,
    anchorsBySourceRef: input.anchorsBySourceRef,
    blockFieldDrafts: input.blockFieldDrafts,
    blockLayouts: input.blockLayouts,
    blockListRef: input.blockListRef,
    blockTextDrafts: input.blockTextDrafts,
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
    pageContentHeight: input.pageContentHeight,
    pageOffsetX: input.pageOffsetX,
    primaryPageFrameX: input.primaryPageFrameX,
    primaryPageFrameWidth: input.primaryPageFrameWidth,
    savingBlockId: input.savingBlockId,
    selectedBlockId: input.selectedBlockId,
    showPreviewAIVisibility: input.showPreviewAIVisibility,
    showPreviewBlockTypes: input.showPreviewBlockTypes,
    showPreviewExportStatus: input.showPreviewExportStatus,
    slashCommands: input.slashCommands,
    slashTarget: input.slashTarget,
    snapGuide: input.snapGuide,
    sortedBlockCount: input.sortedBlockCount,
    sourceJumpBusy: input.sourceJumpBusy,
    surfaceMode: input.surfaceMode,
    surfacePolicyMode: input.surfacePolicyMode,
    visibleBlocks: input.visibleBlocks,
    onActivateDraft: input.onActivateDraft,
    onBeginMoveBlock: input.onBeginMoveBlock,
    onBeginResizeBlock: input.onBeginResizeBlock,
    onBlockKeyDown: input.onBlockKeyDown,
    onBlockListMouseDown: input.onBlockListMouseDown,
    onBlockTextChange: input.onBlockTextChange,
    onClearSlashTarget: input.onClearSlashTarget,
    onDiscardDraft: input.onDiscardDraft,
    onDraftChange: input.onDraftChange,
    onDraftKeyDown: input.onDraftKeyDown,
    onFieldDraftChange: input.onFieldDraftChange,
    onFocusBlock: input.onWritingSurfaceFocusBlock,
    onMeasuredBlockHeight: input.onMeasuredBlockHeight,
    onPageSpaceDoubleClick: input.onPageSpaceDoubleClick,
    onPersistDraft: input.onPersistDraft,
    onResizeDraftFromTextarea: input.onResizeDraftFromTextarea,
    onSaveBlock: input.onSaveBlock,
    onSelectBlock: input.onSelectBlock,
    onSelectSlashCommand: input.onSelectSlashCommand,
    onToggleAIVisibility: input.onToggleAIVisibility,
    onToggleExportRole: input.onToggleExportRole,
    onTrashBlock: input.onTrashBlock,
    onViewSource: input.onViewSource,
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
