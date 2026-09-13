import { screenLayoutToLocal, resolveScreenRect, selectPlacementFrame, normalizeBlockLayoutForSave } from '../placementContractService';
import { pasteMediaBlock } from '../mediaBlockPasteService';
import { createBlankDraftLayout, createSurfaceModePolicy } from '../modePolicyService';
import { useUIStore } from '@/stores/uiStore';
import { sliceGraphemes } from '../../../../../../shared/graphemes';
import { projectPageFrameToReadingSurface } from '../pageFramePresentationService';
import { Boxes, MousePointer2, Pencil, Eraser } from 'lucide-react';
import type { PaperInkTool } from '../freehandService';
import { PaperInkLayer } from './PaperInkLayer';
import { ViewOptionsMenu } from './ViewOptionsMenu';
import { NotePaperHeader, NOTE_HEADER_INITIAL_HEIGHT, type NotePaperHeaderProps } from './NotePaperHeader';
import { PageFrameWallLayer, type ActivePageFrameWall, type PageFrameWallSide } from './PageFrameWallLayer';
import { NoteCanvasRuntimeContext } from '../NoteCanvasRuntimeProvider';
import { usePaperSkin } from '../PaperSkinContext';
import { BOARD_STAGING_MIME, resolveStagingItemDrop } from '../../../Boards/boardStagingDrag';
import type { ItemRefBlockData } from '@shared/types/itemRef';
import { usePageReadingPresentation } from '../hooks/usePageReadingPresentation';
import { createDefaultPageReadingViewState, type PageReadingGear, type PageReadingViewState } from '../pageReadingViewportService';
import type { TemplateOption } from '@/services/templateOptions';
import { useEffect, useContext, useMemo, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction } from 'react';
import type { NoteSlashCommand } from '../../noteSlashCommands';
import {
  presentationKindForBlock,
  textFromContent,
  type FieldValueRecord,
} from '../blockContentService';
import type { RuntimeInteractionState } from '../interactionController';
import { resolveBlockAffiliationOutline } from '../blockAffiliationOutlineService';
import {
  hasLegitimatePendingWritingEditor,
  hasMeaningfulWritingSurfaceContent,
} from '../writingEntryVisibility';
import type { SlashTarget } from '../hooks/useSlashCommandController';
import type { CrossBlockUnitDropTarget } from '../hooks/useTextUnitHandleDrag';
import type {
  AnnotationTruthV1,
  ContentGroupV1,
  GroupFolderV1,
  PurposeFrameV1,
  SourceAnchor,
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  createBlockAnnotationRange,
  createAnnotationTruth,
  hideAnnotationTruth,
  renameAnnotationTruth,
  restoreAnnotationTruth,
  softDeleteAnnotationTruth,
  updateAnnotationColorToken,
  reconcileAnnotationTruthTextOwner,
} from '../annotationTruthService';
import {
  getChildAnnotations,
  getParentAnnotation,
} from '../annotationEditorService';
import {
  applySourceBackedAnnotationRangeEdit,
} from '../rangeRebaseService';
import {
  reconcileCapturedSelectionTextOwner,
  type CapturedSelectionRange,
} from '../selectionRangeService';
import { useSelectionDraftController } from '../hooks/useSelectionDraftController';
import {
  selectionDraftContainsCapturedSelection,
  selectionDraftRangesToAnnotationRanges,
} from '../selectionDraftService';
import {
  createTextBlockContentV1,
  createTextFlowFromDroppedText,
  getTextFlowContent,
  replaceTextUnitText,
} from '../textFlowService';
import type { ApplyBlockTextFlowEdit } from '../hooks/useBlockTextFlowEditController';
import { DocumentTextFlowSelectionContext, useDocumentTextFlowSelection } from '../hooks/useDocumentTextFlowSelection';
import type { DocumentFlowEdit } from '../documentTextFlowSelection';
import type { TextFlowEditBoundary, TextFlowEditMetadata, TextFlowEditSelection } from '../textFlowEditSession';
import { navigateTextFlowBlockBoundary, type TextFlowNavigationTarget } from '../textFlowBlockNavigation';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import {
  setTextUnitWritingRole,
} from '../textUnitEditorService';
import {
  createContentGroup,
  createContentGroupMemberFromAnnotation,
  createContentGroupMemberFromBlock,
  createContentGroupMemberFromRange,
} from '../contentGroupService';
import {
  hasContentGroupDragPayloadType,
  plainTextFromContentGroupDragPayload,
  readContentGroupDragPayload,
} from '../contentGroupDragService';
import {
  annotationRangeIsRenderable,
} from '../annotationDisplayService';
import {
  systemGroupFolderId,
} from '../groupFolderService';
import { buildAnnotationHighlightMenu, buildBlockShellMenu, buildTextSelectionMenu, WRITING_ROLE_BY_COMMAND, type CommandActionId, type CommandSurfaceMenu } from '../commandSurfaceService';
import {
  DEFAULT_BLOCK_HEIGHT,
  type BlockBoxLayout,
} from '../runtimeLayout';

import type { CanvasObject, CanvasPoint, CanvasPlacement, CanvasViewport, CanvasWorldModel, ContentMount, DocumentTypographyProfile, NoteCanvasRuntimeModel, PageFrameModel, PageFrameSlot, PageStackBlockFragmentProjection, ImageCanvasObject, StructuredCanvasObject } from '../types';
import { getBlockControlAnchorFromRect } from '../overlayService';
import {
  createPageFrameGuides,
  shouldShowPageFrameGuides,
} from '../pageFrameGuideService';
import { documentTypographyToCssVars } from '../pageFramePrintScaleService';
import {
  pageFrameTemplateToCssVars,
} from '../pageFrameTemplateService';
import {
  viewportPointToWorldPoint,
} from '../viewportService';
import { AnnotationInspectorPanel } from '../panels/AnnotationInspectorPanel';
import { ContentGroupPanel } from '../panels/ContentGroupPanel';
import type { TrackPendingWrite } from '../inFlightWriteRegistry';
import {
  type AnnotationContextMenuState,
} from './AnnotationContextMenuLayer';
import { AnnotationOverlayLayer } from './AnnotationOverlayLayer';
import { BlockEditorLayer } from './BlockEditorLayer';
import { DraftWritingEntryLayer } from './DraftWritingEntryLayer';
import { ContextMenuLayer } from './ContextMenuLayer';
import { InlineNamePromptLayer } from './InlineNamePromptLayer';

import { SelectionToolbarLayer } from './SelectionToolbarLayer';
import { SelectionTypographyToolbarLayer } from './SelectionTypographyToolbarLayer';
import { useBoardReferenceClipboard } from '../hooks/useBoardReferenceClipboard';
import { useBoardStagingSelection } from '../hooks/useBoardStagingSelection';

import { SlashMenuLayer } from './SlashMenuLayer';

import styles from '../../NoteDetail.module.css';
import { TRAY_DRAG_TYPE } from '../trayService';
import type { DraftBlockLifecyclePhase } from '../draftBlockLifecycleReducer';
import {
  type TextFocusReceipt,
  type TextOwnerReconciliation,
} from '../textFocusReceipt';

export interface NoteWritingSurfaceLayerProps {
  continuousWeb?: boolean;
  paperHeader?: NotePaperHeaderProps;
  noteTools?: import('react').ReactNode;
  hostMode?: 'page' | 'modal';
  trackPendingWrite?: TrackPendingWrite;
  onDropTrayBlock?: (placementId: string, layout: BlockBoxLayout) => Promise<void>;
  activeBlockId: string | null;
  contentReadOnly: boolean;
  recoveryBlockIds?: string[];
  activeSlashCommandId: string | null;
  allBlocks: NoteBlock[];
  anchorsBySourceRef: Record<string, SourceAnchor>;
  annotationTruths: AnnotationTruthV1[];
  contentGroups: ContentGroupV1[];
  groupFolders: GroupFolderV1[];
  purposeFrames: PurposeFrameV1[];
  blockFieldDrafts: Record<string, FieldValueRecord>;
  blockLayouts: Record<string, BlockBoxLayout>;
  blockListRef: RefObject<HTMLDivElement>;
  blockTextDrafts: Record<string, string>;
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  creatingDraft: boolean;
  defaultDraftLayout: BlockBoxLayout;
  defaultTextTemplate: TemplateOption;
  documentTypographyProfile: DocumentTypographyProfile;
  draftActive: boolean;
  draftFocusReceipt: TextFocusReceipt;
  draftLayout: BlockBoxLayout | null;
  draftOwnerReconciliation: TextOwnerReconciliation | null;
  draftPhase: DraftBlockLifecyclePhase;
  draftRef: RefObject<HTMLTextAreaElement>;
  draftText: string;
  focusBlockId: string | null;
  focusedTextOwner: TextFocusReceipt | null;
  interactionState: RuntimeInteractionState;
  layoutMode: boolean;
  noteCanvasRuntime: NoteCanvasRuntimeModel;
  noteId: string;
  projectId: string;
  pageContentHeight: number;
  pageOffsetX: number;
  placementPending: boolean;
  primaryPageFrameX: number;
  primaryPageFrameWidth: number;
  savingBlockId: string | null;
  selectedBlockId: string | null;
  selectedPageFrameId: string | null;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  showPreviewLabelOverlay: boolean;
  slashCommands: NoteSlashCommand[];
  slashTarget: SlashTarget | null;
  snapGuide: { x?: number; y?: number } | null;
  sortedBlockCount: number;
  sourceJumpBusy: string | null;
  surfaceMode: 'page' | 'canvas';
  surfacePolicyMode: string;
  viewportTransform: CanvasViewport;
  pageReadingViewState?: PageReadingViewState;
  onPageReadingGearChange?: (gear: PageReadingGear) => void;
  onPageReadingStep?: (direction: -1 | 1) => void;
  onPageReadingViewportChange?: (viewport: CanvasViewport) => void;
  showViewOptions?: boolean;
  onToggleViewOptions?: () => void;
  onCloseViewOptions?: () => void;
  onPageFrameWallPointerDown?: (event: ReactPointerEvent<HTMLElement>, frameId: string, side: PageFrameWallSide) => void;
  activePageFrameWall?: ActivePageFrameWall | null;
  overviewOpen?: boolean;
  onToggleOverview?: () => void;
  visibleBlocks: NoteBlock[];
  onCreateBlock: (
    template: TemplateOption,
    text: string,
    options?: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      afterBlockId?: string;
      layout?: BlockBoxLayout;
      silent?: boolean;
    },
  ) => Promise<NoteBlock | null>;
  onPersistCanvasObject: (input: {
    canvasObject: CanvasObject;
    placement: CanvasPlacement;
    contentMounts?: ContentMount[];
    visualConnector?: NoteCanvasRuntimeModel['visualConnectors'][number] | null;
    imageObject?: ImageCanvasObject | null;
    structuredObject?: StructuredCanvasObject | null;
    payload: Record<string, unknown>;
  }) => Promise<boolean>;
  onDeleteCanvasObject: (objectId: string) => Promise<boolean>;
  onSaveAnnotationTruths: (annotations: AnnotationTruthV1[]) => Promise<void>;
  onSaveContentGroups: (groups: ContentGroupV1[]) => Promise<boolean | void>;
  onSaveDocumentTypographyProfile: (profile: DocumentTypographyProfile) => void | Promise<void>;
  onSaveGroupFolders: (folders: GroupFolderV1[]) => Promise<void>;
  onActivateDraft: (layout?: BlockBoxLayout) => void;
  onBeginMoveBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, layout: BlockBoxLayout) => void;
  onBeginResizeBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, text: string, layout: BlockBoxLayout) => void;
  onBlockKeyDown: (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlockListMouseDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBlockTextChange: (blockId: string, value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onBlockTextFlowChange: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
  onApplyBlockTextFlowEdit: ApplyBlockTextFlowEdit;
  onApplyDocumentTextFlowEdit?: (changes: DocumentFlowEdit[]) => Promise<boolean>;
  onExtractTextUnit?: (block: NoteBlock, unitId: string, layout: BlockBoxLayout) => Promise<boolean>;
  onMoveTextUnit?: (block: NoteBlock, unitId: string, targetBlock: NoteBlock, targetUnitId: string, edge: 'before' | 'after') => Promise<boolean>;
  onTextEditBoundary?: (reason: TextFlowEditBoundary, selection?: TextFlowEditSelection) => void;
  onClearSlashTarget: () => void;
  onDiscardDraft: () => void;
  onDraftChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFieldDraftChange: (block: NoteBlock, text: string, fieldValues: FieldValueRecord) => void;
  onDraftFocusReceipt: (receipt: TextFocusReceipt) => void;
  onFocusBlock: (receipt: TextFocusReceipt) => void;
  onReleaseTextFocus: (receipt: TextFocusReceipt) => void;
  onRequestFocusBlock: (blockId: string) => void;
  onMeasuredBlockHeight: (block: NoteBlock, layout: BlockBoxLayout, isActive: boolean, height: number) => void;
  onPageSpaceDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPersistDraft: (text: string, options?: { textFlow?: TextBlockContentV1; layout?: BlockBoxLayout }) => Promise<void>;
  onResizeDraftFromTextarea: (textarea: HTMLTextAreaElement) => void;
  onSaveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ) => Promise<BlockSaveOutcome>;
  onSelectBlock: (blockId: string) => void;
  onClearBlockSelection?: () => void;
  onSelectSlashCommand: (command: NoteSlashCommand) => void;
  onToggleAIVisibility: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onToggleExportRole: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onTrashBlock: (blockId: string) => void | Promise<boolean | void>;
  onViewSource: (anchorId: string) => void;
}

type AnnotationNamePromptState = {
  kind: 'label';
  point: { x: number; y: number };
  initialValue: string;
} | null;

function nextNeutralLabelName(annotations: AnnotationTruthV1[]): string {
  const existingLabels = new Set(
    annotations
      .map((annotation) => annotation.raw_label.trim().toLowerCase())
      .filter(Boolean),
  );
  let index = 1;
  while (existingLabels.has(`label ${index}`)) {
    index += 1;
  }
  return `Label ${index}`;
}

export function NoteWritingSurfaceLayer({
  paperHeader,
  noteTools,
  hostMode = 'page',
  trackPendingWrite,
  onDropTrayBlock,
  activeBlockId,
  contentReadOnly,
  recoveryBlockIds = [],
  activeSlashCommandId,
  allBlocks,
  anchorsBySourceRef,
  annotationTruths,
  contentGroups,
  groupFolders,
  purposeFrames,
  blockFieldDrafts,
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
  noteCanvasRuntime,
  noteId,
  projectId,
  pageContentHeight,
  pageOffsetX,
  placementPending,
  primaryPageFrameX,
  primaryPageFrameWidth,
  savingBlockId,
  selectedBlockId,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  showPreviewLabelOverlay,
  slashCommands,
  slashTarget,
  snapGuide,
  sortedBlockCount,
  sourceJumpBusy,
  surfaceMode,
  surfacePolicyMode,
  viewportTransform,
  pageReadingViewState,
  onPageReadingGearChange,
  onPageReadingStep,
  onPageReadingViewportChange,
  showViewOptions = false,
  onToggleViewOptions,
  onCloseViewOptions,
  onPageFrameWallPointerDown,
  activePageFrameWall,
  overviewOpen = false,
  onToggleOverview,
  visibleBlocks,
  onCreateBlock,
  onPersistCanvasObject,
  onDeleteCanvasObject,
  onSaveAnnotationTruths,
  onSaveContentGroups,
  onSaveDocumentTypographyProfile,
  onSaveGroupFolders,
  onActivateDraft,
  onBeginMoveBlock,
  onBeginResizeBlock,
  onBlockKeyDown,
  onBlockListMouseDown,
  onBlockTextChange,
  onBlockTextFlowChange,
  onApplyBlockTextFlowEdit,
  onApplyDocumentTextFlowEdit,
  onExtractTextUnit,
  onMoveTextUnit,
  onTextEditBoundary,
  onClearSlashTarget,
  onDiscardDraft,
  onDraftChange,
  onDraftFocusReceipt,
  onDraftKeyDown,
  onFieldDraftChange,
  onFocusBlock,
  onReleaseTextFocus,
  onRequestFocusBlock,
  onMeasuredBlockHeight,
  onPageSpaceDoubleClick,
  onPersistDraft,
  onResizeDraftFromTextarea,
  onSaveBlock,
  onSelectBlock,
  onClearBlockSelection,
  onSelectSlashCommand,
  onToggleAIVisibility,
  onToggleExportRole,
  onTrashBlock,
  onViewSource,
}: NoteWritingSurfaceLayerProps) {
  const paperSkin = usePaperSkin();
  const addToast = useUIStore((state) => state.addToast);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const textNavigationTargetsRef = useRef(new Map<string, TextFlowNavigationTarget>());
  const stagingItemDrop = useContext(NoteCanvasRuntimeContext)?.stagingItemDrop;
  const itemDropPending = useRef(false);
  const mediaPastePending = useRef(false);
  const mediaPasteSession = useRef({ noteId, active: true });
  useEffect(() => {
    const session = { noteId, active: true };
    mediaPasteSession.current = session;
    return () => { session.active = false; };
  }, [noteId]);
  const [paperInkTool, setPaperInkTool] = useState<PaperInkTool>('selection');
  const paperInkEnabled = !contentReadOnly && !layoutMode && !overviewOpen
    && noteCanvasRuntime.coordinateContract === 'v2';
  useEffect(() => { setPaperInkTool('selection'); }, [noteId, contentReadOnly, layoutMode, overviewOpen, surfaceMode]);
  const [unitMoveTarget, setUnitMoveTarget] = useState<CrossBlockUnitDropTarget | null>(null);
  const [selectedCanvasObjectId, setSelectedCanvasObjectId] = useState<string | null>(null);
  useEffect(() => { setSelectedCanvasObjectId(null); }, [noteId, surfaceMode, paperInkTool, paperInkEnabled]);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [annotationContextMenu, setAnnotationContextMenu] = useState<AnnotationContextMenuState | null>(null);
  const [annotationHighlightContextMenu, setAnnotationHighlightContextMenu] = useState<{
    annotationId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [blockContextMenu, setBlockContextMenu] = useState<{
    blockId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [contentGroupPanelOpen, setContentGroupPanelOpen] = useState(false);
  const [annotationNamePrompt, setAnnotationNamePrompt] = useState<AnnotationNamePromptState>(null);
  const [, setOverlayPositionRevision] = useState(0);
  const selectedAnnotationId = selectedAnnotationIds[0] || null;
  const primaryPageFrame = noteCanvasRuntime.primaryPageFrame;
  const primaryPageFrameId = primaryPageFrame?.id || 'none';
  const primaryPageFrameRole = primaryPageFrame?.role || 'none';
  const primaryPageFramePrimary = primaryPageFrame ? 'true' : 'false';
  const primaryPageFrameExportable = primaryPageFrame?.exportable ? 'true' : 'false';
  const primaryPageFrameExtension = noteCanvasRuntime.pageFrameExtensions
    .find((extension) => extension.frameId === primaryPageFrame?.id);
  const documentTypography = documentTypographyProfile;
  const documentTypographyStyle = documentTypographyToCssVars(documentTypography);
  const primaryPageFrameTemplateStyle = pageFrameTemplateToCssVars(
    primaryPageFrameExtension?.background || primaryPageFrame?.background,
  );
  const readingViewState = pageReadingViewState || createDefaultPageReadingViewState();
  const [headerHeight, setHeaderHeight] = useState(NOTE_HEADER_INITIAL_HEIGHT);
  const displayHeaderHeight = paperHeader ? headerHeight : 0;
  const pageReading = usePageReadingPresentation({
    enabled: surfaceMode === 'page' && !overviewOpen, noteId, surfaceRef, blockListRef, pageFrame: primaryPageFrame,
    pageFrames: noteCanvasRuntime.pageFrames,
    pageContentHeight, displayHeaderHeight, viewState: readingViewState, onViewportChange: onPageReadingViewportChange,
  });
  const snapGuideLayout = blockLayouts[selectedBlockId || ''] || draftLayout || defaultDraftLayout;
  const screenSnapGuide = resolveScreenRect(
    { ...snapGuideLayout, x: snapGuide?.x || 0, y: snapGuide?.y || 0 },
    selectPlacementFrame(snapGuideLayout, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract),
    noteCanvasRuntime.coordinateContract,
    pageOffsetX,
  );
  const pageDisplayBounds = useMemo(() => {
    const screen = (layout: BlockBoxLayout) => resolveScreenRect(layout, selectPlacementFrame(layout, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract), noteCanvasRuntime.coordinateContract);
    const layouts = visibleBlocks.map((block) => blockLayouts[block.id]).filter(Boolean).map(screen);
    if (draftActive) layouts.push(screen(draftLayout || defaultDraftLayout));
    const left = Math.min(0, ...layouts.map((layout) => pageReading.inset.left + layout.x));
    const top = Math.min(0, ...layouts.map((layout) => pageReading.inset.top + layout.y));
    const right = Math.max(pageReading.paperWidth, ...layouts.map((layout) => pageReading.inset.left + layout.x + layout.width));
    const bottom = Math.max(pageReading.paperHeight, ...layouts.map((layout) => pageReading.inset.top + layout.y + layout.height));
    return { left, top, width: right - left, height: bottom - top };
  }, [noteCanvasRuntime, visibleBlocks, blockLayouts, draftActive, draftLayout, defaultDraftLayout,
    pageReading.inset.left, pageReading.inset.top, pageReading.paperWidth, pageReading.paperHeight]);
  const pageFrameGuideVisibility = shouldShowPageFrameGuides({
    surfaceMode,
    layoutMode,
    interactionMode: interactionState.mode,
  });
  const visiblePageFrames = useMemo(() => primaryPageFrame ? [primaryPageFrame] : [], [primaryPageFrame]);
  const blockPlacementByBlockId = useMemo(() => (
    new Map(noteCanvasRuntime.blockPlacements.map((placement) => [placement.blockId, placement]))
  ), [noteCanvasRuntime.blockPlacements]);
  const navigationLayout = { blockLayouts, pageFrames: noteCanvasRuntime.pageFrames,
    coordinateContract: noteCanvasRuntime.coordinateContract, pageOffsetX };
  const documentTextSelection = useDocumentTextFlowSelection({ noteId, visibleBlocks, ...navigationLayout,
    disabled: contentReadOnly || layoutMode, applyDocumentEdit: onApplyDocumentTextFlowEdit });
  const navigateBoundary = (fromBlockId: string, request: Parameters<TextFlowNavigationTarget>[0]) =>
    navigateTextFlowBlockBoundary({ visibleBlocks, ...navigationLayout, fromBlockId, request,
      targets: textNavigationTargetsRef.current, disabled: contentReadOnly || layoutMode });
  const pageFrameExtensionByFrameId = useMemo(() => (
    new Map(noteCanvasRuntime.pageFrameExtensions.map((extension) => [extension.frameId, extension]))
  ), [noteCanvasRuntime.pageFrameExtensions]);
  const pageFrameGuides = useMemo(() => (
    visiblePageFrames.map((frame) => createPageFrameGuides(
      projectPageFrameToReadingSurface(frame, noteCanvasRuntime.coordinateContract, pageOffsetX)))
  ), [visiblePageFrames, noteCanvasRuntime.coordinateContract, pageOffsetX]);
  const blockFragmentsByBlockId = useMemo(() => {
    const next = new Map<string, PageStackBlockFragmentProjection[]>();
    noteCanvasRuntime.blockFragmentProjections.forEach((fragment) => {
      const existing = next.get(fragment.blockId) || [];
      next.set(fragment.blockId, [...existing, fragment]);
    });
    return next;
  }, [noteCanvasRuntime.blockFragmentProjections]);
  const pageFrameSlotEntries = useMemo(() => (
    visiblePageFrames
      .map((pageFrame) => {
        const extension = pageFrameExtensionByFrameId.get(pageFrame.id);
        const collapsedPreviewPages = extension?.pageStackCollapsedPreviewPages || 1;
        const hiddenByCollapsedStack = Boolean(
          extension?.pageStackCollapsed
          && extension.pageStackPageIndex !== null
          && extension.pageStackPageIndex !== undefined
          && extension.pageStackPageIndex >= collapsedPreviewPages,
        );
        if (hiddenByCollapsedStack || !extension?.slots) return null;
        const displayedFrame = projectPageFrameToReadingSurface(pageFrame, noteCanvasRuntime.coordinateContract, pageOffsetX);
        // Slots are world rectangles. Follow the same reading-column translation
        // as the frame and guides while preserving their text and local geometry.
        const slotOffsetX = displayedFrame.x - pageFrame.x;
        const projectSlot = (slot: PageFrameSlot | undefined) => slot
          ? { ...slot, rect: { ...slot.rect, x: slot.rect.x + slotOffsetX } }
          : undefined;
        return {
          frameId: pageFrame.id,
          headerFooterEnabled: extension.headerFooterEnabled,
          pageNumberEnabled: extension.pageNumberEnabled,
          slots: {
            ...extension.slots,
            header: projectSlot(extension.slots.header),
            footer: projectSlot(extension.slots.footer),
            pageNumber: projectSlot(extension.slots.pageNumber),
          },
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  ), [pageFrameExtensionByFrameId, visiblePageFrames, surfaceMode, noteCanvasRuntime.coordinateContract, pageOffsetX]);
  const noteRootGroupFolderId = useMemo(() => systemGroupFolderId({
    kind: 'note',
    project_id: projectId,
    note_id: noteId,
    label: null,
  }), [noteId, projectId]);
  const {
    selectionDraft,
    draftAnnotationRanges,
    draftRangeCount,
    latestDraftRange,
    replaceDraft,
    appendDraftRange,
    activateDraft,
    clearDraft,
    reconcileTextOwner,
  } = useSelectionDraftController();
  const boardReferenceBlockIds = useMemo(() => visibleBlocks.map((block) => block.id), [visibleBlocks]);
  const copySelectionAsBoardReference = useBoardReferenceClipboard({
    noteId, surfaceRef, surfaceMode, selection: draftRangeCount === 1 ? latestDraftRange : null,
    blockIds: boardReferenceBlockIds,
  });
  const sendSelectionToStaging = useBoardStagingSelection({
    noteId, surfaceRef, selection: draftRangeCount === 1 ? latestDraftRange : null,
    blockIds: boardReferenceBlockIds,
  });
  useEffect(() => {
    if (!draftOwnerReconciliation) return;
    reconcileTextOwner(draftOwnerReconciliation);
    setAnnotationContextMenu((current) => current
      ? {
        ...current,
        selection: {
          ...current.selection,
          range: reconcileCapturedSelectionTextOwner(
            current.selection.range,
            draftOwnerReconciliation,
          ),
        },
      }
      : current);
    const reconciledAnnotations = reconcileAnnotationTruthTextOwner(
      annotationTruths,
      draftOwnerReconciliation,
    );
    if (reconciledAnnotations !== annotationTruths) {
      void onSaveAnnotationTruths(reconciledAnnotations);
    }
  }, [
    annotationTruths,
    draftOwnerReconciliation,
    onSaveAnnotationTruths,
    reconcileTextOwner,
  ]);
  const suggestedLabelName = useMemo(
    () => nextNeutralLabelName(annotationTruths),
    [annotationTruths],
  );

  const getCurrentTextFlowForBlock = (blockId: string): TextBlockContentV1 | null => {
    const block = visibleBlocks.find((item) => item.id === blockId);
    if (!block) return null;
    return blockTextFlowDrafts[blockId] || getTextFlowContent(block.content_json);
  };
  const plainTextFromTextFlow = (textFlow: TextBlockContentV1): string => (
    textFlow.units.map((unit) => unit.text).join('\n')
  );
  const saveBlockAndConsumeOutcome = async (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ): Promise<NoteBlock | null> => {
    const outcome = await onSaveBlock(block, text, options);
    return outcome.status === 'saved' ? outcome.block : null;
  };
  const hasMeaningfulRenderableContent = useMemo(() => hasMeaningfulWritingSurfaceContent({
    allBlocks,
    annotationTruths,
    blockTextDrafts,
    canvasObjects: noteCanvasRuntime.canvasObjects,
    canvasPlacements: noteCanvasRuntime.canvasPlacements,
    contentMounts: noteCanvasRuntime.contentMounts,
    imageObjects: noteCanvasRuntime.imageObjects,
    surfaceMode,
    structuredObjects: noteCanvasRuntime.structuredObjects,
    visibleBlocks,
  }), [
    allBlocks,
    annotationTruths,
    blockTextDrafts,
    noteCanvasRuntime.canvasObjects,
    noteCanvasRuntime.canvasPlacements,
    noteCanvasRuntime.contentMounts,
    noteCanvasRuntime.imageObjects,
    noteCanvasRuntime.structuredObjects,
    surfaceMode,
    visibleBlocks,
  ]);
  const hasPendingDurableEditor = hasLegitimatePendingWritingEditor({
    creatingDraft,
    draftActive,
    focusedTextOwner,
    interactionState,
    placementPending,
  });

  useEffect(() => {
    // A paper ink save rebuilds world geometry. Keep its selection so Delete
    // and the next drag still act on the stroke after persistence completes.
    setSelectedCanvasObjectId((id) => noteCanvasRuntime.canvasObjects.some(
      (object) => object.objectId === id && object.kind === 'freehand' && object.status === 'active',
    ) ? id : null);
  }, [noteCanvasRuntime.canvasObjects]);

  useEffect(() => {
    if (!selectedBlockId) return undefined;
    const refreshOverlayPosition = () => setOverlayPositionRevision((value) => value + 1);
    window.addEventListener('resize', refreshOverlayPosition);
    window.addEventListener('scroll', refreshOverlayPosition, true);
    return () => {
      window.removeEventListener('resize', refreshOverlayPosition);
      window.removeEventListener('scroll', refreshOverlayPosition, true);
    };
  }, [selectedBlockId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const annotationPanelOpen = selectedAnnotationIds.length > 0 || contentGroupPanelOpen;
    if (annotationPanelOpen) {
      document.body.setAttribute('data-coincides-annotation-panel-open', 'true');
    } else {
      document.body.removeAttribute('data-coincides-annotation-panel-open');
    }
    return () => {
      document.body.removeAttribute('data-coincides-annotation-panel-open');
    };
  }, [contentGroupPanelOpen, selectedAnnotationIds.length]);

  useEffect(() => {
    if (!selectionDraft) return undefined;

    const handleGlobalMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-selection-toolbar="true"], [data-selection-typography-toolbar="true"], [data-selection-draft-handle="true"], [data-annotation-context-menu="true"], [data-command-context-menu="true"], [data-inline-name-prompt="true"], [role="dialog"]')) return;
      if (target.closest('textarea, input, select, [contenteditable="true"]')) return;
      if (target.closest('[data-text-unit-id][data-text-flow-id][data-block-id]')) return;
      clearDraft();
      setAnnotationContextMenu(null);
    };

    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearDraft();
      setAnnotationContextMenu(null);
      setAnnotationHighlightContextMenu(null);
      setBlockContextMenu(null);
      setSelectedCanvasObjectId(null);
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, true);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [clearDraft, selectionDraft]);

  const worldPointFromClientPoint = (point: CanvasPoint): CanvasPoint => {
    const surfaceRect = surfaceRef.current?.getBoundingClientRect();
    return viewportPointToWorldPoint({
      x: point.x - (surfaceRect?.left || 0),
      y: point.y - (surfaceRect?.top || 0),
    }, viewportTransform);
  };

  const pageFrameAtWorldPoint = (worldPoint: CanvasPoint): PageFrameModel | null => (
    [...noteCanvasRuntime.pageFrames].reverse().find((pageFrame) => (
      worldPoint.x >= pageFrame.x
      && worldPoint.x <= pageFrame.x + pageFrame.width
      && worldPoint.y >= pageFrame.y
      && worldPoint.y <= pageFrame.y + pageFrame.height
    )) || null
  );

  const handleBlockListMouseDownForDraft = (event: ReactPointerEvent<HTMLDivElement>) => {
    onBlockListMouseDown(event);
    if (event.target !== event.currentTarget) return;
    clearDraft();
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setBlockContextMenu(null);
    setSelectedAnnotationIds([]);
    if (!draftActive || draftText.trim()) return;
    onDiscardDraft();
    onClearSlashTarget();
  };

  const handleTextUnitSelection = (
    range: CapturedSelectionRange,
    anchorRect: DOMRect,
    options: { additive?: boolean; preserveDraft?: boolean; hitTestOnly?: boolean } = {},
  ) => {
    if (options.hitTestOnly) {
      if (selectionDraftContainsCapturedSelection(selectionDraft, range)) {
        activateDraft();
      } else {
        clearDraft();
        setAnnotationContextMenu(null);
      }
      return;
    }
    if (options.preserveDraft && !options.additive) return;
    if (options.additive) {
      appendDraftRange({
        range,
        anchorRect,
      });
      setAnnotationContextMenu(null);
      return;
    }
    replaceDraft({
      range,
      anchorRect,
    });
    setAnnotationContextMenu(null);
  };

  const handleTextUnitContextMenu = (
    range: CapturedSelectionRange,
    anchorRect: DOMRect,
    point: { x: number; y: number },
  ) => {
    const selection = { range, anchorRect };
    if (!selectionDraftContainsCapturedSelection(selectionDraft, range)) {
      replaceDraft({
        range,
        anchorRect,
      });
    }
    setBlockContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setAnnotationContextMenu({ selection, point });
  };

  const handleCreateAnnotation = async (label: string) => {
    if (!selectionDraft || selectionDraft.ranges.length === 0) return;
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft.ranges);
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: label.trim() || suggestedLabelName,
      ranges,
    });
    const nextAnnotations = [...annotationTruths, annotation];
    await onSaveAnnotationTruths(nextAnnotations);
    setSelectedAnnotationIds([annotation.id]);
    setAnnotationContextMenu(null);
    clearDraft();
  };

  const handleAddRangeToDraft = async () => {
    setAnnotationContextMenu(null);
  };

  const textFromSelectionDraft = () => (
    selectionDraft?.ranges.map((range) => {
      const start = Math.max(0, Math.min(range.text.length, range.startOffset));
      const end = Math.max(0, Math.min(range.text.length, range.endOffset));
      return sliceGraphemes(range.text, Math.min(start, end), Math.max(start, end));
    }).filter(Boolean).join('\n') || ''
  );

  const copyTextToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Browser clipboard can be unavailable in some test contexts.
    }
  };

  const handleCommitAnnotationDraft = async (label: string) => {
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft?.ranges || []);
    if (ranges.length === 0) return;
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: label.trim() || suggestedLabelName,
      ranges,
    });
    await onSaveAnnotationTruths([...annotationTruths, annotation]);
    setSelectedAnnotationIds([annotation.id]);
    setAnnotationContextMenu(null);
    clearDraft();
  };

  const handleRenameAnnotation = async (annotationId: string, nextLabel: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? renameAnnotationTruth(annotation, nextLabel) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleUpdateAnnotationColor = async (annotationId: string, colorToken: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? updateAnnotationColorToken(annotation, colorToken) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    const target = annotationTruths.find((annotation) => annotation.id === annotationId);
    const childIdsToDelete = new Set<string>();
    const collectDescendants = (annotation: AnnotationTruthV1) => {
      getChildAnnotations({ parent: annotation, annotations: annotationTruths, includeHidden: true }).forEach((child) => {
        if (childIdsToDelete.has(child.id)) return;
        childIdsToDelete.add(child.id);
        collectDescendants(child);
      });
    };
    if (target) collectDescendants(target);
    const parent = target ? getParentAnnotation({ annotation: target, annotations: annotationTruths, includeHidden: true }) : null;
    const nextAnnotations = annotationTruths.map((annotation) => {
      if (annotation.id === annotationId || childIdsToDelete.has(annotation.id)) {
        return softDeleteAnnotationTruth(annotation);
      }
      if (parent && annotation.id === parent.id) {
        return {
          ...annotation,
          child_annotation_ids: annotation.child_annotation_ids.filter((id) => id !== annotationId),
        };
      }
      return annotation;
    });
    await onSaveAnnotationTruths(nextAnnotations);
    setSelectedAnnotationIds((current) => current.filter((id) => id !== annotationId && !childIdsToDelete.has(id)));
  };

  const handleHideAnnotation = async (annotationId: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? hideAnnotationTruth(annotation) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleRestoreAnnotation = async (annotationId: string) => {
    const nextAnnotations = annotationTruths.map((annotation) => (
      annotation.id === annotationId ? restoreAnnotationTruth(annotation) : annotation
    ));
    await onSaveAnnotationTruths(nextAnnotations);
  };

  const handleCreateBlockAnnotation = async (block: NoteBlock, text: string) => {
    const annotation = createAnnotationTruth({
      noteId,
      canvasId: `note-canvas-${noteId}`,
      label: 'block',
      ranges: [createBlockAnnotationRange({
        blockId: block.id,
        text,
      })],
    });
    await onSaveAnnotationTruths([...annotationTruths, annotation]);
    setSelectedAnnotationIds([annotation.id]);
  };

  const handleEditAnnotationRangeText = async (input: {
    annotationId: string;
    rangeId: string;
    nextText: string;
  }) => {
    const annotation = annotationTruths.find((item) => item.id === input.annotationId);
    const range = annotation?.ranges.find((item) => item.id === input.rangeId);
    if (!annotation || !range || !range.block_id || !range.text_unit_id) return;

    const block = visibleBlocks.find((item) => item.id === range.block_id);
    const currentTextFlow = getCurrentTextFlowForBlock(range.block_id);
    const currentUnit = currentTextFlow?.units.find((unit) => unit.id === range.text_unit_id);
    if (!block || !currentTextFlow || !currentUnit) return;

    const editResult = applySourceBackedAnnotationRangeEdit({
      annotations: annotationTruths,
      annotationId: input.annotationId,
      rangeId: input.rangeId,
      currentText: currentUnit.text,
      replacementText: input.nextText,
    });
    if (!editResult) return;

    const nextTextFlow = replaceTextUnitText({
      textFlow: currentTextFlow,
      textUnitId: range.text_unit_id,
      nextText: editResult.next_text,
      edit: {
        editedStartOffset: range.target_kind === 'text_span' ? range.start_offset ?? 0 : 0,
        editedEndOffset: range.target_kind === 'text_span'
          ? range.end_offset ?? range.start_offset ?? 0 : currentUnit.text.length,
        replacementText: input.nextText,
      },
    });
    const nextPlainText = plainTextFromTextFlow(nextTextFlow);

    onBlockTextFlowChange((current) => ({
      ...current,
      [range.block_id as string]: nextTextFlow,
    }));
    onBlockTextChange(range.block_id, nextPlainText, nextPlainText.length, null);
    const savedBlock = await saveBlockAndConsumeOutcome(block, nextPlainText, {
      silent: true,
      textFlow: nextTextFlow,
    });
    // Do not continue an unconfirmed range edit into a newer hydration.
    if (!savedBlock || savedBlock.id !== range.block_id) return;
    await onSaveAnnotationTruths(editResult.next_annotations);
  };

  const handleBlockTextFlowChange = async (
    block: NoteBlock,
    nextTextFlow: TextBlockContentV1,
    metadata?: TextFlowEditMetadata,
    previousTextFlow?: TextBlockContentV1,
  ) => {
    await onApplyBlockTextFlowEdit(block, nextTextFlow, { metadata, previousTextFlow });
  };

  const textFlowWithPlainText = (
    block: NoteBlock,
    nextText: string,
  ): TextBlockContentV1 => {
    const currentTextFlow = blockTextFlowDrafts[block.id] || getTextFlowContent(block.content_json);
    const firstUnit = currentTextFlow?.units[0];
    if (currentTextFlow && firstUnit) {
      return replaceTextUnitText({
        textFlow: currentTextFlow,
        textUnitId: firstUnit.id,
        nextText,
      });
    }
    return createTextBlockContentV1(nextText);
  };

  const handlePlainTextBackedBlockChange = (
    block: NoteBlock,
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    onBlockTextChange(block.id, value, caret, anchorElement);
    void handleBlockTextFlowChange(block, textFlowWithPlainText(block, value));
  };

  const blockSaveTextAndFlow = (
    block: NoteBlock,
    text: string,
    fieldValues?: FieldValueRecord,
    textFlow?: TextBlockContentV1,
  ): { text: string; textFlow?: TextBlockContentV1 } => {
    const presentationKind = presentationKindForBlock(block);
    const formulaText = presentationKind === 'formula' && typeof fieldValues?.latex_input === 'string'
      ? fieldValues.latex_input
      : null;
    const nextText = formulaText ?? blockTextDrafts[block.id] ?? text;
    if (textFlow) return { text: nextText, textFlow };
    if (presentationKind === 'formula' || presentationKind === 'code') {
      return { text: nextText, textFlow: textFlowWithPlainText(block, nextText) };
    }
    return { text: nextText, textFlow: blockTextFlowDrafts[block.id] };
  };

  const applyWritingRoleToSelection = async (actionId: CommandActionId) => {
    const role = WRITING_ROLE_BY_COMMAND[actionId];
    if (!role || !selectionDraft) return;

    const blockIds = Array.from(new Set(selectionDraft.ranges.map((range) => range.blockId)));
    for (const blockId of blockIds) {
      const block = visibleBlocks.find((item) => item.id === blockId);
      const currentTextFlow = getCurrentTextFlowForBlock(blockId);
      if (!block || !currentTextFlow) continue;

      const unitIds = new Set(
        selectionDraft.ranges
          .filter((range) => range.blockId === blockId)
          .map((range) => range.textUnitId),
      );
      let nextTextFlow = currentTextFlow;
      unitIds.forEach((unitId) => {
        nextTextFlow = setTextUnitWritingRole(nextTextFlow, unitId, role);
      });

      const nextPlainText = plainTextFromTextFlow(nextTextFlow);
      await handleBlockTextFlowChange(block, nextTextFlow);
      onBlockTextChange(block.id, nextPlainText, nextPlainText.length, null);
      const savedBlock = await saveBlockAndConsumeOutcome(block, nextPlainText, {
        silent: true,
        textFlow: nextTextFlow,
      });
      if (!savedBlock) return;
    }

    clearDraft();
    setAnnotationContextMenu(null);
  };

  const openAnnotationNamePrompt = (input: Exclude<AnnotationNamePromptState, null>) => {
    setAnnotationNamePrompt(input);
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
  };

  const createContentGroupFromMembers = async (input: {
    title: string;
    members: ReturnType<typeof createContentGroupMemberFromRange>[];
  }) => {
    if (input.members.length === 0) {
      setContentGroupPanelOpen(true);
      return;
    }
    const nextGroup = createContentGroup({
      projectId,
      noteId,
      canvasId: `note-canvas-${noteId}`,
      title: input.title,
      members: input.members,
      folderId: noteRootGroupFolderId,
      folders: groupFolders,
    });
    await onSaveContentGroups([...contentGroups, nextGroup]);
    setContentGroupPanelOpen(true);
  };

  const createContentGroupFromSelection = async () => {
    const ranges = selectionDraftRangesToAnnotationRanges(selectionDraft?.ranges || []);
    await createContentGroupFromMembers({
      title: 'New content group',
      members: ranges.map((range, index) => createContentGroupMemberFromRange(range, index)),
    });
    clearDraft();
    setAnnotationContextMenu(null);
  };

  const handleAnnotationNamePromptCommit = async (value: string) => {
    const prompt = annotationNamePrompt;
    if (!prompt) return;
    const label = value.trim();
    if (!label) return;
    setAnnotationNamePrompt(null);

    if (prompt.kind === 'label') {
      await handleCreateAnnotation(label);
      return;
    }
  };

  const handleSelectionContextAction = async (actionId: CommandActionId) => {
    if (actionId === 'copy') {
      await copyTextToClipboard(textFromSelectionDraft());
      return;
    }
    if (actionId === 'label') {
      openAnnotationNamePrompt({
        kind: 'label',
        point: annotationContextMenu?.point || { x: 24, y: 120 },
        initialValue: suggestedLabelName,
      });
      return;
    }
    if (actionId === 'add_selection_to_content_group') {
      await createContentGroupFromSelection();
      return;
    }
    if (actionId === 'open_content_groups') {
      setContentGroupPanelOpen(true);
      return;
    }
    if (WRITING_ROLE_BY_COMMAND[actionId]) {
      await applyWritingRoleToSelection(actionId);
    }
  };

  const handleAnnotationContextMenu = (annotationId: string, point: { x: number; y: number }) => {
    setSelectedAnnotationIds([annotationId]);
    setAnnotationContextMenu(null);
    setBlockContextMenu(null);
    setAnnotationHighlightContextMenu({ annotationId, point });
  };

  const handleAnnotationHighlightContextAction = async (actionId: CommandActionId) => {
    const annotationId = annotationHighlightContextMenu?.annotationId;
    if (!annotationId) return;
    const annotation = annotationTruths.find((item) => item.id === annotationId);
    if (!annotation) return;

    if (actionId === 'open_label') {
      setSelectedAnnotationIds([annotationId]);
      return;
    }
    if (actionId === 'add_label_to_content_group') {
      await createContentGroupFromMembers({
        title: annotation.raw_label || 'New content group',
        members: [createContentGroupMemberFromAnnotation(annotation, 0)],
      });
      setSelectedAnnotationIds([annotationId]);
      setAnnotationHighlightContextMenu(null);
      setContentGroupPanelOpen(true);
      return;
    }
    if (actionId === 'hide_label') {
      await handleHideAnnotation(annotationId);
      return;
    }
    if (actionId === 'copy') {
      await copyTextToClipboard(
        annotation.ranges
          .filter(annotationRangeIsRenderable)
          .map((range) => range.range_text_cache || '')
          .filter(Boolean)
          .join('\n'),
      );
    }
  };

  const handleBlockContextAction = async (actionId: CommandActionId) => {
    const blockId = blockContextMenu?.blockId;
    if (!blockId) return;
    const block = visibleBlocks.find((item) => item.id === blockId);
    const layout = blockLayouts[blockId];
    if (!block || !layout) return;
    const text = blockTextDrafts[block.id] ?? textFromContent(block);

    if (actionId === 'save_block') {
      await saveBlockAndConsumeOutcome(block, text, {
        silent: false,
        textFlow: blockTextFlowDrafts[block.id],
      });
      return;
    }
    if (actionId === 'label_block') {
      await handleCreateBlockAnnotation(block, text);
      return;
    }
    if (actionId === 'add_block_to_content_group') {
      clearDraft();
      setSelectedAnnotationIds([]);
      await createContentGroupFromMembers({
        title: block.title || block.block_type || 'New content group',
        members: [createContentGroupMemberFromBlock(block, 0)],
      });
      onSelectBlock(block.id);
      setBlockContextMenu(null);
      setContentGroupPanelOpen(true);
      return;
    }
    if (actionId === 'toggle_block_export') {
      onToggleExportRole(block, layout);
      return;
    }
    if (actionId === 'toggle_block_ai_visibility') {
      onToggleAIVisibility(block, layout);
      return;
    }
    if (actionId === 'trash_block') {
      onTrashBlock(block.id);
    }
  };

  const getBlockControlAnchorForLayout = (layout: BlockBoxLayout) => {
    const worldRect = resolveScreenRect(layout, selectPlacementFrame(layout, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract), noteCanvasRuntime.coordinateContract, pageOffsetX);

    const blockListRect = blockListRef.current?.getBoundingClientRect();
    if (!blockListRect) return null;
    return getBlockControlAnchorFromRect({
      left: blockListRect.left + worldRect.x * pageReading.displayScale,
      right: blockListRect.left + (worldRect.x + worldRect.width) * pageReading.displayScale,
      top: blockListRect.top + worldRect.y * pageReading.displayScale,
      bottom: blockListRect.top + (worldRect.y + worldRect.height) * pageReading.displayScale,
    });
  };

  const textSelectionContextMenu: CommandSurfaceMenu | null = annotationContextMenu ? {
    id: 'text-selection-context-menu',
    kind: 'text_selection',
    point: annotationContextMenu.point,
    title: 'Selection',
    items: buildTextSelectionMenu(),
  } : null;

  const annotationHighlightMenu: CommandSurfaceMenu | null = annotationHighlightContextMenu ? {
    id: `annotation-highlight-menu-${annotationHighlightContextMenu.annotationId}`,
    kind: 'annotation_highlight',
    point: annotationHighlightContextMenu.point,
    title: 'Label',
    items: buildAnnotationHighlightMenu(),
  } : null;

  const blockShellMenu: CommandSurfaceMenu | null = blockContextMenu && !contentReadOnly ? {
    id: `block-shell-menu-${blockContextMenu.blockId}`,
    kind: 'block_shell',
    point: blockContextMenu.point,
    title: 'Block',
    items: buildBlockShellMenu().filter((item) => item.id !== 'save-block'
      || visibleBlocks.find((block) => block.id === blockContextMenu.blockId)?.block_type !== 'item_ref'),
  } : null;

  const blankDropTextFromEvent = (event: DragEvent<HTMLElement>): string | null => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    if (!payload) return null;
    const text = plainTextFromContentGroupDragPayload(payload).trimEnd();
    return text.trim() ? text : null;
  };

  const isBlankSurfaceDropTarget = (event: DragEvent<HTMLElement>): boolean => {
    const target = event.target;
    if (!(target instanceof Element)) return true;
    return !target.closest([
      '[data-note-block-shell="true"]',
      '[data-command-context-menu="true"]',
      '[data-content-group-panel="true"]',
      '[data-canvas-shape="true"]',
      '[data-canvas-image="true"]',
      '[data-canvas-table="true"]',
      '[data-canvas-visual-connector="true"]',
      'textarea',
      'input',
      'select',
      'button',
      'a',
      '[role="button"]',
    ].join(','));
  };

  const layoutForBlankDrop = (event: DragEvent<HTMLElement>): BlockBoxLayout | null => {
    const height = Math.max(DEFAULT_BLOCK_HEIGHT, defaultDraftLayout.height);

    const blockListRect = blockListRef.current?.getBoundingClientRect();
    if (!blockListRect) return null;
    return screenLayoutToLocal({
      ...defaultDraftLayout,
      y: Math.max(0, (event.clientY - blockListRect.top) / pageReading.displayScale),
      height,
      surface: 'formal_page',
    }, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract);
  };

  const handleExtractTextUnit = (block: NoteBlock, unitId: string, point: CanvasPoint) => {
    if (contentReadOnly || layoutMode || !onExtractTextUnit) return;
    const extractionFlow = blockTextFlowDrafts[block.id] ?? getTextFlowContent(block.content_json);
    if (!extractionFlow?.units.some((unit) => unit.id === unitId)) {
      addToast('info', 'Edit and save this block before moving a unit.');
      return;
    }
    const surface = surfaceRef.current;
    const hit = document.elementFromPoint(point.x, point.y);
    if (!surface || !hit || !surface.contains(hit) || hit.closest([
      '[data-note-block-shell="true"]', '[data-command-context-menu="true"]',
      '[data-content-group-panel="true"]', '[data-canvas-shape="true"]',
      '[data-canvas-image="true"]', '[data-canvas-table="true"]',
      '[data-canvas-visual-connector="true"]', 'textarea', 'input', 'button', 'a', '[role="button"]',
    ].join(','))) return;
    let layout: BlockBoxLayout | null = null;
    const freeLayout = (x: number, y: number, contentWidth: number) => {
      const placed = createBlankDraftLayout({ policy: createSurfaceModePolicy('page'), snapEnabled: false,
        rawX: x, rawY: y, contentWidth, defaultDraftLayout });
      // A successful free drop keeps its release point. The ordinary landing
      // engine supplies available width; its edge-clamped points are rejected.
      if (Math.abs(placed.x - x) > 0.001 || Math.abs(placed.y - y) > 0.001) return null;
      return screenLayoutToLocal({ ...defaultDraftLayout, ...placed, surface: 'formal_page' },
        noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract);
    };
    if (surfaceMode === 'page') {
      const rect = blockListRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (point.x - rect.left) / pageReading.displayScale;
      const y = (point.y - rect.top) / pageReading.displayScale;
      if (x < -pageReading.inset.left || x > pageReading.paperWidth - pageReading.inset.left
        || y < -pageReading.inset.top || y > pageReading.paperHeight - pageReading.inset.top) return;
      layout = freeLayout(x - pageOffsetX, y, pageReading.layoutWidth);
    } else {
      const world = worldPointFromClientPoint(point);
      const frame = pageFrameAtWorldPoint(world);
      if (!frame) return;
      layout = freeLayout(world.x - pageOffsetX, world.y, frame.width - frame.contentInset.left - frame.contentInset.right);
    }
    if (layout) void onExtractTextUnit(block, unitId, layout);
    else addToast('info', 'There is not enough room for a block at this point.');
  };

  const handleBlankSurfaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
    if (surfaceMode === 'page' && onDropTrayBlock && event.dataTransfer.types.includes(TRAY_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      return;
    }
    if (!hasContentGroupDragPayloadType(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleStagingDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (hostMode !== 'modal' || !event.dataTransfer.types.includes(BOARD_STAGING_MIME)) return;
    // Keep a staged row out of TextFlow's text-drop path, including over a block.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = stagingItemDrop && !contentReadOnly && !itemDropPending.current ? 'copy' : 'none';
  };

  const handlePasteImage = async (block: NoteBlock, file: File) => {
    if (contentReadOnly || layoutMode) return;
    if (mediaPastePending.current) {
      addToast('info', 'An image is still being added. Please wait.');
      return;
    }
    const session = mediaPasteSession.current;
    const isCurrent = () => session.active && mediaPasteSession.current === session;
    mediaPastePending.current = true;
    try {
      const collection = { pageFrames: noteCanvasRuntime.pageFrames, primaryFrameId: noteCanvasRuntime.primaryPageFrame?.id ?? null };
      const storedAnchor = blockLayouts[block.id];
      const anchor = storedAnchor && normalizeBlockLayoutForSave(storedAnchor, collection, noteCanvasRuntime.coordinateContract);
      const frame = anchor && selectPlacementFrame(anchor, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract);
      if (!anchor || !frame || anchor.surface === 'canvas_workspace' || anchor.surface === 'tray') {
        addToast('error', 'Save this text block on a page before pasting an image.');
        return;
      }
      const occupied = Object.values(blockLayouts).filter((layout) => layout.surface !== 'canvas_workspace' && layout.surface !== 'tray')
        .map((layout) => normalizeBlockLayoutForSave(layout, collection, noteCanvasRuntime.coordinateContract));
      const created = await pasteMediaBlock({ noteId, blockId: block.id, file, anchor, frame, occupied,
        isCurrent, createBlock: onCreateBlock });
      if (created && isCurrent()) {
        onSelectBlock(created.id);
        addToast('success', 'Image added');
      }
    } catch (error) {
      if (isCurrent()) addToast('error', error instanceof Error ? `Could not add image: ${error.message}` : 'Could not add image. Please try again.');
    } finally {
      mediaPastePending.current = false;
    }
  };

  const handleStagingDrop = (event: DragEvent<HTMLDivElement>) => {
    if (hostMode !== 'modal' || !event.dataTransfer.types.includes(BOARD_STAGING_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    if (contentReadOnly || itemDropPending.current) return;
    const itemId = resolveStagingItemDrop(event.dataTransfer.getData(BOARD_STAGING_MIME), stagingItemDrop);
    const layout = layoutForBlankDrop(event);
    if (!itemId || !layout) return;
    itemDropPending.current = true;
    // Reuse ordinary durable block creation and placement, without a template registration.
    void onCreateBlock({ ...defaultTextTemplate, legacy_block_type: 'item_ref' }, '', {
      contentJson: { item_id: itemId } satisfies ItemRefBlockData, layout,
    }).then((created) => {
      if (created) onSelectBlock(created.id);
    }).finally(() => { itemDropPending.current = false; });
  };

  const handleBlankSurfaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
    const trayPlacementId = event.dataTransfer.getData(TRAY_DRAG_TYPE);
    if (surfaceMode === 'page' && onDropTrayBlock && trayPlacementId) {
      const layout = layoutForBlankDrop(event);
      if (!layout) return;
      event.preventDefault();
      event.stopPropagation();
      void onDropTrayBlock(trayPlacementId, layout);
      return;
    }
    const droppedText = blankDropTextFromEvent(event);
    if (!droppedText) return;
    const layout = layoutForBlankDrop(event);
    if (!layout) return;
    event.preventDefault();
    event.stopPropagation();
    void onPersistDraft(droppedText, {
      layout,
      textFlow: createTextFlowFromDroppedText(droppedText),
    });
  };

  return (
    <DocumentTextFlowSelectionContext.Provider value={documentTextSelection}>
    <section
      ref={surfaceRef}
      data-text-unit-move-scope={noteId}
      className={`${styles.writingSurface} ${styles.pageReadingSurface} ${overviewOpen ? styles.overviewWritingSurface : ''}`}
      data-page-frame-template={primaryPageFrameExtension?.templateId || primaryPageFrame?.templateId || 'none'}
      data-page-frame-background={primaryPageFrameExtension?.background.kind || primaryPageFrame?.background?.kind || 'none'}
      style={surfaceMode === 'page' ? primaryPageFrameTemplateStyle as CSSProperties & Record<string, string> : undefined}
    >
      {hostMode === 'modal' && !hasMeaningfulRenderableContent && (
        <p data-staging-empty-hint="true">Drag items from staging</p>
      )}
      <div
        className={surfaceMode === 'page' ? styles.pageReadingSpace : undefined}
        data-page-reading-space={surfaceMode === 'page' ? 'true' : undefined}
        // Overview takes keyboard focus without committing the suspended editor.
        // Keep its draft and focus receipt alive until ordinary editing resumes.
        onBlurCapture={overviewOpen ? (event) => event.stopPropagation() : undefined}
        style={surfaceMode === 'page' ? {
          width: pageDisplayBounds.width * pageReading.displayScale,
          height: (pageDisplayBounds.height + displayHeaderHeight) * pageReading.displayScale,
          // overflow-clip-margin rejects calc() in the supported browser.
          // Keep the incumbent literal length, extending only warm paper's shadow.
        overflowClipMargin: `${((paperSkin?.materialPreset ?? paperSkin?.preset) === 'warm-paper' ? 80 : 32) * pageReading.displayScale}px`,
        } : { display: 'contents' }}
      >
      {surfaceMode === 'page' && paperHeader && <div className={styles.pageReadingHeaderBand}
        data-note-header-band="true" style={{
          ...primaryPageFrameTemplateStyle,
          width: pageReading.paperWidth,
          height: pageDisplayBounds.height + displayHeaderHeight,
          left: -pageDisplayBounds.left * pageReading.displayScale,
          transform: `scale(${pageReading.displayScale})`, transformOrigin: '0 0',
        }}>
        <NotePaperHeader key={noteId} {...paperHeader} onHeightChange={setHeaderHeight} metadataHidden={overviewOpen}
          style={{ paddingLeft: pageReading.inset.left, paddingRight: pageReading.inset.right }} />
      </div>}
      <div
        className={surfaceMode === 'page' ? styles.pageReadingPaper : undefined}
        data-page-display-scale={surfaceMode === 'page' ? pageReading.displayScale : undefined}
        data-page-reading-gear={surfaceMode === 'page' ? readingViewState.gear : undefined}
        data-page-reading-effective-gear={surfaceMode === 'page' ? pageReading.effectiveGear : undefined}
        data-page-reading-step={surfaceMode === 'page' ? readingViewState.stepFactor : undefined}
        style={surfaceMode === 'page' ? {
          ...primaryPageFrameTemplateStyle,
          width: pageReading.paperWidth,
          height: pageReading.paperHeight,
          ...(paperHeader ? { background: 'transparent', outline: 'none' } : {}),
          left: -pageDisplayBounds.left * pageReading.displayScale,
          top: (displayHeaderHeight - pageDisplayBounds.top) * pageReading.displayScale,
          paddingTop: pageReading.inset.top,
          paddingLeft: pageReading.inset.left,
          transform: `scale(${pageReading.displayScale})`,
          transformOrigin: '0 0',
        } : { display: 'contents' }}
      >
      <div
        ref={blockListRef}
        tabIndex={-1}
        className={`${styles.blockList} ${styles.blockListPage} ${layoutMode && !contentReadOnly ? styles.layoutMode : ''}`}
        data-source-content-read-only={contentReadOnly ? 'true' : 'false'}
        data-canvas-engine-version={noteCanvasRuntime.version}
        data-canvas-engine-route={noteCanvasRuntime.route}
        data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
        data-canvas-world-width={Math.round(noteCanvasRuntime.world.width)}
        data-canvas-world-height={Math.round(noteCanvasRuntime.world.height)}
        data-canvas-page-frame={primaryPageFrameId}
        data-canvas-object-id={primaryPageFrameId}
        data-canvas-surface-mode={surfacePolicyMode}
        data-canvas-interaction-mode={interactionState.mode}
        data-canvas-interaction-target={interactionState.target}
        data-canvas-interaction-block={interactionState.blockId || ''}
        data-canvas-viewport-x={Math.round(noteCanvasRuntime.viewport.x)}
        data-canvas-viewport-y={Math.round(noteCanvasRuntime.viewport.y)}
        data-canvas-viewport-zoom={noteCanvasRuntime.viewport.zoom.toFixed(3)}
        data-page-frame-id={primaryPageFrameId}
        data-page-frame-role={primaryPageFrameRole}
        data-page-frame-primary={primaryPageFramePrimary}
        data-page-frame-exportable={primaryPageFrameExportable}
        data-page-frame-template={primaryPageFrameExtension?.templateId || primaryPageFrame?.templateId || 'none'}
        data-page-frame-background={primaryPageFrameExtension?.background.kind || primaryPageFrame?.background?.kind || 'none'}
        data-page-frame-page-size={primaryPageFrameExtension?.pageSize || primaryPageFrame?.pageSize || 'none'}
        data-page-frame-inset-left={primaryPageFrame?.contentInset.left || 0}
        data-page-frame-inset-right={primaryPageFrame?.contentInset.right || 0}
        data-document-typography-profile={documentTypography.profileId}
        data-document-font-size={documentTypography.fontSizePx}
        data-document-line-height={documentTypography.lineHeightPx}
        style={{
          minHeight: pageReading.paperHeight - pageReading.inset.top - pageReading.inset.bottom,
          ...(surfaceMode === 'page' ? { width: pageReading.layoutWidth } : {}),
          ...documentTypographyStyle,
          ...primaryPageFrameTemplateStyle,
          '--formal-page-offset-x': `${primaryPageFrameX}px`,
          '--formal-page-width': `${primaryPageFrameWidth}px`,
        } as CSSProperties & Record<string, string | number>}
        onMouseDown={contentReadOnly ? undefined : handleBlockListMouseDownForDraft}
        onDoubleClick={contentReadOnly ? undefined : onPageSpaceDoubleClick}
        onDragOver={contentReadOnly ? undefined : handleBlankSurfaceDragOver}
        onDrop={contentReadOnly ? undefined : handleBlankSurfaceDrop}
        onDragOverCapture={handleStagingDragOver}
        onDropCapture={handleStagingDrop}
      >
        {surfaceMode === 'page' && !overviewOpen && noteCanvasRuntime.coordinateContract === 'v2'
          && visiblePageFrames.map((frame) => (
            <PageFrameWallLayer key={`${frame.id}:walls`}
              frame={projectPageFrameToReadingSurface(frame, noteCanvasRuntime.coordinateContract, pageOffsetX)}
              idleHeaderHeight={frame.id === primaryPageFrameId ? displayHeaderHeight : 0}
              interactive={layoutMode && !contentReadOnly && Boolean(onPageFrameWallPointerDown)}
              activeWall={activePageFrameWall} onPointerDown={onPageFrameWallPointerDown} />
          ))}
        {surfaceMode === 'page' && noteCanvasRuntime.pageFrames.map((frame) => (
          <PaperInkLayer key={frame.id} frame={frame}
            displayFrame={projectPageFrameToReadingSurface(frame, noteCanvasRuntime.coordinateContract, pageOffsetX)}
            objects={noteCanvasRuntime.canvasObjects} placements={noteCanvasRuntime.canvasPlacements}
            canvasId={noteCanvasRuntime.canvasObjects[0]?.canvasId || 'primary-note-canvas'} tool={paperInkEnabled ? paperInkTool : 'selection'}
            enabled={paperInkEnabled} selectedObjectId={selectedCanvasObjectId} onSelect={setSelectedCanvasObjectId}
            onCreate={onPersistCanvasObject} onDelete={onDeleteCanvasObject} />
        ))}
        {pageFrameSlotEntries.map(({ frameId, headerFooterEnabled, pageNumberEnabled, slots }) => (
          <div key={`${frameId}:slots`}>
            {headerFooterEnabled && slots.header && (
              <div
                className={`${styles.pageFrameSlot} ${styles.pageFrameHeaderSlot}`}
                data-page-frame-slot="header"
                data-page-frame-slot-frame={frameId}
                data-page-frame-slot-source={slots.header.textSource}
                data-page-frame-slot-enabled={slots.header.enabled ? 'true' : 'false'}
                style={{
                  left: slots.header.rect.x,
                  top: slots.header.rect.y,
                  width: slots.header.rect.width,
                  height: slots.header.rect.height,
                }}
              >
                {slots.header.text ? <span>{slots.header.text}</span> : null}
              </div>
            )}
            {headerFooterEnabled && slots.footer && (
              <div
                className={`${styles.pageFrameSlot} ${styles.pageFrameFooterSlot}`}
                data-page-frame-slot="footer"
                data-page-frame-slot-frame={frameId}
                data-page-frame-slot-source={slots.footer.textSource}
                data-page-frame-slot-enabled={slots.footer.enabled ? 'true' : 'false'}
                style={{
                  left: slots.footer.rect.x,
                  top: slots.footer.rect.y,
                  width: slots.footer.rect.width,
                  height: slots.footer.rect.height,
                }}
              >
                {slots.footer.text ? <span>{slots.footer.text}</span> : null}
              </div>
            )}
            {pageNumberEnabled && slots.pageNumber && (
              <div
                className={`${styles.pageFrameSlot} ${styles.pageFramePageNumberSlot}`}
                data-page-frame-slot="page-number"
                data-page-frame-slot-frame={frameId}
                data-page-frame-slot-source={slots.pageNumber.textSource}
                data-page-frame-slot-enabled={slots.pageNumber.enabled ? 'true' : 'false'}
                style={{
                  left: slots.pageNumber.rect.x,
                  top: slots.pageNumber.rect.y,
                  width: slots.pageNumber.rect.width,
                  height: slots.pageNumber.rect.height,
                }}
              >
                <span>{slots.pageNumber.text}</span>
              </div>
            )}
          </div>
        ))}
        {pageFrameGuides.map((guides) => (
          <div key={`${guides.frameId}:guides`}>
            {pageFrameGuideVisibility.topRuler && (
              <div
                className={styles.pageFrameRulerTop}
                data-page-frame-guide="top-ruler"
                data-page-frame-guide-frame={guides.frameId}
                style={{
                  left: guides.topRuler.x,
                  top: guides.topRuler.y,
                  width: guides.topRuler.length,
                }}
              />
            )}
            {pageFrameGuideVisibility.leftRight && (
              <>
                <div
                  className={styles.pageFrameMarginGuide}
                  data-page-frame-guide="left-margin"
                  data-page-frame-guide-frame={guides.frameId}
                  style={{
                    left: guides.leftMargin.x,
                    top: guides.leftMargin.y,
                    height: guides.leftMargin.length,
                  }}
                />
                <div
                  className={styles.pageFrameMarginGuide}
                  data-page-frame-guide="right-margin"
                  data-page-frame-guide-frame={guides.frameId}
                  style={{
                    left: guides.rightMargin.x,
                    top: guides.rightMargin.y,
                    height: guides.rightMargin.length,
                  }}
                />
              </>
            )}
            {pageFrameGuideVisibility.center && (
              <div
                className={styles.pageFrameCenterGuide}
                data-page-frame-guide="center-line"
                data-page-frame-guide-frame={guides.frameId}
                style={{
                  left: guides.centerLine.x,
                  top: guides.centerLine.y,
                  height: guides.centerLine.length,
                }}
              />
            )}
          </div>
        ))}
        {snapGuide?.x !== undefined && (
          <div className={styles.snapGuideVertical} style={{ left: screenSnapGuide.x }} />
        )}
        {snapGuide?.y !== undefined && (
          <div className={styles.snapGuideHorizontal} style={{ top: screenSnapGuide.y }} />
        )}
        {visibleBlocks.map((block) => {
          const text = blockTextDrafts[block.id] ?? textFromContent(block);
          const isActive = activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id;
          const layout = blockLayouts[block.id];
          const blockControlAnchor = isActive ? getBlockControlAnchorForLayout(layout) : null;
          const affiliationOutline = resolveBlockAffiliationOutline({
            blockId: block.id,
            interactionState,
            placement: blockPlacementByBlockId.get(block.id) || null,
            pageFrames: noteCanvasRuntime.pageFrames,
          });
          return (
            <BlockEditorLayer
              key={block.id}
              block={block}
              onPasteImage={(file) => handlePasteImage(block, file)}
              coordinateContract={noteCanvasRuntime.coordinateContract}
              pageFrame={selectPlacementFrame(layout, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract)}
              textUnitGutterLaneX={surfaceMode === 'page' && layout.surface === 'formal_page' ? pageOffsetX : undefined}
              contentReadOnly={contentReadOnly}
              allowSaveRecovery={recoveryBlockIds.includes(block.id)}
              text={text}
              layout={layout}
              blockFragments={blockFragmentsByBlockId.get(block.id)}
              blockControlAnchor={blockControlAnchor}
              affiliationOutline={affiliationOutline}
              textFlowDraft={blockTextFlowDrafts[block.id]}
              annotations={annotationTruths}
              draftAnnotationRanges={draftAnnotationRanges}
              selectedAnnotationIds={selectedAnnotationIds}
              fieldDraft={blockFieldDrafts[block.id]}
              layoutMode={layoutMode && !contentReadOnly}
              saving={savingBlockId === block.id}
              active={isActive}
              autoFocus={focusBlockId === block.id}
              autoFocusReceipt={draftOwnerReconciliation?.to.blockId === block.id
                ? draftOwnerReconciliation.to
                : null}
              autoFocusSelection={draftOwnerReconciliation?.to.blockId === block.id
                ? {
                  start: draftOwnerReconciliation.selectionStart,
                  end: draftOwnerReconciliation.selectionEnd,
                }
                : null}
              onFocused={(receipt) => { setSelectedCanvasObjectId(null); onFocusBlock(receipt); }}
              onFocusReleased={onReleaseTextFocus}
              onAnnotationSelect={(annotationId) => setSelectedAnnotationIds([annotationId])}
              onAnnotationContextMenu={handleAnnotationContextMenu}
              onAnnotationStackSelect={setSelectedAnnotationIds}
              onTextUnitSelection={handleTextUnitSelection}
              onTextUnitContextMenu={handleTextUnitContextMenu}
              onBlockContextMenu={(point) => {
                setAnnotationContextMenu(null);
                setAnnotationHighlightContextMenu(null);
                setBlockContextMenu({ blockId: block.id, point });
              }}
              onTextChange={(value, caret, anchorElement) => {
                const presentationKind = presentationKindForBlock(block);
                if (presentationKind === 'formula' || presentationKind === 'code') {
                  handlePlainTextBackedBlockChange(block, value, caret, anchorElement);
                  return;
                }
                onBlockTextChange(block.id, value, caret, anchorElement);
              }}
              onTextFlowChange={(textFlow, metadata, previousTextFlow) => void handleBlockTextFlowChange(block, textFlow, metadata, previousTextFlow)}
              onTextEditBoundary={onTextEditBoundary}
              onExtractTextUnit={(unitId, point) => handleExtractTextUnit(block, unitId, point)}
              onMoveTextUnit={onMoveTextUnit ? (unitId, target) => {
                if (contentReadOnly || layoutMode || document.querySelector('[data-runtime-textflow-composing="true"]')) return;
                const destination = allBlocks.find((candidate) => candidate.id === target.blockId);
                if (destination && destination.id !== block.id && destination.block_type !== 'item_ref'
                  && presentationKindForBlock(destination) === 'paragraph') {
                  void onMoveTextUnit(block, unitId, destination, target.unitId, target.edge);
                }
              } : undefined}
              onUnitDropTargetChange={(next) => setUnitMoveTarget((current) => (
                current?.blockId === next?.blockId && current?.unitId === next?.unitId && current?.edge === next?.edge ? current : next
              ))}
              unitDropTarget={unitMoveTarget?.blockId === block.id ? unitMoveTarget : null}
              onFlowSelectionStart={clearDraft}
              onBoundaryNavigate={(request) => navigateBoundary(block.id, request)}
              onNavigationTarget={(target) => {
                if (target) textNavigationTargetsRef.current.set(block.id, target);
                else textNavigationTargetsRef.current.delete(block.id);
              }}
              onFieldDraftChange={(fieldValues) => onFieldDraftChange(block, text, fieldValues)}
              onSave={async (silent, fieldValues, textFlow) => {
                const save = blockSaveTextAndFlow(block, text, fieldValues, textFlow);
                return onSaveBlock(block, save.text, {
                  silent,
                  fieldValues,
                  textFlow: save.textFlow,
                });
              }}
              onTrash={() => onTrashBlock(block.id)}
              onSelect={() => { setSelectedCanvasObjectId(null); onSelectBlock(block.id); }}
              onBeginMove={(event) => onBeginMoveBlock(event, block, layout)}
              onBeginResize={(event) => onBeginResizeBlock(event, block, text, layout)}
              onToggleExportRole={() => onToggleExportRole(block, layout)}
              onToggleAIVisibility={() => onToggleAIVisibility(block, layout)}
              onAnnotateBlock={() => void handleCreateBlockAnnotation(block, text)}
              showBlockTypeBadge={showPreviewBlockTypes}
              showAIStatusBadge={showPreviewAIVisibility}
              showExportStatusBadge={showPreviewExportStatus}
              showLabelOverlay={showPreviewLabelOverlay}
              onKeyDown={(event) => onBlockKeyDown(block, text, event)}
              onMeasuredHeight={(height) => onMeasuredBlockHeight(block, layout, isActive, height)}
              pageOffsetX={pageOffsetX}
              anchorsBySourceRef={anchorsBySourceRef}
              sourceJumpBusy={sourceJumpBusy}
              onViewSource={onViewSource}
            />
          );
        })}

        <DraftWritingEntryLayer
          coordinateContract={noteCanvasRuntime.coordinateContract}
          pageFrame={selectPlacementFrame(draftLayout || defaultDraftLayout, noteCanvasRuntime.pageFrames, noteCanvasRuntime.coordinateContract)}
          contentReadOnly={contentReadOnly}
          creating={creatingDraft}
          draftActive={draftActive}
          focusReceipt={draftFocusReceipt}
          hasMeaningfulRenderableContent={hasMeaningfulRenderableContent}
          hasPendingDurableEditor={hasPendingDurableEditor}
          layout={draftLayout || defaultDraftLayout}
          pageOffsetX={pageOffsetX}
          phase={draftPhase}
          placementPending={placementPending}
          slashTargetActive={slashTarget?.target === 'draft'}
          textareaRef={draftRef}
          text={draftText}
          onActivate={onActivateDraft}
          onChange={onDraftChange}
          onClearSlashTarget={onClearSlashTarget}
          onDiscard={onDiscardDraft}
          onFocused={onDraftFocusReceipt}
          onFocusReleased={onReleaseTextFocus}
          onKeyDown={onDraftKeyDown}
          onPersist={(text) => onPersistDraft(text)}
          onResize={onResizeDraftFromTextarea}
        />

        {slashTarget && (
          <SlashMenuLayer
            activeCommandId={activeSlashCommandId}
            commands={slashCommands}
            onSelect={onSelectSlashCommand}
            anchor={slashTarget.anchor}
          />
        )}

      </div>
      </div>
      </div>
      {surfaceMode === 'page' && (
        <div className={`${styles.canvasZoomControl} ${styles.pageReadingControl}`} data-page-reading-control="true" role="group" aria-label="Page reading controls">
          {noteTools}
          {([{ key: 'selection', label: 'Selection', Icon: MousePointer2 },
            { key: 'pen', label: 'Pen', Icon: Pencil }, { key: 'eraser', label: 'Eraser', Icon: Eraser }] as const).map(({ key, label, Icon }) => (
            <button key={key} type="button" className={styles.canvasZoomButton} aria-label={label} title={label}
              aria-pressed={paperInkTool === key} disabled={!paperInkEnabled}
              onClick={() => { setPaperInkTool(paperInkTool === key ? 'selection' : key); }}>
              <Icon size={14} aria-hidden="true" />
            </button>
          ))}
          <ViewOptionsMenu open={showViewOptions} disabled={overviewOpen}
            activeGear={readingViewState.gear}
            onToggle={() => onToggleViewOptions?.()}
            onClose={() => onCloseViewOptions?.()}
            onSelect={(gear) => {
                onPageReadingGearChange?.(gear);
                if (gear === 'fit_page' && pageReading.isLongPage) {
                  surfaceRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]')?.scrollTo({ top: 0, behavior: 'auto' });
                }
            }} />
          {onToggleOverview && <button type="button" className={styles.canvasZoomReset}
            data-note-overview-toggle="true" aria-label="Page overview" aria-pressed={overviewOpen}
            onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
            onClick={onToggleOverview}>Overview</button>}
          <button type="button" className={styles.canvasZoomButton} aria-label="Decrease page reading step"
            disabled={overviewOpen || readingViewState.stepFactor <= 0.5} onClick={() => onPageReadingStep?.(-1)}>−</button>
          <output className={styles.pageReadingPercent} aria-label="Page display scale">{Math.round(pageReading.displayScale * 100)}%</output>
          <button type="button" className={styles.canvasZoomButton} aria-label="Increase page reading step"
            disabled={overviewOpen || readingViewState.stepFactor >= 2} onClick={() => onPageReadingStep?.(1)}>+</button>
        </div>
      )}
      <AnnotationOverlayLayer
        annotations={annotationTruths}
        selectedAnnotationId={selectedAnnotationId}
        showLabelOverlay={showPreviewLabelOverlay}
      />
      {!contentGroupPanelOpen && (
        <button
          type="button"
          className={styles.contentGroupLauncher}
          onClick={() => setContentGroupPanelOpen(true)}
          aria-label="Open content groups"
        >
          <Boxes size={16} />
          <span>Groups</span>
        </button>
      )}
      <SelectionToolbarLayer
        selection={selectionDraft && latestDraftRange ? {
          range: latestDraftRange,
          anchorRect: selectionDraft.anchorRect,
        } : null}
        onCancel={clearDraft}
        onCreateAnnotation={handleCreateAnnotation}
        suggestedLabelName={suggestedLabelName}
        draftRangeCount={draftRangeCount}
        onCommitDraft={handleCommitAnnotationDraft}
        onCancelDraft={clearDraft}
      />
      <SelectionTypographyToolbarLayer
        selection={!contentReadOnly && selectionDraft && latestDraftRange && draftRangeCount === 1 && !annotationContextMenu ? {
          range: latestDraftRange,
          anchorRect: selectionDraft.anchorRect,
        } : null}
        typographyProfile={documentTypographyProfile}
        onCopyBoardReference={copySelectionAsBoardReference}
        onSendToStaging={sendSelectionToStaging}
        onSaveTypographyProfile={onSaveDocumentTypographyProfile}
        onClose={clearDraft}
      />
      <ContextMenuLayer
        menu={textSelectionContextMenu}
        onClose={() => setAnnotationContextMenu(null)}
        onAction={(actionId) => handleSelectionContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={annotationHighlightMenu}
        onClose={() => setAnnotationHighlightContextMenu(null)}
        onAction={(actionId) => handleAnnotationHighlightContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={blockShellMenu}
        onClose={() => setBlockContextMenu(null)}
        onAction={(actionId) => handleBlockContextAction(actionId)}
      />
      <InlineNamePromptLayer
        prompt={annotationNamePrompt ? {
          point: annotationNamePrompt.point,
          title: 'Label',
          initialValue: annotationNamePrompt.initialValue,
          confirmLabel: 'Save',
        } : null}
        onCancel={() => setAnnotationNamePrompt(null)}
        onCommit={handleAnnotationNamePromptCommit}
      />
      {!contentGroupPanelOpen && selectedAnnotationIds.length > 0 && (
        <AnnotationInspectorPanel
          annotations={annotationTruths}
          selectedAnnotationIds={selectedAnnotationIds}
          onClose={() => setSelectedAnnotationIds([])}
          onDelete={handleDeleteAnnotation}
          onRename={handleRenameAnnotation}
          onUpdateColor={handleUpdateAnnotationColor}
          onHide={handleHideAnnotation}
          onRestore={handleRestoreAnnotation}
          onEditRangeText={handleEditAnnotationRangeText}
        />
      )}
      {contentGroupPanelOpen && (
        <ContentGroupPanel
          hostMode={hostMode}
          trackPendingWrite={trackPendingWrite}
          annotations={annotationTruths}
          contentGroups={contentGroups}
          groupFolders={groupFolders}
          purposeFrames={purposeFrames}
          blocks={visibleBlocks}
          selectedAnnotationIds={selectedAnnotationIds}
          draftRanges={draftAnnotationRanges}
          selectedBlockId={selectedBlockId}
          projectId={projectId}
          noteId={noteId}
          canvasId={`note-canvas-${noteId}`}
          onClose={() => setContentGroupPanelOpen(false)}
          onSaveContentGroups={onSaveContentGroups}
          onSaveGroupFolders={onSaveGroupFolders}
        />
      )}
    </section>
    </DocumentTextFlowSelectionContext.Provider>
  );
}
