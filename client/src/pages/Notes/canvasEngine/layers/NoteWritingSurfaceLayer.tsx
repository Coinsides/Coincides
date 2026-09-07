import { Boxes } from 'lucide-react';
import { usePageReadingPresentation } from '../hooks/usePageReadingPresentation';
import { createDefaultPageReadingViewState, type PageReadingGear, type PageReadingViewState } from '../pageReadingViewportService';
import type { TemplateOption } from '@/services/templateOptions';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
  type WheelEvent,
} from 'react';
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
import {
  buildAnnotationHighlightMenu,
  buildBlockShellMenu,
  buildCanvasBlankMenu,
  buildImageObjectShellMenu,
  buildCanvasObjectShellMenu,
  buildPageFrameShellMenu,
  buildTableObjectShellMenu,
  buildTextSelectionMenu,
  buildVisualConnectorShellMenu,
  WRITING_ROLE_BY_COMMAND,
  type CommandActionId,
  type CommandSurfaceMenu,
  type ObjectContextActionAvailability,
} from '../commandSurfaceService';
import {
  DEFAULT_BLOCK_HEIGHT,
  type BlockBoxLayout,
} from '../runtimeLayout';
import {
  createVisualConnectorProjection,
  createPureShapeProjection,
} from '../shapeProjectionService';
import {
  createImageObjectProjection,
  imageObjectSavePayload,
} from '../imageObjectService';
import {
  addTableColumnRight,
  addTableRowBelow,
  createTableObjectProjection,
  deleteTableColumn,
  deleteTableRow,
  normalizeTablePayload,
  type TableCellSelection,
  tableObjectSavePayload,
  updateTableCellText,
} from '../tableObjectService';
import {
  uploadCanvasImageAsset,
} from '../canvasAssetRepository';
import {
  findBackingBlockForShape,
  findShapeTextMount,
  isBlockBackedShapeObject,
  readRememberedShapeBackingBlockId,
  rememberShapeBackingBlock,
  shapeBackedBlockMetadata,
} from '../shapeTextMountService';
import {
  ensureDefaultShapeStyle,
  ensureDefaultStyleForPureShape,
  ensureStickyStyleForBlockBackedShape,
  isStickyNoteCanvasObject,
  readCanvasObjectStyleMetadata,
  writeCanvasObjectStyleMetadata,
} from '../objectStyleService';
import {
  placementForVisualConnector,
  pointForPlacementAnchor,
  visualConnectorSavePayload,
} from '../visualConnectorService';
import {
  createCanvasObjectDuplicateDraft,
  createCanvasObjectInspectorActions,
  createCanvasObjectInspectorModel,
  toggleCanvasPlacementExportVisibility,
  type CanvasObjectInspectorActionId,
} from '../objectInspectorService';
import type {
  CanvasObject,
  CanvasAIReadableNode,
  CanvasPoint,
  CanvasPlacement,
  CanvasViewport,
  CanvasWorldModel,
  ContentMount,
  DocumentTypographyProfile,
  NoteCanvasRuntimeModel,
  PageFrameModel,
  PageStackBlockFragmentProjection,
  ImageCanvasObject,
  StructuredCanvasObject,
  VisualConnector,
} from '../types';
import {
  getBlockControlAnchorFromRect,
  worldRectToViewportRect,
} from '../overlayService';
import {
  createPageFrameGuides,
  shouldShowPageFrameGuides,
} from '../pageFrameGuideService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  documentTypographyToCssVars,
} from '../pageFramePrintScaleService';
import {
  pageFrameTemplateToCssVars,
} from '../pageFrameTemplateService';
import {
  viewportPointToWorldPoint,
} from '../viewportService';
import { AnnotationInspectorPanel } from '../panels/AnnotationInspectorPanel';
import { ContentGroupPanel } from '../panels/ContentGroupPanel';
import {
  type AnnotationContextMenuState,
} from './AnnotationContextMenuLayer';
import { AnnotationOverlayLayer } from './AnnotationOverlayLayer';
import { BlockEditorLayer } from './BlockEditorLayer';
import { DraftWritingEntryLayer } from './DraftWritingEntryLayer';
import { ContextMenuLayer } from './ContextMenuLayer';
import { InlineNamePromptLayer } from './InlineNamePromptLayer';
import { ObjectInspectorLayer } from './ObjectInspectorLayer';
import { ImageObjectLayer } from './ImageObjectLayer';
import { SelectionToolbarLayer } from './SelectionToolbarLayer';
import { SelectionTypographyToolbarLayer } from './SelectionTypographyToolbarLayer';
import { ShapeObjectLayer } from './ShapeObjectLayer';
import { SlashMenuLayer } from './SlashMenuLayer';
import {
  TableObjectLayer,
  type PendingTableCellEdit,
} from './TableObjectLayer';
import { VisualConnectorLayer } from './VisualConnectorLayer';
import styles from '../../NoteDetail.module.css';
import type { DraftBlockLifecyclePhase } from '../draftBlockLifecycleReducer';
import {
  type TextFocusReceipt,
  type TextOwnerReconciliation,
} from '../textFocusReceipt';

export interface NoteWritingSurfaceLayerProps {
  activeBlockId: string | null;
  contentReadOnly: boolean;
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
  visibleBlocks: NoteBlock[];
  onCreateBlock: (
    template: TemplateOption,
    text: string,
    options?: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
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
  onPushStructuredMutationHistory: (
    objectId: string,
    before: StructuredCanvasObject['payload'],
    after: StructuredCanvasObject['payload'],
  ) => void;
  onDeleteCanvasObject: (objectId: string) => Promise<boolean>;
  onSaveAnnotationTruths: (annotations: AnnotationTruthV1[]) => Promise<void>;
  onSaveContentGroups: (groups: ContentGroupV1[]) => Promise<boolean | void>;
  onSaveDocumentTypographyProfile: (profile: DocumentTypographyProfile) => void | Promise<void>;
  onSaveGroupFolders: (folders: GroupFolderV1[]) => Promise<void>;
  onSavePurposeFrames: (purposes: PurposeFrameV1[]) => Promise<boolean | void>;
  onActivateDraft: (layout?: BlockBoxLayout) => void;
  onBeginMoveBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, layout: BlockBoxLayout) => void;
  onBeginResizeBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, text: string, layout: BlockBoxLayout) => void;
  onBlockKeyDown: (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlockListMouseDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBlockTextChange: (blockId: string, value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onBlockTextFlowChange: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
  onApplyBlockTextFlowEdit: ApplyBlockTextFlowEdit;
  onClearSlashTarget: () => void;
  onAddPageBelow: (frameId: string) => void;
  onCreatePageFrame: () => void;
  onCreatePageStack: () => void;
  onDeletePageFrame: (frameId: string) => void;
  onDetachPageFromStack: (frameId: string) => void;
  onDuplicatePageFrame: (frameId: string) => void;
  onMovePageFrame: (frameId: string, delta: CanvasPoint) => void;
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
  onPanViewportBy: (delta: CanvasPoint, world?: CanvasWorldModel) => void;
  onPersistDraft: (text: string, options?: { textFlow?: TextBlockContentV1; layout?: BlockBoxLayout }) => Promise<void>;
  onResizeDraftFromTextarea: (textarea: HTMLTextAreaElement) => void;
  onResetViewport: () => void;
  onSaveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ) => Promise<BlockSaveOutcome>;
  onScrollViewportBy: (delta: CanvasPoint, world?: CanvasWorldModel) => void;
  onSelectBlock: (blockId: string) => void;
  onSelectPageFrame: (frameId: string) => void;
  onSelectSlashCommand: (command: NoteSlashCommand) => void;
  onResizePageFrame: (frameId: string, size: { width: number; height: number }) => void;
  onSetPrimaryPageFrame: (frameId: string) => void;
  onTogglePageStackCollapse: (frameId: string) => void;
  onToggleAIVisibility: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onToggleExportRole: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onTrashBlock: (blockId: string) => void | Promise<boolean | void>;
  onForgetBlockLocally: (blockId: string) => void;
  onRestoreBlockById: (
    blockId: string,
    options?: { silent?: boolean; metadataPatch?: Record<string, unknown> },
  ) => Promise<NoteBlock | null>;
  onViewportSizeChange: (width: number, height: number, world?: CanvasWorldModel) => void;
  onViewSource: (anchorId: string) => void;
  onZoomViewportAt: (point: CanvasPoint, nextZoom: number, world?: CanvasWorldModel) => void;
}

type AnnotationNamePromptState = {
  kind: 'label';
  point: { x: number; y: number };
  initialValue: string;
} | null;

type ImageMetadataPromptState = {
  objectId: string;
  field: 'caption' | 'altText';
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

type ShapeType = 'rectangle' | 'ellipse';

function createCanvasRuntimeId(prefix: string): string {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function shapeTypeFromCanvasObject(object: CanvasObject | undefined): ShapeType {
  return object?.metadata?.shapeType === 'ellipse' || object?.metadata?.shape_type === 'ellipse'
    ? 'ellipse'
    : 'rectangle';
}

function shapeSavePayload(
  canvasObject: CanvasObject,
  placement: CanvasPlacement,
  contentMount?: ContentMount | null,
): Record<string, unknown> {
  const shapeType = shapeTypeFromCanvasObject(canvasObject);
  const blockBacked = canvasObject.backing === 'note_block'
    && canvasObject.objectClass === 'block_backed'
    && Boolean(contentMount?.targetId);
  const baseMetadata: Record<string, unknown> = {
    ...(canvasObject.metadata || {}),
    shape_type: shapeType,
  };
  const metadata = blockBacked
    ? writeCanvasObjectStyleMetadata(baseMetadata, readCanvasObjectStyleMetadata(baseMetadata))
    : ensureDefaultStyleForPureShape(baseMetadata);
  return {
    kind: 'shape',
    backing: blockBacked ? 'note_block' : 'none',
    object_class: blockBacked ? 'block_backed' : 'pure',
    placement: {
      placement_id: placement.placementId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
      frame_id: placement.frameId || null,
      surface: placement.surface,
      boundary_role: placement.boundaryRole,
      z_index: placement.zIndex,
      visibility_state: placement.visibilityState || 'normal',
      render_visibility: placement.renderVisibility || 'visible',
    },
    metadata,
    ...(blockBacked ? {
      extension: {
        block_id: contentMount?.targetId,
      },
      mount: {
        mount_id: contentMount?.mountId,
        target_id: contentMount?.targetId,
        projection_mode: contentMount?.projectionMode || 'owned',
        sync_policy: contentMount?.syncPolicy || 'manual',
      },
    } : {}),
    source: {
      source: 'shape_object',
    },
  };
}

function createShapeTextContentMount(objectId: string, blockId: string): ContentMount {
  return {
    mountId: `${objectId}:mount:shape-text`,
    objectId,
    targetKind: 'note_block',
    targetId: blockId,
    projectionMode: 'owned',
    syncPolicy: 'manual',
  };
}

function flattenCanvasAIReadableNodes(nodes: CanvasAIReadableNode[]): CanvasAIReadableNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenCanvasAIReadableNodes(node.children || []),
  ]);
}

function readImageFileDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof Image === 'undefined' || typeof URL === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    image.src = objectUrl;
  });
}

export function NoteWritingSurfaceLayer({
  activeBlockId,
  contentReadOnly,
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
  selectedPageFrameId,
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
  visibleBlocks,
  onCreateBlock,
  onPersistCanvasObject,
  onPushStructuredMutationHistory,
  onDeleteCanvasObject,
  onSaveAnnotationTruths,
  onSaveContentGroups,
  onSaveDocumentTypographyProfile,
  onSaveGroupFolders,
  onSavePurposeFrames,
  onActivateDraft,
  onBeginMoveBlock,
  onBeginResizeBlock,
  onBlockKeyDown,
  onBlockListMouseDown,
  onBlockTextChange,
  onBlockTextFlowChange,
  onApplyBlockTextFlowEdit,
  onClearSlashTarget,
  onAddPageBelow,
  onCreatePageFrame,
  onCreatePageStack,
  onDeletePageFrame,
  onDetachPageFromStack,
  onDuplicatePageFrame,
  onMovePageFrame,
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
  onPanViewportBy,
  onPersistDraft,
  onResizeDraftFromTextarea,
  onResetViewport,
  onSaveBlock,
  onScrollViewportBy,
  onSelectBlock,
  onSelectPageFrame,
  onSelectSlashCommand,
  onResizePageFrame,
  onSetPrimaryPageFrame,
  onTogglePageStackCollapse,
  onToggleAIVisibility,
  onToggleExportRole,
  onTrashBlock,
  onForgetBlockLocally,
  onRestoreBlockById,
  onViewportSizeChange,
  onViewSource,
  onZoomViewportAt,
}: NoteWritingSurfaceLayerProps) {
  const surfaceRef = useRef<HTMLElement | null>(null);
  const panSessionRef = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);
  const pageFrameOperationRef = useRef<{
    kind: 'move' | 'resize';
    frameId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const shapeOperationRef = useRef<{
    kind: 'move' | 'resize';
    objectId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const [spacePanReady, setSpacePanReady] = useState(false);
  const [canvasPanning, setCanvasPanning] = useState(false);
  const [pageFrameInteractionPreview, setPageFrameInteractionPreview] = useState<{
    frameId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [shapeInteractionPreview, setShapeInteractionPreview] = useState<{
    objectId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedCanvasObjectId, setSelectedCanvasObjectId] = useState<string | null>(null);
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
  const [canvasBlankContextMenu, setCanvasBlankContextMenu] = useState<{
    point: { x: number; y: number };
  } | null>(null);
  const [pageFrameContextMenu, setPageFrameContextMenu] = useState<{
    frameId: string;
    primary: boolean;
    point: { x: number; y: number };
  } | null>(null);
  const [shapeContextMenu, setShapeContextMenu] = useState<{
    objectId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<{
    objectId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [tableContextMenu, setTableContextMenu] = useState<{
    objectId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [selectedTableCell, setSelectedTableCell] = useState<TableCellSelection | null>(null);
  const [editingTableCell, setEditingTableCell] = useState<TableCellSelection | null>(null);
  const [visualConnectorContextMenu, setVisualConnectorContextMenu] = useState<{
    objectId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [visualConnectorDraft, setVisualConnectorDraft] = useState<{
    startObjectId: string;
  } | null>(null);
  const [contentGroupPanelOpen, setContentGroupPanelOpen] = useState(false);
  const [annotationNamePrompt, setAnnotationNamePrompt] = useState<AnnotationNamePromptState>(null);
  const [imageMetadataPrompt, setImageMetadataPrompt] = useState<ImageMetadataPromptState>(null);
  const [, setOverlayPositionRevision] = useState(0);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageInsertionPointRef = useRef<CanvasPoint | null>(null);
  const selectedAnnotationId = selectedAnnotationIds[0] || null;
  const primaryPageFrame = noteCanvasRuntime.primaryPageFrame;
  const primaryPageFrameId = primaryPageFrame?.id || 'none';
  const primaryPageFrameRole = primaryPageFrame?.role || 'none';
  const primaryPageFramePrimary = primaryPageFrame ? 'true' : 'false';
  const primaryPageFrameExportable = primaryPageFrame?.exportable ? 'true' : 'false';
  const primaryPageFrameExtension = noteCanvasRuntime.pageFrameExtensions
    .find((extension) => extension.frameId === primaryPageFrame?.id);
  const documentTypography = surfaceMode === 'page'
    ? documentTypographyProfile
    : primaryPageFrameExtension?.documentTypography || DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE;
  const documentTypographyStyle = documentTypographyToCssVars(documentTypography);
  const primaryPageFrameTemplateStyle = pageFrameTemplateToCssVars(
    primaryPageFrameExtension?.background || primaryPageFrame?.background,
  );
  const readingViewState = pageReadingViewState || createDefaultPageReadingViewState();
  const pageReading = usePageReadingPresentation({
    enabled: surfaceMode === 'page', noteId, surfaceRef, blockListRef, pageFrame: primaryPageFrame,
    pageContentHeight, viewState: readingViewState, onViewportChange: onPageReadingViewportChange,
  });
  const pageDisplayBounds = useMemo(() => {
    const layouts = visibleBlocks.map((block) => blockLayouts[block.id]).filter(Boolean);
    if (draftActive) layouts.push(draftLayout || defaultDraftLayout);
    const left = Math.min(0, ...layouts.map((layout) => pageReading.inset.left + layout.x));
    const top = Math.min(0, ...layouts.map((layout) => pageReading.inset.top + layout.y));
    const right = Math.max(pageReading.paperWidth, ...layouts.map((layout) => pageReading.inset.left + layout.x + layout.width));
    const bottom = Math.max(pageReading.paperHeight, ...layouts.map((layout) => pageReading.inset.top + layout.y + layout.height));
    return { left, top, width: right - left, height: bottom - top };
  }, [visibleBlocks, blockLayouts, draftActive, draftLayout, defaultDraftLayout,
    pageReading.inset.left, pageReading.inset.top, pageReading.paperWidth, pageReading.paperHeight]);
  const pageFrameGuideVisibility = shouldShowPageFrameGuides({
    surfaceMode,
    layoutMode,
    interactionMode: interactionState.mode,
  });
  const visiblePageFrames = useMemo(() => (
    surfaceMode === 'canvas'
      ? noteCanvasRuntime.pageFrames
      : primaryPageFrame
        ? [primaryPageFrame]
        : []
  ), [noteCanvasRuntime.pageFrames, primaryPageFrame, surfaceMode]);
  const canvasObjectById = useMemo(() => (
    new Map(noteCanvasRuntime.canvasObjects.map((object) => [object.objectId, object]))
  ), [noteCanvasRuntime.canvasObjects]);
  const placementByObjectId = useMemo(() => (
    new Map(noteCanvasRuntime.canvasPlacements.map((placement) => [placement.objectId, placement]))
  ), [noteCanvasRuntime.canvasPlacements]);
  const blockPlacementByBlockId = useMemo(() => (
    new Map(noteCanvasRuntime.blockPlacements.map((placement) => [placement.blockId, placement]))
  ), [noteCanvasRuntime.blockPlacements]);
  const shapePlacements = useMemo(() => (
    noteCanvasRuntime.canvasPlacements.filter((placement) => (
      canvasObjectById.get(placement.objectId)?.kind === 'shape'
    ))
  ), [canvasObjectById, noteCanvasRuntime.canvasPlacements]);
  const imageObjectById = useMemo(() => (
    new Map(noteCanvasRuntime.imageObjects.map((imageObject) => [imageObject.objectId, imageObject]))
  ), [noteCanvasRuntime.imageObjects]);
  const imagePlacements = useMemo(() => (
    noteCanvasRuntime.canvasPlacements.filter((placement) => (
      canvasObjectById.get(placement.objectId)?.kind === 'image'
    ))
  ), [canvasObjectById, noteCanvasRuntime.canvasPlacements]);
  const structuredObjectById = useMemo(() => (
    new Map(noteCanvasRuntime.structuredObjects.map((structuredObject) => [
      structuredObject.objectId,
      structuredObject,
    ]))
  ), [noteCanvasRuntime.structuredObjects]);
  const tablePlacements = useMemo(() => (
    noteCanvasRuntime.canvasPlacements.filter((placement) => (
      canvasObjectById.get(placement.objectId)?.kind === 'table'
    ))
  ), [canvasObjectById, noteCanvasRuntime.canvasPlacements]);
  const visualConnectorByObjectId = useMemo(() => (
    new Map(noteCanvasRuntime.visualConnectors.map((connector) => [connector.objectId, connector]))
  ), [noteCanvasRuntime.visualConnectors]);
  const contentMountByObjectId = useMemo(() => (
    new Map(noteCanvasRuntime.contentMounts.map((mount) => [mount.objectId, mount]))
  ), [noteCanvasRuntime.contentMounts]);
  const aiNodeByObjectId = useMemo(() => (
    new Map(flattenCanvasAIReadableNodes(noteCanvasRuntime.canvasAIReadableSnapshot.nodes).map((node) => [node.id, node]))
  ), [noteCanvasRuntime.canvasAIReadableSnapshot.nodes]);
  const getCanvasObjectInspectorInput = (objectId: string) => ({
    canvasObject: canvasObjectById.get(objectId) || null,
    placement: placementByObjectId.get(objectId) || null,
    contentMount: contentMountByObjectId.get(objectId) || null,
    aiNode: aiNodeByObjectId.get(objectId) || null,
    visualConnector: visualConnectorByObjectId.get(objectId) || null,
    imageObject: imageObjectById.get(objectId) || null,
    structuredObject: structuredObjectById.get(objectId) || null,
  });
  const selectedCanvasObjectInspectorModel = useMemo(() => (
    selectedCanvasObjectId
      ? createCanvasObjectInspectorModel(getCanvasObjectInspectorInput(selectedCanvasObjectId))
      : null
  ), [
    aiNodeByObjectId,
    canvasObjectById,
    contentMountByObjectId,
    imageObjectById,
    placementByObjectId,
    selectedCanvasObjectId,
    structuredObjectById,
    visualConnectorByObjectId,
  ]);
  const objectContextActionsForObject = (objectId: string): ObjectContextActionAvailability => {
    const actions = createCanvasObjectInspectorActions(getCanvasObjectInspectorInput(objectId));
    const actionById = new Map(actions.map((action) => [action.actionId, action]));
    const openOriginal = actionById.get('open_original');
    const duplicate = actionById.get('duplicate_canvas_object');
    const exportVisibility = actionById.get('toggle_export_visibility');
    return {
      openOriginal: openOriginal ? {
        enabled: openOriginal.enabled,
        disabledReason: openOriginal.disabledReason,
      } : undefined,
      duplicate: duplicate ? {
        enabled: duplicate.enabled,
        disabledReason: duplicate.disabledReason,
      } : undefined,
      exportVisibility: exportVisibility ? {
        label: exportVisibility.label,
        enabled: exportVisibility.enabled,
        disabledReason: exportVisibility.disabledReason,
      } : undefined,
    };
  };
  const shapeTextBindingByObjectId = useMemo(() => {
    const next = new Map<string, {
      block: NoteBlock;
      text: string;
      saving: boolean;
      active: boolean;
      autoFocus: boolean;
    }>();
    shapePlacements.forEach((placement) => {
      const canvasObject = canvasObjectById.get(placement.objectId);
      if (!isBlockBackedShapeObject(canvasObject)) return;
      const block = findBackingBlockForShape(
        placement.objectId,
        noteCanvasRuntime.contentMounts,
        allBlocks,
      );
      if (!block) return;
      next.set(placement.objectId, {
        block,
        text: blockTextDrafts[block.id] ?? textFromContent(block),
        saving: savingBlockId === block.id,
        active: activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id,
        autoFocus: focusBlockId === block.id,
      });
    });
    return next;
  }, [
    activeBlockId,
    allBlocks,
    blockTextDrafts,
    canvasObjectById,
    focusBlockId,
    noteCanvasRuntime.contentMounts,
    savingBlockId,
    selectedBlockId,
    shapePlacements,
  ]);
  const pageFrameExtensionByFrameId = useMemo(() => (
    new Map(noteCanvasRuntime.pageFrameExtensions.map((extension) => [extension.frameId, extension]))
  ), [noteCanvasRuntime.pageFrameExtensions]);
  const pageFrameGuides = useMemo(() => (
    visiblePageFrames.map(createPageFrameGuides)
  ), [visiblePageFrames]);
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
        if (hiddenByCollapsedStack) return null;
        return extension?.slots
          ? {
            frameId: pageFrame.id,
            headerFooterEnabled: extension.headerFooterEnabled,
            pageNumberEnabled: extension.pageNumberEnabled,
            slots: extension.slots,
          }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  ), [pageFrameExtensionByFrameId, visiblePageFrames]);
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
    if (!surfaceRef.current || surfaceMode !== 'canvas') return undefined;
    const target = surfaceRef.current;
    const observer = new ResizeObserver(([entry]) => {
      onViewportSizeChange(entry.contentRect.width, entry.contentRect.height, noteCanvasRuntime.world);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [noteCanvasRuntime.world, onViewportSizeChange, surfaceMode]);

  useEffect(() => {
    if (surfaceMode !== 'canvas') {
      setSpacePanReady(false);
      setCanvasPanning(false);
      panSessionRef.current = null;
      pageFrameOperationRef.current = null;
      shapeOperationRef.current = null;
      setPageFrameInteractionPreview(null);
      setShapeInteractionPreview(null);
      setSelectedCanvasObjectId(null);
      setSelectedTableCell(null);
      setEditingTableCell(null);
      return undefined;
    }

    const isTextEditingTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement
      && Boolean(target.closest('textarea, input, select, [contenteditable="true"], [role="dialog"]'))
    );
    const isPanBlockedTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement
      && Boolean(target.closest('textarea, input, select, button, [contenteditable="true"], [role="dialog"]'))
    );
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !isTextEditingTarget(event.target)) {
        const isZoomIn = event.key === '=' || event.key === '+';
        const isZoomOut = event.key === '-';
        const isZoomReset = event.key === '0';
        if (isZoomIn || isZoomOut || isZoomReset) {
          event.preventDefault();
          if (isZoomReset) {
            onResetViewport();
            return;
          }

          const rect = surfaceRef.current?.getBoundingClientRect();
          onZoomViewportAt({
            x: rect ? rect.width / 2 : 0,
            y: rect ? rect.height / 2 : 0,
          }, viewportTransform.zoom * (isZoomIn ? 1.12 : 0.88), noteCanvasRuntime.world);
          return;
        }
      }

      if (event.code !== 'Space' || isPanBlockedTarget(event.target)) return;
      event.preventDefault();
      setSpacePanReady(true);
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.code !== 'Space') return;
      setSpacePanReady(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [noteCanvasRuntime.world, onResetViewport, onZoomViewportAt, surfaceMode, viewportTransform.zoom]);

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
      setCanvasBlankContextMenu(null);
      setShapeContextMenu(null);
      setTableContextMenu(null);
      setVisualConnectorContextMenu(null);
    };

    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearDraft();
      setAnnotationContextMenu(null);
      setAnnotationHighlightContextMenu(null);
      setBlockContextMenu(null);
      setCanvasBlankContextMenu(null);
      setPageFrameContextMenu(null);
      setShapeContextMenu(null);
      setTableContextMenu(null);
      setVisualConnectorContextMenu(null);
      setVisualConnectorDraft(null);
      setSelectedCanvasObjectId(null);
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, true);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [clearDraft, selectionDraft]);

  const transformedWorldStyle = useMemo(() => {
    if (surfaceMode !== 'canvas') return {};
    return {
      transform: `translate(${-viewportTransform.x * viewportTransform.zoom}px, ${-viewportTransform.y * viewportTransform.zoom}px) scale(${viewportTransform.zoom})`,
      transformOrigin: '0 0',
    } satisfies CSSProperties;
  }, [surfaceMode, viewportTransform.x, viewportTransform.y, viewportTransform.zoom]);

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas') return;
    const target = event.target as HTMLElement;
    const isPanIntent = event.button === 1 || spacePanReady;
    if (!isPanIntent) return;
    if (target.closest('textarea, input, select, button, [role="dialog"]')) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panSessionRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setCanvasPanning(true);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas' || !panSessionRef.current) return;
    const session = panSessionRef.current;
    if (session.pointerId !== event.pointerId) return;
    const delta = {
      x: event.clientX - session.clientX,
      y: event.clientY - session.clientY,
    };
    panSessionRef.current = {
      ...session,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    onPanViewportBy(delta, noteCanvasRuntime.world);
  };

  const endCanvasPan = (event: ReactPointerEvent<HTMLElement>) => {
    if (panSessionRef.current?.pointerId === event.pointerId) {
      panSessionRef.current = null;
      setCanvasPanning(false);
    }
  };

  const getPageFrameOperationDelta = (
    event: ReactPointerEvent<HTMLElement>,
    session: NonNullable<typeof pageFrameOperationRef.current>,
  ): CanvasPoint => ({
    x: (event.clientX - session.startClientX) / viewportTransform.zoom,
    y: (event.clientY - session.startClientY) / viewportTransform.zoom,
  });

  const handlePageFramePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    pageFrame: PageFrameModel,
  ) => {
    if (contentReadOnly) return;
    if (surfaceMode !== 'canvas' || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-page-frame-resize-handle="true"]')) return;
    setCanvasBlankContextMenu(null);
    setPageFrameContextMenu(null);
    if (!layoutMode) {
      onSelectPageFrame(pageFrame.id);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pageFrameOperationRef.current = {
      kind: 'move',
      frameId: pageFrame.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: pageFrame.x,
      startY: pageFrame.y,
      startWidth: pageFrame.width,
      startHeight: pageFrame.height,
    };
    setPageFrameInteractionPreview({
      frameId: pageFrame.id,
      x: pageFrame.x,
      y: pageFrame.y,
      width: pageFrame.width,
      height: pageFrame.height,
    });
  };

  const handlePageFrameResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    pageFrame: PageFrameModel,
  ) => {
    if (contentReadOnly) return;
    if (surfaceMode !== 'canvas' || event.button !== 0 || !layoutMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pageFrameOperationRef.current = {
      kind: 'resize',
      frameId: pageFrame.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: pageFrame.x,
      startY: pageFrame.y,
      startWidth: pageFrame.width,
      startHeight: pageFrame.height,
    };
    setPageFrameInteractionPreview({
      frameId: pageFrame.id,
      x: pageFrame.x,
      y: pageFrame.y,
      width: pageFrame.width,
      height: pageFrame.height,
    });
  };

  const handlePageFramePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = pageFrameOperationRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = getPageFrameOperationDelta(event, session);
    if (session.kind === 'move') {
      setPageFrameInteractionPreview({
        frameId: session.frameId,
        x: session.startX + delta.x,
        y: session.startY + delta.y,
        width: session.startWidth,
        height: session.startHeight,
      });
      return;
    }
    setPageFrameInteractionPreview({
      frameId: session.frameId,
      x: session.startX,
      y: session.startY,
      width: Math.max(260, session.startWidth + delta.x),
      height: Math.max(360, session.startHeight + delta.y),
    });
  };

  const endPageFrameOperation = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = pageFrameOperationRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const preview = pageFrameInteractionPreview;
    pageFrameOperationRef.current = null;
    setPageFrameInteractionPreview(null);
    if (!preview || preview.frameId !== session.frameId) return;
    if (session.kind === 'move') {
      onMovePageFrame(session.frameId, {
        x: preview.x - session.startX,
        y: preview.y - session.startY,
      });
      return;
    }
    onResizePageFrame(session.frameId, {
      width: preview.width,
      height: preview.height,
    });
  };

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

  const placeShapeInCurrentSurface = (placement: CanvasPlacement): CanvasPlacement => {
    const center = {
      x: placement.x + placement.width / 2,
      y: placement.y + placement.height / 2,
    };
    const pageFrame = pageFrameAtWorldPoint(center);
    return {
      ...placement,
      frameId: pageFrame?.id,
      surface: pageFrame ? 'formal_page' : 'canvas_workspace',
      boundaryRole: pageFrame ? 'inside' : 'outside',
      snapState: pageFrame ? 'snapped' : 'free',
    };
  };

  const persistShapePlacement = async (
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ): Promise<boolean> => {
    const nextPlacement = placeShapeInCurrentSurface(placement);
    return persistCanvasObjectPlacement(canvasObject, nextPlacement);
  };

  const persistCanvasObjectPlacement = async (
    canvasObject: CanvasObject,
    nextPlacement: CanvasPlacement,
  ): Promise<boolean> => {
    if (canvasObject.kind === 'image') {
      const imageObject = imageObjectById.get(canvasObject.objectId);
      if (!imageObject) return false;
      return onPersistCanvasObject({
        canvasObject,
        placement: nextPlacement,
        contentMounts: [],
        imageObject,
        payload: imageObjectSavePayload(canvasObject, nextPlacement, imageObject),
      });
    }
    if (canvasObject.kind === 'table') {
      const structuredObject = structuredObjectById.get(canvasObject.objectId);
      if (!structuredObject) return false;
      return onPersistCanvasObject({
        canvasObject,
        placement: nextPlacement,
        contentMounts: [],
        structuredObject,
        payload: tableObjectSavePayload(canvasObject, nextPlacement, structuredObject),
      });
    }
    if (canvasObject.kind === 'visual_connector') {
      const visualConnector = visualConnectorByObjectId.get(canvasObject.objectId);
      if (!visualConnector) return false;
      return onPersistCanvasObject({
        canvasObject,
        placement: nextPlacement,
        contentMounts: [],
        visualConnector,
        payload: visualConnectorSavePayload(canvasObject, nextPlacement, visualConnector),
      });
    }
    const contentMount = findShapeTextMount(canvasObject.objectId, noteCanvasRuntime.contentMounts);
    return onPersistCanvasObject({
      canvasObject,
      placement: nextPlacement,
      contentMounts: contentMount ? [contentMount] : [],
      payload: shapeSavePayload(canvasObject, nextPlacement, contentMount),
    });
  };

  const persistTablePayload = async (
    objectId: string,
    payload: StructuredCanvasObject['payload'],
  ): Promise<boolean> => {
    const canvasObject = canvasObjectById.get(objectId);
    const placement = placementByObjectId.get(objectId);
    const structuredObject = structuredObjectById.get(objectId);
    if (!canvasObject || !placement || !structuredObject) return false;
    const nextStructuredObject: StructuredCanvasObject = {
      ...structuredObject,
      rowCount: payload.rows.length,
      columnCount: payload.columns.length,
      payload,
    };
    return onPersistCanvasObject({
      canvasObject,
      placement,
      contentMounts: [],
      structuredObject: nextStructuredObject,
      payload: tableObjectSavePayload(canvasObject, placement, nextStructuredObject),
    });
  };

  const persistTableMutationPayload = async (
    objectId: string,
    before: StructuredCanvasObject['payload'],
    after: StructuredCanvasObject['payload'],
  ): Promise<boolean> => {
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    const saved = await persistTablePayload(objectId, after);
    if (saved) onPushStructuredMutationHistory(objectId, before, after);
    return saved;
  };

  const tableRowHasText = (
    payload: StructuredCanvasObject['payload'],
    selection: Pick<TableCellSelection, 'rowId'> | null,
  ): boolean => {
    const normalized = normalizeTablePayload(payload);
    if (normalized.rows.length <= 1) return false;
    const selectedRow = selection
      ? normalized.rows.find((row) => row.rowId === selection.rowId)
      : null;
    const rowId = selectedRow?.rowId || normalized.rows[normalized.rows.length - 1]?.rowId;
    if (!rowId) return false;
    return normalized.cells.some((cell) => cell.rowId === rowId && cell.text.trim().length > 0);
  };

  const tableColumnHasText = (
    payload: StructuredCanvasObject['payload'],
    selection: Pick<TableCellSelection, 'columnId'> | null,
  ): boolean => {
    const normalized = normalizeTablePayload(payload);
    if (normalized.columns.length <= 1) return false;
    const selectedColumn = selection
      ? normalized.columns.find((column) => column.columnId === selection.columnId)
      : null;
    const columnId = selectedColumn?.columnId || normalized.columns[normalized.columns.length - 1]?.columnId;
    if (!columnId) return false;
    return normalized.cells.some((cell) => cell.columnId === columnId && cell.text.trim().length > 0);
  };

  const confirmDeleteNonEmptyTablePart = (
    hasText: boolean,
    label: 'row' | 'column',
  ): boolean => (
    !hasText
    || window.confirm(`Delete this ${label}? You can press Ctrl+Z to undo.`)
  );

  const createShapeAtPoint = async (shapeType: ShapeType, clientPoint: CanvasPoint): Promise<void> => {
    const worldPoint = worldPointFromClientPoint(clientPoint);
    const pageFrame = pageFrameAtWorldPoint(worldPoint);
    const objectId = createCanvasRuntimeId(`canvas-object:${noteId}:shape`);
    const defaultWidth = shapeType === 'ellipse' ? 132 : 168;
    const defaultHeight = shapeType === 'ellipse' ? 132 : 104;
    const projection = createPureShapeProjection({
      objectId,
      canvasId: noteId,
      layout: {
        x: Math.round(worldPoint.x - defaultWidth / 2),
        y: Math.round(worldPoint.y - defaultHeight / 2),
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        surface: pageFrame ? 'formal_page' : 'canvas_workspace',
      },
      zIndex: Math.max(1, ...noteCanvasRuntime.canvasPlacements.map((placement) => placement.zIndex)) + 1,
      frameId: pageFrame?.id,
    });
    const canvasObject: CanvasObject = {
      ...projection.canvasObject,
      source: 'entity',
      metadata: {
        shapeType,
        shape_type: shapeType,
      },
    };
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement: projection.placement,
      contentMounts: [],
      payload: shapeSavePayload(canvasObject, projection.placement),
    });
    if (saved) setSelectedCanvasObjectId(objectId);
  };

  const createTableObjectAtPoint = async (clientPoint: CanvasPoint): Promise<void> => {
    const worldPoint = worldPointFromClientPoint(clientPoint);
    const pageFrame = pageFrameAtWorldPoint(worldPoint);
    const objectId = createCanvasRuntimeId(`canvas-object:${noteId}:table`);
    const defaultWidth = 420;
    const defaultHeight = 220;
    const projection = createTableObjectProjection({
      objectId,
      canvasId: noteId,
      layout: {
        x: Math.round(worldPoint.x - defaultWidth / 2),
        y: Math.round(worldPoint.y - defaultHeight / 2),
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        surface: pageFrame ? 'formal_page' : 'canvas_workspace',
      },
      zIndex: Math.max(1, ...noteCanvasRuntime.canvasPlacements.map((placement) => placement.zIndex)) + 1,
      frameId: pageFrame?.id,
    });
    const canvasObject: CanvasObject = {
      ...projection.canvasObject,
      source: 'entity',
    };
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement: projection.placement,
      contentMounts: [],
      structuredObject: projection.structuredObject,
      payload: tableObjectSavePayload(
        canvasObject,
        projection.placement,
        projection.structuredObject,
        projection.visualStyle,
      ),
    });
    if (saved) setSelectedCanvasObjectId(objectId);
  };

  const createImageObjectAtPoint = async (clientPoint: CanvasPoint, file: File): Promise<void> => {
    const dimensions = await readImageFileDimensions(file);
    const asset = await uploadCanvasImageAsset({
      noteId,
      file,
      width: dimensions?.width,
      height: dimensions?.height,
    });
    const worldPoint = worldPointFromClientPoint(clientPoint);
    const pageFrame = pageFrameAtWorldPoint(worldPoint);
    const naturalWidth = asset.width || dimensions?.width || 320;
    const naturalHeight = asset.height || dimensions?.height || 180;
    const defaultWidth = Math.min(420, Math.max(180, naturalWidth));
    const defaultHeight = Math.max(96, Math.round(defaultWidth * (naturalHeight / Math.max(1, naturalWidth))));
    const objectId = createCanvasRuntimeId(`canvas-object:${noteId}:image`);
    const projection = createImageObjectProjection({
      objectId,
      canvasId: noteId,
      asset,
      layout: {
        x: Math.round(worldPoint.x - defaultWidth / 2),
        y: Math.round(worldPoint.y - defaultHeight / 2),
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        surface: pageFrame ? 'formal_page' : 'canvas_workspace',
      },
      zIndex: Math.max(1, ...noteCanvasRuntime.canvasPlacements.map((placement) => placement.zIndex)) + 1,
      frameId: pageFrame?.id,
    });
    const canvasObject: CanvasObject = {
      ...projection.canvasObject,
      source: 'entity',
      metadata: {
        assetKind: 'image',
        asset_kind: 'image',
      },
    };
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement: projection.placement,
      contentMounts: [],
      imageObject: projection.imageObject,
      payload: imageObjectSavePayload(canvasObject, projection.placement, projection.imageObject, projection.visualStyle),
    });
    if (saved) setSelectedCanvasObjectId(objectId);
  };

  const triggerImagePickerAtPoint = (clientPoint: CanvasPoint): void => {
    pendingImageInsertionPointRef.current = clientPoint;
    imageFileInputRef.current?.click();
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0] || null;
    event.currentTarget.value = '';
    const point = pendingImageInsertionPointRef.current;
    pendingImageInsertionPointRef.current = null;
    if (!file || !point) return;
    void createImageObjectAtPoint(point, file).catch((err) => {
      console.error('Failed to create image canvas object:', err);
    });
  };

  const createStickyNoteAtPoint = async (clientPoint: CanvasPoint): Promise<void> => {
    const worldPoint = worldPointFromClientPoint(clientPoint);
    const pageFrame = pageFrameAtWorldPoint(worldPoint);
    const objectId = createCanvasRuntimeId(`canvas-object:${noteId}:sticky-note`);
    const defaultWidth = 188;
    const defaultHeight = 132;
    const projection = createPureShapeProjection({
      objectId,
      canvasId: noteId,
      layout: {
        x: Math.round(worldPoint.x - defaultWidth / 2),
        y: Math.round(worldPoint.y - defaultHeight / 2),
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        surface: pageFrame ? 'formal_page' : 'canvas_workspace',
      },
      zIndex: Math.max(1, ...noteCanvasRuntime.canvasPlacements.map((placement) => placement.zIndex)) + 1,
      frameId: pageFrame?.id,
    });
    const createdBlock = await onCreateBlock(defaultTextTemplate, '', {
      metadataPatch: shapeBackedBlockMetadata(objectId),
      silent: true,
    });
    if (!createdBlock) return;

    const contentMount = createShapeTextContentMount(objectId, createdBlock.id);
    const canvasObject: CanvasObject = {
      ...projection.canvasObject,
      backing: 'note_block',
      objectClass: 'block_backed',
      source: 'entity',
      metadata: ensureStickyStyleForBlockBackedShape({
        shapeType: 'rectangle',
        shape_type: 'rectangle',
      }),
    };
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement: projection.placement,
      contentMounts: [contentMount],
      payload: shapeSavePayload(canvasObject, projection.placement, contentMount),
    });
    if (!saved) {
      await onTrashBlock(createdBlock.id);
      return;
    }

    setSelectedCanvasObjectId(objectId);
    onRequestFocusBlock(createdBlock.id);
  };

  const createVisualConnectorBetweenObjects = async (
    startObjectId: string,
    endObjectId: string,
  ): Promise<void> => {
    if (startObjectId === endObjectId) return;
    const startPlacement = placementByObjectId.get(startObjectId);
    const endPlacement = placementByObjectId.get(endObjectId);
    const start = pointForPlacementAnchor(startPlacement, 'center');
    const end = pointForPlacementAnchor(endPlacement, 'center');
    if (!start || !end) return;
    const connectorId = createCanvasRuntimeId(`canvas-object:${noteId}:visual-connector`);
    const projection = createVisualConnectorProjection({
      connectorId,
      canvasId: noteId,
      start,
      end,
      startObjectId,
      endObjectId,
      zIndex: Math.max(1, ...noteCanvasRuntime.canvasPlacements.map((placement) => placement.zIndex)) + 1,
      style: {
        stroke: '#8aa4c2',
        strokeWidth: 1.75,
      },
    });
    const visualConnector = {
      ...projection.visualConnector,
      startKind: 'object' as const,
      endKind: 'object' as const,
      startAnchor: 'center' as const,
      endAnchor: 'center' as const,
      lineStyle: 'solid' as const,
      stroke: '#8aa4c2',
      strokeWidth: 1.75,
      startMarker: 'none' as const,
      endMarker: 'arrow' as const,
      relationKind: 'visual_only' as const,
    };
    const canvasObject: CanvasObject = {
      ...projection.canvasObject,
      source: 'entity',
      metadata: {
        connector_type: 'visual_only',
      },
    };
    const placement = placementForVisualConnector(projection.placement, visualConnector);
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement,
      contentMounts: [],
      visualConnector,
      payload: visualConnectorSavePayload(canvasObject, placement, visualConnector, projection.visualStyle),
    });
    if (!saved) return;
    setSelectedCanvasObjectId(connectorId);
  };

  const promoteShapeToBlockBacked = async (objectId: string): Promise<void> => {
    const canvasObject = canvasObjectById.get(objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === objectId);
    if (!canvasObject || !placement) return;

    const existingBlock = findBackingBlockForShape(objectId, noteCanvasRuntime.contentMounts, allBlocks);
    if (existingBlock) {
      setSelectedCanvasObjectId(objectId);
      onRequestFocusBlock(existingBlock.id);
      return;
    }

    let backingBlock: NoteBlock | null = null;
    let createdBlock: NoteBlock | null = null;
    let restoredRememberedBlock = false;
    const rememberedBackingBlockId = readRememberedShapeBackingBlockId(canvasObject.metadata);
    if (rememberedBackingBlockId) {
      backingBlock = await onRestoreBlockById(rememberedBackingBlockId, {
        metadataPatch: shapeBackedBlockMetadata(objectId),
        silent: true,
      });
      restoredRememberedBlock = Boolean(backingBlock);
    }

    if (!backingBlock) {
      createdBlock = await onCreateBlock(defaultTextTemplate, '', {
        metadataPatch: shapeBackedBlockMetadata(objectId),
        silent: true,
      });
      backingBlock = createdBlock;
    }
    if (!backingBlock) return;

    const contentMount = createShapeTextContentMount(objectId, backingBlock.id);
    const nextCanvasObject: CanvasObject = {
      ...canvasObject,
      backing: 'note_block',
      objectClass: 'block_backed',
      metadata: rememberShapeBackingBlock(canvasObject.metadata, backingBlock.id),
    };
    const saved = await onPersistCanvasObject({
      canvasObject: nextCanvasObject,
      placement,
      contentMounts: [contentMount],
      payload: shapeSavePayload(nextCanvasObject, placement, contentMount),
    });
    if (!saved) {
      if (createdBlock || restoredRememberedBlock) await onTrashBlock(backingBlock.id);
      return;
    }

    setSelectedCanvasObjectId(objectId);
    onRequestFocusBlock(backingBlock.id);
  };

  const applyShapeStylePreset = async (
    objectId: string,
    preset: 'default' | 'sticky',
  ): Promise<void> => {
    const canvasObject = canvasObjectById.get(objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === objectId);
    const contentMount = findShapeTextMount(objectId, noteCanvasRuntime.contentMounts);
    if (!canvasObject || !placement || !contentMount) return;
    if (!isBlockBackedShapeObject(canvasObject)) return;

    const shapeType = shapeTypeFromCanvasObject(canvasObject);
    const baseMetadata: Record<string, unknown> = {
      ...(canvasObject.metadata || {}),
      shapeType,
      shape_type: shapeType,
    };
    const nextCanvasObject: CanvasObject = {
      ...canvasObject,
      metadata: preset === 'sticky'
        ? ensureStickyStyleForBlockBackedShape(baseMetadata)
        : ensureDefaultShapeStyle(baseMetadata),
    };
    const saved = await onPersistCanvasObject({
      canvasObject: nextCanvasObject,
      placement,
      contentMounts: [contentMount],
      payload: shapeSavePayload(nextCanvasObject, placement, contentMount),
    });
    if (saved) setSelectedCanvasObjectId(objectId);
  };

  const editShapeText = (objectId: string): void => {
    const backingBlock = findBackingBlockForShape(objectId, noteCanvasRuntime.contentMounts, allBlocks);
    if (!backingBlock) return;
    setSelectedCanvasObjectId(objectId);
    onRequestFocusBlock(backingBlock.id);
  };

  const demoteShapeText = async (objectId: string): Promise<void> => {
    const canvasObject = canvasObjectById.get(objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === objectId);
    if (!canvasObject || !placement) return;

    const backingBlock = findBackingBlockForShape(objectId, noteCanvasRuntime.contentMounts, allBlocks);
    const backingText = backingBlock
      ? (blockTextDrafts[backingBlock.id] ?? textFromContent(backingBlock)).trim()
      : '';
    if (backingText.length > 0) {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm('Remove this shape text? The text block will move to trash and can be restored.');
      if (!confirmed) return;
    }
    const nextCanvasObject: CanvasObject = {
      ...canvasObject,
      backing: 'none',
      objectClass: 'pure',
      metadata: backingBlock
        ? rememberShapeBackingBlock(canvasObject.metadata, backingBlock.id)
        : canvasObject.metadata,
    };
    const saved = await onPersistCanvasObject({
      canvasObject: nextCanvasObject,
      placement,
      contentMounts: [],
      payload: shapeSavePayload(nextCanvasObject, placement),
    });
    if (!saved) return;

    if (backingBlock) await onTrashBlock(backingBlock.id);
    setSelectedCanvasObjectId(objectId);
  };

  const getShapeOperationDelta = (
    event: ReactPointerEvent<HTMLElement>,
    session: NonNullable<typeof shapeOperationRef.current>,
  ): CanvasPoint => ({
    x: (event.clientX - session.startClientX) / viewportTransform.zoom,
    y: (event.clientY - session.startClientY) / viewportTransform.zoom,
  });

  const handleShapePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => {
    if (surfaceMode !== 'canvas' || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-canvas-shape-resize-handle="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
    setCanvasBlankContextMenu(null);
    setPageFrameContextMenu(null);
    setShapeContextMenu(null);
    setImageContextMenu(null);
    setTableContextMenu(null);
    setVisualConnectorContextMenu(null);
    setSelectedCanvasObjectId(canvasObject.objectId);
    if (!layoutMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    shapeOperationRef.current = {
      kind: 'move',
      objectId: canvasObject.objectId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: placement.x,
      startY: placement.y,
      startWidth: placement.width,
      startHeight: placement.height,
    };
    setShapeInteractionPreview({
      objectId: canvasObject.objectId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });
  };

  const handleShapeResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => {
    if (surfaceMode !== 'canvas' || event.button !== 0 || !layoutMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    shapeOperationRef.current = {
      kind: 'resize',
      objectId: canvasObject.objectId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: placement.x,
      startY: placement.y,
      startWidth: placement.width,
      startHeight: placement.height,
    };
    setShapeInteractionPreview({
      objectId: canvasObject.objectId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });
  };

  const handleShapePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = shapeOperationRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = getShapeOperationDelta(event, session);
    if (session.kind === 'move') {
      setShapeInteractionPreview({
        objectId: session.objectId,
        x: session.startX + delta.x,
        y: session.startY + delta.y,
        width: session.startWidth,
        height: session.startHeight,
      });
      return;
    }
    setShapeInteractionPreview({
      objectId: session.objectId,
      x: session.startX,
      y: session.startY,
      width: Math.max(32, session.startWidth + delta.x),
      height: Math.max(32, session.startHeight + delta.y),
    });
  };

  const endShapeOperation = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = shapeOperationRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const preview = shapeInteractionPreview;
    shapeOperationRef.current = null;
    setShapeInteractionPreview(null);
    if (!preview || preview.objectId !== session.objectId) return;
    const canvasObject = canvasObjectById.get(session.objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === session.objectId);
    if (!canvasObject || !placement) return;
    void persistShapePlacement(canvasObject, {
      ...placement,
      x: preview.x,
      y: preview.y,
      width: preview.width,
      height: preview.height,
    });
  };

  const handleCanvasWheel = (event: WheelEvent<HTMLElement>) => {
    if (surfaceMode !== 'canvas') return;
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
      onZoomViewportAt({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }, viewportTransform.zoom * zoomFactor, noteCanvasRuntime.world);
      return;
    }

    onScrollViewportBy({
      x: event.shiftKey ? event.deltaY : event.deltaX,
      y: event.shiftKey ? 0 : event.deltaY,
    }, noteCanvasRuntime.world);
  };

  const canvasZoomPercent = Math.round(viewportTransform.zoom * 100);
  const zoomCanvasAtCenter = (nextZoom: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    onZoomViewportAt({
      x: rect ? rect.width / 2 : 0,
      y: rect ? rect.height / 2 : 0,
    }, nextZoom, noteCanvasRuntime.world);
  };
  const handleCanvasZoomSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    zoomCanvasAtCenter(Number(event.currentTarget.value) / 100);
  };
  const nudgeCanvasZoom = (factor: number) => {
    zoomCanvasAtCenter(viewportTransform.zoom * factor);
  };

  const handleBlockListMouseDownForDraft = (event: ReactPointerEvent<HTMLDivElement>) => {
    onBlockListMouseDown(event);
    if (event.target !== event.currentTarget) return;
    clearDraft();
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setBlockContextMenu(null);
    setCanvasBlankContextMenu(null);
    setPageFrameContextMenu(null);
    setShapeContextMenu(null);
    setImageContextMenu(null);
    setTableContextMenu(null);
    setVisualConnectorContextMenu(null);
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
    setCanvasBlankContextMenu(null);
    setPageFrameContextMenu(null);
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
      return range.text.slice(Math.min(start, end), Math.max(start, end));
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
  ) => {
    await onApplyBlockTextFlowEdit(block, nextTextFlow);
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
    setCanvasBlankContextMenu(null);
    setPageFrameContextMenu(null);
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
    const worldRect = {
      x: layout.x + pageOffsetX,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    };

    if (surfaceMode === 'canvas') {
      const surfaceRect = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceRect) return null;
      return getBlockControlAnchorFromRect(worldRectToViewportRect({
        worldRect,
        viewport: viewportTransform,
        viewportElementRect: surfaceRect,
        source: 'block',
      }));
    }

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
    items: buildBlockShellMenu(),
  } : null;

  const canvasBlankMenu: CommandSurfaceMenu | null = canvasBlankContextMenu && !contentReadOnly ? {
    id: 'canvas-blank-context-menu',
    kind: 'canvas_blank',
    point: canvasBlankContextMenu.point,
    title: 'Canvas',
    items: buildCanvasBlankMenu(),
  } : null;

  const pageFrameShellMenuExtension = pageFrameContextMenu
    ? pageFrameExtensionByFrameId.get(pageFrameContextMenu.frameId)
    : null;
  const pageFrameShellMenu: CommandSurfaceMenu | null = pageFrameContextMenu && !contentReadOnly ? {
    id: `page-frame-shell-menu-${pageFrameContextMenu.frameId}`,
    kind: 'page_frame_shell',
    point: pageFrameContextMenu.point,
    title: 'PageFrame',
    items: buildPageFrameShellMenu({
      primary: pageFrameContextMenu.primary,
      inPageStack: Boolean(pageFrameShellMenuExtension?.pageStackId),
      stackCollapsed: Boolean(pageFrameShellMenuExtension?.pageStackCollapsed),
    }),
  } : null;

  const shapeShellMenuCanvasObject = shapeContextMenu
    ? canvasObjectById.get(shapeContextMenu.objectId)
    : null;
  const shapeShellMenu: CommandSurfaceMenu | null = shapeContextMenu && !contentReadOnly ? {
    id: `canvas-object-shell-menu-${shapeContextMenu.objectId}`,
    kind: 'canvas_blank',
    point: shapeContextMenu.point,
    title: 'Shape',
    items: buildCanvasObjectShellMenu({
      blockBacked: isBlockBackedShapeObject(shapeShellMenuCanvasObject),
      sticky: isStickyNoteCanvasObject(shapeShellMenuCanvasObject),
      objectActions: objectContextActionsForObject(shapeContextMenu.objectId),
      connectorDraftState: !visualConnectorDraft
        ? 'none'
        : visualConnectorDraft.startObjectId === shapeContextMenu.objectId
          ? 'same_object'
          : 'ready',
    }),
  } : null;
  const imageShellMenuImageObject = imageContextMenu
    ? imageObjectById.get(imageContextMenu.objectId)
    : null;
  const imageShellMenu: CommandSurfaceMenu | null = imageContextMenu && !contentReadOnly ? {
    id: `image-object-shell-menu-${imageContextMenu.objectId}`,
    kind: 'canvas_blank',
    point: imageContextMenu.point,
    title: 'Image',
    items: buildImageObjectShellMenu({
      fit: imageShellMenuImageObject?.fit || 'contain',
      objectActions: objectContextActionsForObject(imageContextMenu.objectId),
      connectorDraftState: !visualConnectorDraft
        ? 'none'
        : visualConnectorDraft.startObjectId === imageContextMenu.objectId
          ? 'same_object'
      : 'ready',
    }),
  } : null;
  const tableShellMenu: CommandSurfaceMenu | null = tableContextMenu && !contentReadOnly ? {
    id: `table-object-shell-menu-${tableContextMenu.objectId}`,
    kind: 'canvas_blank',
    point: tableContextMenu.point,
    title: 'Table',
    items: buildTableObjectShellMenu({
      rowCount: structuredObjectById.get(tableContextMenu.objectId)?.rowCount || 1,
      columnCount: structuredObjectById.get(tableContextMenu.objectId)?.columnCount || 1,
      objectActions: objectContextActionsForObject(tableContextMenu.objectId),
      connectorDraftState: !visualConnectorDraft
        ? 'none'
        : visualConnectorDraft.startObjectId === tableContextMenu.objectId
          ? 'same_object'
          : 'ready',
    }),
  } : null;
  const visualConnectorShellMenu: CommandSurfaceMenu | null = visualConnectorContextMenu && !contentReadOnly ? {
    id: `visual-connector-shell-menu-${visualConnectorContextMenu.objectId}`,
    kind: 'canvas_blank',
    point: visualConnectorContextMenu.point,
    title: 'Visual connector',
    items: buildVisualConnectorShellMenu({
      objectActions: objectContextActionsForObject(visualConnectorContextMenu.objectId),
    }),
  } : null;

  const isBlockedContextMenuTarget = (target: EventTarget | null): boolean => (
    target instanceof Element
    && Boolean(target.closest([
      '[data-note-block-shell="true"]',
      '[data-command-context-menu="true"]',
      '[data-content-group-panel="true"]',
      '[data-selection-toolbar="true"]',
      '[data-inline-name-prompt="true"]',
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
      '[role="dialog"]',
    ].join(',')))
  );

  const getPageFrameAtCanvasPoint = (event: ReactMouseEvent<HTMLDivElement>): {
    frameId: string;
    primary: boolean;
  } | null => {
    if (surfaceMode !== 'canvas') return null;
    const surfaceRect = surfaceRef.current?.getBoundingClientRect();
    if (!surfaceRect) return null;
    const worldPoint = viewportPointToWorldPoint({
      x: event.clientX - surfaceRect.left,
      y: event.clientY - surfaceRect.top,
    }, viewportTransform);
    const hitFrame = [...noteCanvasRuntime.pageFrames].reverse().find((pageFrame) => (
      worldPoint.x >= pageFrame.x
      && worldPoint.x <= pageFrame.x + pageFrame.width
      && worldPoint.y >= pageFrame.y
      && worldPoint.y <= pageFrame.y + pageFrame.height
    ));
    if (!hitFrame) return null;
    return {
      frameId: hitFrame.id,
      primary: hitFrame.id === primaryPageFrame?.id,
    };
  };

  const handleBlankSurfaceContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (contentReadOnly) return;
    if (surfaceMode !== 'canvas') return;
    if (isBlockedContextMenuTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();

    clearDraft();
    setAnnotationContextMenu(null);
    setAnnotationHighlightContextMenu(null);
    setBlockContextMenu(null);
    setShapeContextMenu(null);
    setImageContextMenu(null);
    setTableContextMenu(null);
    setSelectedTableCell(null);
    setEditingTableCell(null);
    setVisualConnectorContextMenu(null);
    setSelectedAnnotationIds([]);

    const point = { x: event.clientX, y: event.clientY };
    const hitFrame = getPageFrameAtCanvasPoint(event);
    if (hitFrame) {
      setCanvasBlankContextMenu(null);
      setPageFrameContextMenu({ ...hitFrame, point });
      return;
    }

    setPageFrameContextMenu(null);
    setCanvasBlankContextMenu({ point });
  };

  const handleCanvasBlankContextAction = (actionId: CommandActionId) => {
    if (actionId === 'create_page_frame') {
      onCreatePageFrame();
      return;
    }
    if (actionId === 'create_page_stack') {
      onCreatePageStack();
      return;
    }
    if (actionId === 'create_shape_rectangle' && canvasBlankContextMenu) {
      void createShapeAtPoint('rectangle', canvasBlankContextMenu.point);
      setCanvasBlankContextMenu(null);
      return;
    }
    if (actionId === 'create_shape_ellipse' && canvasBlankContextMenu) {
      void createShapeAtPoint('ellipse', canvasBlankContextMenu.point);
      setCanvasBlankContextMenu(null);
      return;
    }
    if (actionId === 'create_sticky_note' && canvasBlankContextMenu) {
      void createStickyNoteAtPoint(canvasBlankContextMenu.point);
      setCanvasBlankContextMenu(null);
      return;
    }
    if (actionId === 'create_table_object' && canvasBlankContextMenu) {
      void createTableObjectAtPoint(canvasBlankContextMenu.point);
      setCanvasBlankContextMenu(null);
      return;
    }
    if (actionId === 'create_image_object' && canvasBlankContextMenu) {
      triggerImagePickerAtPoint(canvasBlankContextMenu.point);
      setCanvasBlankContextMenu(null);
      return;
    }
  };

  const handlePageFrameContextAction = (actionId: CommandActionId) => {
    if (!pageFrameContextMenu) return;
    if (actionId === 'create_shape_rectangle') {
      void createShapeAtPoint('rectangle', pageFrameContextMenu.point);
      setPageFrameContextMenu(null);
      return;
    }
    if (actionId === 'create_shape_ellipse') {
      void createShapeAtPoint('ellipse', pageFrameContextMenu.point);
      setPageFrameContextMenu(null);
      return;
    }
    if (actionId === 'create_sticky_note') {
      void createStickyNoteAtPoint(pageFrameContextMenu.point);
      setPageFrameContextMenu(null);
      return;
    }
    if (actionId === 'create_table_object') {
      void createTableObjectAtPoint(pageFrameContextMenu.point);
      setPageFrameContextMenu(null);
      return;
    }
    if (actionId === 'create_image_object') {
      triggerImagePickerAtPoint(pageFrameContextMenu.point);
      setPageFrameContextMenu(null);
      return;
    }
    if (actionId === 'add_page_below') {
      onAddPageBelow(pageFrameContextMenu.frameId);
      return;
    }
    if (actionId === 'detach_page_from_stack') {
      onDetachPageFromStack(pageFrameContextMenu.frameId);
      return;
    }
    if (actionId === 'toggle_page_stack_collapse') {
      onTogglePageStackCollapse(pageFrameContextMenu.frameId);
      return;
    }
    if (actionId === 'duplicate_page_frame') {
      onDuplicatePageFrame(pageFrameContextMenu.frameId);
      return;
    }
    if (actionId === 'set_primary_page_frame') {
      onSetPrimaryPageFrame(pageFrameContextMenu.frameId);
      return;
    }
    if (actionId === 'delete_page_frame') {
      onDeletePageFrame(pageFrameContextMenu.frameId);
    }
  };

  const clearCanvasObjectContextMenus = (): void => {
    setShapeContextMenu(null);
    setImageContextMenu(null);
    setTableContextMenu(null);
    setVisualConnectorContextMenu(null);
  };

  const isCanvasObjectContextCommand = (
    actionId: CommandActionId,
  ): actionId is 'inspect_canvas_object' | 'open_original' | 'duplicate_canvas_object' | 'toggle_export_visibility' => (
    actionId === 'inspect_canvas_object'
    || actionId === 'open_original'
    || actionId === 'duplicate_canvas_object'
    || actionId === 'toggle_export_visibility'
  );

  const persistCanvasObjectDuplicateDraft = async (
    draft: NonNullable<ReturnType<typeof createCanvasObjectDuplicateDraft>>,
  ): Promise<boolean> => {
    if (draft.imageObject) {
      return onPersistCanvasObject({
        canvasObject: draft.canvasObject,
        placement: draft.placement,
        contentMounts: [],
        imageObject: draft.imageObject,
        payload: imageObjectSavePayload(draft.canvasObject, draft.placement, draft.imageObject),
      });
    }
    if (draft.structuredObject) {
      return onPersistCanvasObject({
        canvasObject: draft.canvasObject,
        placement: draft.placement,
        contentMounts: [],
        structuredObject: draft.structuredObject,
        payload: tableObjectSavePayload(draft.canvasObject, draft.placement, draft.structuredObject),
      });
    }
    return onPersistCanvasObject({
      canvasObject: draft.canvasObject,
      placement: draft.placement,
      contentMounts: draft.contentMounts,
      payload: shapeSavePayload(draft.canvasObject, draft.placement),
    });
  };

  const toggleImageObjectFit = async (objectId: string): Promise<boolean> => {
    const canvasObject = canvasObjectById.get(objectId);
    const placement = placementByObjectId.get(objectId);
    const imageObject = imageObjectById.get(objectId);
    if (!canvasObject || !placement || !imageObject) return false;
    const nextImageObject: ImageCanvasObject = {
      ...imageObject,
      fit: imageObject.fit === 'cover' ? 'contain' : 'cover',
    };
    return onPersistCanvasObject({
      canvasObject,
      placement,
      contentMounts: [],
      imageObject: nextImageObject,
      payload: imageObjectSavePayload(canvasObject, placement, nextImageObject),
    });
  };

  const deleteCanvasObjectWithBacking = async (objectId: string): Promise<boolean> => {
    const canvasObject = canvasObjectById.get(objectId);
    const backingBlock = canvasObject?.kind === 'shape'
      ? findBackingBlockForShape(objectId, noteCanvasRuntime.contentMounts, allBlocks)
      : null;
    const deleted = await onDeleteCanvasObject(objectId);
    if (!deleted) return false;
    if (backingBlock) onForgetBlockLocally(backingBlock.id);
    if (selectedCanvasObjectId === objectId) setSelectedCanvasObjectId(null);
    if (selectedTableCell?.objectId === objectId) setSelectedTableCell(null);
    if (editingTableCell?.objectId === objectId) setEditingTableCell(null);
    if (visualConnectorDraft?.startObjectId === objectId) setVisualConnectorDraft(null);
    return true;
  };

  const handleCanvasObjectContextAction = async (
    actionId: CanvasObjectInspectorActionId | 'inspect_canvas_object',
    objectId: string | null = selectedCanvasObjectId,
  ): Promise<void> => {
    if (!objectId) return;
    const input = getCanvasObjectInspectorInput(objectId);
    const { canvasObject, placement, contentMount } = input;
    if (!canvasObject || !placement) return;

    if (actionId === 'inspect_canvas_object') {
      setSelectedCanvasObjectId(objectId);
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'open_original') {
      if (contentMount?.targetKind === 'note_block' && contentMount.targetId) {
        setSelectedCanvasObjectId(objectId);
        onSelectBlock(contentMount.targetId);
        onRequestFocusBlock(contentMount.targetId);
      }
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'duplicate_canvas_object') {
      const draft = createCanvasObjectDuplicateDraft({
        ...input,
        nextObjectId: createCanvasRuntimeId(`canvas-object:${noteId}:${canvasObject.kind}:duplicate`),
      });
      if (draft) {
        const saved = await persistCanvasObjectDuplicateDraft(draft);
        if (saved) setSelectedCanvasObjectId(draft.canvasObject.objectId);
      }
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'toggle_export_visibility') {
      const saved = await persistCanvasObjectPlacement(
        canvasObject,
        toggleCanvasPlacementExportVisibility(placement),
      );
      if (saved) setSelectedCanvasObjectId(objectId);
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'toggle_shape_style') {
      await applyShapeStylePreset(
        objectId,
        isStickyNoteCanvasObject(canvasObject) ? 'default' : 'sticky',
      );
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'toggle_image_fit') {
      const saved = await toggleImageObjectFit(objectId);
      if (saved) setSelectedCanvasObjectId(objectId);
      clearCanvasObjectContextMenus();
      return;
    }

    if (actionId === 'delete_canvas_object') {
      await deleteCanvasObjectWithBacking(objectId);
      clearCanvasObjectContextMenus();
    }
  };

  const handleShapeContextAction = async (actionId: CommandActionId) => {
    if (!shapeContextMenu) return;
    const objectId = shapeContextMenu.objectId;
    if (isCanvasObjectContextCommand(actionId)) {
      await handleCanvasObjectContextAction(actionId, objectId);
      return;
    }
    if (actionId === 'add_shape_text') {
      await promoteShapeToBlockBacked(objectId);
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'edit_shape_text') {
      editShapeText(objectId);
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'remove_shape_text') {
      await demoteShapeText(objectId);
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'set_shape_style_sticky') {
      await applyShapeStylePreset(objectId, 'sticky');
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'set_shape_style_default') {
      await applyShapeStylePreset(objectId, 'default');
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'start_visual_connector_from_object') {
      setVisualConnectorDraft({ startObjectId: objectId });
      setSelectedCanvasObjectId(objectId);
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'finish_visual_connector_to_object') {
      const startObjectId = visualConnectorDraft?.startObjectId;
      if (startObjectId && startObjectId !== objectId) {
        await createVisualConnectorBetweenObjects(startObjectId, objectId);
      }
      setVisualConnectorDraft(null);
      setShapeContextMenu(null);
      return;
    }
    if (actionId === 'delete_canvas_object') {
      await deleteCanvasObjectWithBacking(objectId);
      setShapeContextMenu(null);
    }
  };

  const handleImageContextAction = async (actionId: CommandActionId) => {
    if (!imageContextMenu) return;
    const objectId = imageContextMenu.objectId;
    const canvasObject = canvasObjectById.get(objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === objectId);
    const imageObject = imageObjectById.get(objectId);
    if (!canvasObject || !placement || !imageObject) {
      setImageContextMenu(null);
      return;
    }

    if (isCanvasObjectContextCommand(actionId)) {
      await handleCanvasObjectContextAction(actionId, objectId);
      return;
    }

    if (actionId === 'edit_image_caption') {
      setImageMetadataPrompt({
        objectId,
        field: 'caption',
        point: imageContextMenu.point,
        initialValue: imageObject.caption || '',
      });
      setImageContextMenu(null);
      return;
    }

    if (actionId === 'edit_image_alt_text') {
      setImageMetadataPrompt({
        objectId,
        field: 'altText',
        point: imageContextMenu.point,
        initialValue: imageObject.altText || '',
      });
      setImageContextMenu(null);
      return;
    }

    if (actionId === 'toggle_image_fit') {
      const saved = await toggleImageObjectFit(objectId);
      if (saved) setSelectedCanvasObjectId(objectId);
      setImageContextMenu(null);
      return;
    }

    if (actionId === 'start_visual_connector_from_object') {
      setVisualConnectorDraft({ startObjectId: objectId });
      setSelectedCanvasObjectId(objectId);
      setImageContextMenu(null);
      return;
    }

    if (actionId === 'finish_visual_connector_to_object') {
      const startObjectId = visualConnectorDraft?.startObjectId;
      if (startObjectId && startObjectId !== objectId) {
        await createVisualConnectorBetweenObjects(startObjectId, objectId);
      }
      setVisualConnectorDraft(null);
      setImageContextMenu(null);
      return;
    }

    if (actionId === 'delete_canvas_object') {
      await deleteCanvasObjectWithBacking(objectId);
      setImageContextMenu(null);
    }
  };

  const handleImageMetadataPromptCommit = async (value: string): Promise<void> => {
    if (!imageMetadataPrompt) return;
    const { objectId, field } = imageMetadataPrompt;
    const canvasObject = canvasObjectById.get(objectId);
    const placement = noteCanvasRuntime.canvasPlacements.find((item) => item.objectId === objectId);
    const imageObject = imageObjectById.get(objectId);
    if (!canvasObject || !placement || !imageObject) {
      setImageMetadataPrompt(null);
      return;
    }

    const trimmed = value.trim();
    const nextImageObject: ImageCanvasObject = {
      ...imageObject,
      [field]: trimmed || undefined,
    };
    const saved = await onPersistCanvasObject({
      canvasObject,
      placement,
      contentMounts: [],
      imageObject: nextImageObject,
      payload: imageObjectSavePayload(canvasObject, placement, nextImageObject),
    });
    if (saved) setSelectedCanvasObjectId(objectId);
    setImageMetadataPrompt(null);
  };

  const handleTableContextAction = async (actionId: CommandActionId) => {
    if (!tableContextMenu) return;
    const objectId = tableContextMenu.objectId;
    const structuredObject = structuredObjectById.get(objectId);
    const tableSelection = selectedTableCell?.objectId === objectId ? selectedTableCell : null;

    if (isCanvasObjectContextCommand(actionId)) {
      await handleCanvasObjectContextAction(actionId, objectId);
      return;
    }

    if (structuredObject && actionId === 'add_table_row_below') {
      const before = structuredObject.payload;
      const saved = await persistTableMutationPayload(objectId, before, addTableRowBelow(before, tableSelection));
      if (saved) setSelectedCanvasObjectId(objectId);
      setTableContextMenu(null);
      return;
    }

    if (structuredObject && actionId === 'add_table_column_right') {
      const before = structuredObject.payload;
      const saved = await persistTableMutationPayload(objectId, before, addTableColumnRight(before, tableSelection));
      if (saved) setSelectedCanvasObjectId(objectId);
      setTableContextMenu(null);
      return;
    }

    if (structuredObject && actionId === 'delete_table_row') {
      const before = structuredObject.payload;
      if (!confirmDeleteNonEmptyTablePart(tableRowHasText(before, tableSelection), 'row')) {
        setTableContextMenu(null);
        return;
      }
      const saved = await persistTableMutationPayload(objectId, before, deleteTableRow(before, tableSelection));
      if (saved) {
        setSelectedCanvasObjectId(objectId);
        setSelectedTableCell(null);
        setEditingTableCell(null);
      }
      setTableContextMenu(null);
      return;
    }

    if (structuredObject && actionId === 'delete_table_column') {
      const before = structuredObject.payload;
      if (!confirmDeleteNonEmptyTablePart(tableColumnHasText(before, tableSelection), 'column')) {
        setTableContextMenu(null);
        return;
      }
      const saved = await persistTableMutationPayload(objectId, before, deleteTableColumn(before, tableSelection));
      if (saved) {
        setSelectedCanvasObjectId(objectId);
        setSelectedTableCell(null);
        setEditingTableCell(null);
      }
      setTableContextMenu(null);
      return;
    }

    if (actionId === 'start_visual_connector_from_object') {
      setVisualConnectorDraft({ startObjectId: objectId });
      setSelectedCanvasObjectId(objectId);
      setTableContextMenu(null);
      return;
    }

    if (actionId === 'finish_visual_connector_to_object') {
      const startObjectId = visualConnectorDraft?.startObjectId;
      if (startObjectId && startObjectId !== objectId) {
        await createVisualConnectorBetweenObjects(startObjectId, objectId);
      }
      setVisualConnectorDraft(null);
      setTableContextMenu(null);
      return;
    }

    if (actionId === 'delete_canvas_object') {
      await deleteCanvasObjectWithBacking(objectId);
      setTableContextMenu(null);
    }
  };

  const handleTableCellTextCommit = async (
    selection: TableCellSelection,
    text: string,
  ): Promise<void> => {
    const structuredObject = structuredObjectById.get(selection.objectId);
    if (!structuredObject) {
      setEditingTableCell(null);
      return;
    }
    setEditingTableCell(null);
    setSelectedTableCell(selection);
    const saved = await persistTablePayload(
      selection.objectId,
      updateTableCellText(structuredObject.payload, selection.cellId, text),
    );
    if (saved) setSelectedCanvasObjectId(selection.objectId);
  };

  const handleVisualConnectorContextAction = async (actionId: CommandActionId) => {
    if (!visualConnectorContextMenu) return;
    const objectId = visualConnectorContextMenu.objectId;
    if (isCanvasObjectContextCommand(actionId)) {
      await handleCanvasObjectContextAction(actionId, objectId);
      return;
    }
    if (actionId !== 'delete_canvas_object') return;
    await deleteCanvasObjectWithBacking(objectId);
    setVisualConnectorContextMenu(null);
  };

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
    if (surfaceMode === 'canvas') {
      const surfaceRect = surfaceRef.current?.getBoundingClientRect();
      if (!surfaceRect) return null;
      const worldPoint = viewportPointToWorldPoint({
        x: event.clientX - surfaceRect.left,
        y: event.clientY - surfaceRect.top,
      }, viewportTransform);
      return {
        ...defaultDraftLayout,
        x: Math.max(0, worldPoint.x - pageOffsetX),
        y: Math.max(0, worldPoint.y),
        height,
        surface: 'canvas_workspace',
      };
    }

    const blockListRect = blockListRef.current?.getBoundingClientRect();
    if (!blockListRect) return null;
    return {
      ...defaultDraftLayout,
      y: Math.max(0, (event.clientY - blockListRect.top) / pageReading.displayScale),
      height,
      surface: 'formal_page',
    };
  };

  const handleBlankSurfaceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
    if (!hasContentGroupDragPayloadType(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleBlankSurfaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isBlankSurfaceDropTarget(event)) return;
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
    <section
      ref={surfaceRef}
      className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.pageReadingSurface} ${spacePanReady ? styles.canvasPanReady : ''} ${canvasPanning ? styles.canvasPanning : ''}`}
      data-page-frame-template={primaryPageFrameExtension?.templateId || primaryPageFrame?.templateId || 'none'}
      data-page-frame-background={primaryPageFrameExtension?.background.kind || primaryPageFrame?.background?.kind || 'none'}
      style={surfaceMode === 'page' ? primaryPageFrameTemplateStyle as CSSProperties & Record<string, string> : undefined}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={endCanvasPan}
      onPointerCancel={endCanvasPan}
      onWheel={handleCanvasWheel}
    >
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleImageFileChange}
      />
      <div
        className={surfaceMode === 'page' ? styles.pageReadingSpace : undefined}
        data-page-reading-space={surfaceMode === 'page' ? 'true' : undefined}
        style={surfaceMode === 'page' ? {
          width: pageDisplayBounds.width * pageReading.displayScale,
          height: pageDisplayBounds.height * pageReading.displayScale,
          overflowClipMargin: `${32 * pageReading.displayScale}px`,
        } : { display: 'contents' }}
      >
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
          left: -pageDisplayBounds.left * pageReading.displayScale,
          top: -pageDisplayBounds.top * pageReading.displayScale,
          paddingTop: pageReading.inset.top,
          paddingLeft: pageReading.inset.left,
          transform: `scale(${pageReading.displayScale})`,
          transformOrigin: '0 0',
        } : { display: 'contents' }}
      >
      <div
        ref={blockListRef}
        className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode && !contentReadOnly ? styles.layoutMode : ''}`}
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
          minHeight: surfaceMode === 'canvas' ? noteCanvasRuntime.world.height : pageReading.paperHeight - pageReading.inset.top - pageReading.inset.bottom,
          ...(surfaceMode === 'page' ? { width: pageReading.layoutWidth } : {}),
          ...transformedWorldStyle,
          ...documentTypographyStyle,
          ...primaryPageFrameTemplateStyle,
          '--formal-page-offset-x': `${primaryPageFrameX}px`,
          '--formal-page-width': `${primaryPageFrameWidth}px`,
          '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
          '--canvas-world-height': `${noteCanvasRuntime.world.height}px`,
        } as CSSProperties & Record<string, string | number>}
        onMouseDown={contentReadOnly ? undefined : handleBlockListMouseDownForDraft}
        onContextMenu={contentReadOnly ? undefined : handleBlankSurfaceContextMenu}
        onDoubleClick={contentReadOnly ? undefined : onPageSpaceDoubleClick}
        onDragOver={contentReadOnly ? undefined : handleBlankSurfaceDragOver}
        onDrop={contentReadOnly ? undefined : handleBlankSurfaceDrop}
      >
        {surfaceMode === 'canvas' && (
          <>
            {noteCanvasRuntime.pageFrames.map((pageFrame, index) => {
              const primary = pageFrame.id === primaryPageFrame?.id;
              const selected = pageFrame.id === selectedPageFrameId;
              const extension = pageFrameExtensionByFrameId.get(pageFrame.id);
              const pageStackId = extension?.pageStackId || 'none';
              const pageStackPageIndex = extension?.pageStackPageIndex ?? -1;
              const pageStackPageTotal = extension?.pageStackPageTotal || 0;
              const pageStackCollapsed = Boolean(extension?.pageStackCollapsed);
              const collapsedPreviewPages = extension?.pageStackCollapsedPreviewPages || 1;
              const hiddenByCollapsedStack = Boolean(
                pageStackCollapsed
                && pageStackPageIndex >= collapsedPreviewPages,
              );
              const preview = pageFrameInteractionPreview?.frameId === pageFrame.id
                ? pageFrameInteractionPreview
                : null;
              const pageFrameTemplateStyle = pageFrameTemplateToCssVars(
                extension?.background || pageFrame.background,
              );
              if (hiddenByCollapsedStack) {
                if (pageStackPageIndex !== collapsedPreviewPages) return null;
                return (
                  <button
                    key={`${pageStackId}:collapsed-tail`}
                    type="button"
                    className={styles.pageStackCollapsedTail}
                    data-page-stack-tail={pageStackId}
                    data-page-stack-id={pageStackId}
                    data-page-stack-page-index={pageStackPageIndex}
                    data-page-stack-page-total={pageStackPageTotal}
                    data-page-stack-collapsed="true"
                    onClick={() => onTogglePageStackCollapse(pageFrame.id)}
                    disabled={contentReadOnly}
                    style={{
                      left: pageFrame.x,
                      top: pageFrame.y,
                      width: Math.min(320, pageFrame.width),
                    }}
                  >
                    {`${Math.max(0, pageStackPageTotal - collapsedPreviewPages)} pages hidden`}
                  </button>
                );
              }
              return (
                <div
                  key={pageFrame.id}
                  className={`${styles.formalPageBoundary} ${primary ? styles.formalPageBoundaryPrimary : styles.formalPageBoundarySecondary} ${layoutMode && !contentReadOnly ? styles.formalPageBoundaryOperable : ''} ${selected ? styles.formalPageBoundarySelected : ''}`}
                  data-canvas-object-id={pageFrame.id}
                  data-page-frame-id={pageFrame.id}
                  data-page-frame-role={pageFrame.role}
                  data-page-frame-primary={primary ? 'true' : 'false'}
                  data-page-frame-exportable={pageFrame.exportable ? 'true' : 'false'}
                  data-page-frame-template={extension?.templateId || pageFrame.templateId || 'none'}
                  data-page-frame-background={extension?.background.kind || pageFrame.background?.kind || 'none'}
                  data-page-frame-index={index}
                  data-page-frame-selected={selected ? 'true' : 'false'}
                  data-page-stack-id={pageStackId}
                  data-page-stack-page-index={pageStackPageIndex}
                  data-page-stack-page-total={pageStackPageTotal}
                  data-page-stack-collapsed={pageStackCollapsed ? 'true' : 'false'}
                  onPointerDown={(event) => handlePageFramePointerDown(event, pageFrame)}
                  onPointerMove={handlePageFramePointerMove}
                  onPointerUp={endPageFrameOperation}
                  onPointerCancel={endPageFrameOperation}
                  style={{
                    ...pageFrameTemplateStyle,
                    left: preview?.x ?? pageFrame.x,
                    top: preview?.y ?? pageFrame.y,
                    width: preview?.width ?? pageFrame.width,
                    height: preview?.height ?? pageFrame.height,
                    minHeight: preview?.height ?? pageFrame.height,
                  }}
                >
                  {extension?.pageStackNumberLabel && (
                    <span
                      className={styles.pageStackNumberBadge}
                      data-page-stack-number-label={extension.pageStackNumberLabel}
                    >
                      {extension.pageStackNumberLabel}
                    </span>
                  )}
                  {selected && layoutMode && !contentReadOnly && (
                    <div
                      className={styles.pageFrameResizeHandle}
                      data-page-frame-resize-handle="true"
                      onPointerDown={(event) => handlePageFrameResizePointerDown(event, pageFrame)}
                      onPointerMove={handlePageFramePointerMove}
                      onPointerUp={endPageFrameOperation}
                      onPointerCancel={endPageFrameOperation}
                    />
                  )}
                </div>
              );
            })}
            <div className={styles.scratchWorkspaceLabel}>Scratch workspace</div>
          </>
        )}
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
        {surfaceMode === 'canvas' && (
          <VisualConnectorLayer
            connectors={noteCanvasRuntime.visualConnectors}
            placementByObjectId={placementByObjectId}
            canvasObjectById={canvasObjectById}
            selectedObjectId={selectedCanvasObjectId}
            readOnly={contentReadOnly}
            onConnectorContextMenu={(event, canvasObject) => {
              event.preventDefault();
              event.stopPropagation();
              setCanvasBlankContextMenu(null);
              setPageFrameContextMenu(null);
              setBlockContextMenu(null);
              setShapeContextMenu(null);
              setTableContextMenu(null);
              setImageContextMenu(null);
              setVisualConnectorContextMenu({
                objectId: canvasObject.objectId,
                point: { x: event.clientX, y: event.clientY },
              });
              setSelectedCanvasObjectId(canvasObject.objectId);
            }}
          />
        )}
        {surfaceMode === 'canvas' && (
          <ImageObjectLayer
            placements={imagePlacements}
            canvasObjectById={canvasObjectById}
            imageObjectById={imageObjectById}
            selectedObjectId={selectedCanvasObjectId}
            interactionPreview={shapeInteractionPreview}
            layoutMode={layoutMode}
            readOnly={contentReadOnly}
            onImagePointerDown={handleShapePointerDown}
            onImageResizePointerDown={handleShapeResizePointerDown}
            onImagePointerMove={handleShapePointerMove}
            onImagePointerEnd={endShapeOperation}
            onImageContextMenu={(event, canvasObject) => {
              event.preventDefault();
              event.stopPropagation();
              setCanvasBlankContextMenu(null);
              setPageFrameContextMenu(null);
              setBlockContextMenu(null);
              setShapeContextMenu(null);
              setVisualConnectorContextMenu(null);
              setTableContextMenu(null);
              setSelectedTableCell(null);
              setEditingTableCell(null);
              setImageContextMenu({
                objectId: canvasObject.objectId,
                point: { x: event.clientX, y: event.clientY },
              });
              setSelectedCanvasObjectId(canvasObject.objectId);
            }}
          />
        )}
        {surfaceMode === 'canvas' && (
          <TableObjectLayer
            placements={tablePlacements}
            canvasObjectById={canvasObjectById}
            structuredObjectById={structuredObjectById}
            selectedObjectId={selectedCanvasObjectId}
            interactionPreview={shapeInteractionPreview}
            layoutMode={layoutMode}
            readOnly={contentReadOnly}
            selectedCell={selectedTableCell}
            editingCell={editingTableCell}
            onTablePointerDown={handleShapePointerDown}
            onTableResizePointerDown={handleShapeResizePointerDown}
            onTablePointerMove={handleShapePointerMove}
            onTablePointerEnd={endShapeOperation}
            onSelectCell={(selection) => {
              setSelectedTableCell(selection);
              setSelectedCanvasObjectId(selection.objectId);
            }}
            onStartCellEdit={(selection) => {
              setSelectedTableCell(selection);
              setSelectedCanvasObjectId(selection.objectId);
              setEditingTableCell(selection);
            }}
            onCancelCellEdit={() => setEditingTableCell(null)}
            onCommitCellText={(selection, text) => {
              void handleTableCellTextCommit(selection, text);
            }}
            onTableContextMenu={(event, canvasObject, selection, pendingEdit: PendingTableCellEdit | null = null) => {
              event.preventDefault();
              event.stopPropagation();
              const menuPoint = { x: event.clientX, y: event.clientY };
              setCanvasBlankContextMenu(null);
              setPageFrameContextMenu(null);
              setBlockContextMenu(null);
              setShapeContextMenu(null);
              setImageContextMenu(null);
              setVisualConnectorContextMenu(null);
              void (async () => {
                if (pendingEdit) {
                  await handleTableCellTextCommit(pendingEdit.selection, pendingEdit.text);
                } else {
                  setEditingTableCell(null);
                }
                if (selection) setSelectedTableCell(selection);
                setTableContextMenu({
                  objectId: canvasObject.objectId,
                  point: menuPoint,
                });
                setSelectedCanvasObjectId(canvasObject.objectId);
              })();
            }}
          />
        )}
        {surfaceMode === 'canvas' && (
          <ShapeObjectLayer
            placements={shapePlacements}
            canvasObjectById={canvasObjectById}
            shapeTextBindingByObjectId={shapeTextBindingByObjectId}
            selectedObjectId={selectedCanvasObjectId}
            interactionPreview={shapeInteractionPreview}
            layoutMode={layoutMode}
            readOnly={contentReadOnly}
            onShapePointerDown={handleShapePointerDown}
            onShapeResizePointerDown={handleShapeResizePointerDown}
            onShapePointerMove={handleShapePointerMove}
            onShapePointerEnd={endShapeOperation}
            onShapeContextMenu={(event, canvasObject) => {
              event.preventDefault();
              event.stopPropagation();
              setCanvasBlankContextMenu(null);
              setPageFrameContextMenu(null);
              setBlockContextMenu(null);
              setTableContextMenu(null);
              setImageContextMenu(null);
              setVisualConnectorContextMenu(null);
              setSelectedTableCell(null);
              setEditingTableCell(null);
              setShapeContextMenu({
                objectId: canvasObject.objectId,
                point: { x: event.clientX, y: event.clientY },
              });
              setSelectedCanvasObjectId(canvasObject.objectId);
            }}
            onShapeTextFocus={onFocusBlock}
            onShapeTextBlur={onReleaseTextFocus}
            onShapeTextChange={(block, value, caret, anchorElement) => {
              handlePlainTextBackedBlockChange(block, value, caret, anchorElement);
            }}
            onShapeTextSave={async (objectId, block, value) => {
              if (value.trim().length === 0) {
                await demoteShapeText(objectId);
                return null;
              }
              return onSaveBlock(block, value, {
                silent: true,
                textFlow: textFlowWithPlainText(block, value),
              });
            }}
          />
        )}
        {snapGuide?.x !== undefined && (
          <div className={styles.snapGuideVertical} style={{ left: snapGuide.x + pageOffsetX }} />
        )}
        {snapGuide?.y !== undefined && (
          <div className={styles.snapGuideHorizontal} style={{ top: snapGuide.y }} />
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
              contentReadOnly={contentReadOnly}
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
              onFocused={onFocusBlock}
              onFocusReleased={onReleaseTextFocus}
              onAnnotationSelect={(annotationId) => setSelectedAnnotationIds([annotationId])}
              onAnnotationContextMenu={handleAnnotationContextMenu}
              onAnnotationStackSelect={setSelectedAnnotationIds}
              onTextUnitSelection={handleTextUnitSelection}
              onTextUnitContextMenu={handleTextUnitContextMenu}
              onBlockContextMenu={(point) => {
                setAnnotationContextMenu(null);
                setAnnotationHighlightContextMenu(null);
                setCanvasBlankContextMenu(null);
                setPageFrameContextMenu(null);
                setShapeContextMenu(null);
                setImageContextMenu(null);
                setVisualConnectorContextMenu(null);
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
              onTextFlowChange={(textFlow) => void handleBlockTextFlowChange(block, textFlow)}
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
              onSelect={() => onSelectBlock(block.id)}
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
          {([
            ['fit_width', 'Fit width'], ['fit_page', 'Fit page'], ['physical', '100% physical'],
          ] as const).map(([gear, label]) => (
            <button key={gear} type="button" className={styles.canvasZoomReset}
              aria-pressed={readingViewState.gear === gear} data-page-reading-select={gear}
              onClick={() => {
                onPageReadingGearChange?.(gear);
                if (gear === 'fit_page' && pageReading.isLongPage) {
                  surfaceRef.current?.closest<HTMLElement>('[data-app-main-scroll="true"]')?.scrollTo({ top: 0, behavior: 'auto' });
                }
              }}>{label}</button>
          ))}
          <button type="button" className={styles.canvasZoomButton} aria-label="Decrease page reading step"
            disabled={readingViewState.stepFactor <= 0.5} onClick={() => onPageReadingStep?.(-1)}>−</button>
          <output className={styles.pageReadingPercent} aria-label="Page display scale">{Math.round(pageReading.displayScale * 100)}%</output>
          <button type="button" className={styles.canvasZoomButton} aria-label="Increase page reading step"
            disabled={readingViewState.stepFactor >= 2} onClick={() => onPageReadingStep?.(1)}>+</button>
        </div>
      )}
      {surfaceMode === 'canvas' && (
        <div
          className={styles.canvasZoomControl}
          data-canvas-zoom-control="true"
          aria-label="Canvas zoom controls"
        >
          <button
            type="button"
            className={styles.canvasZoomButton}
            onClick={() => nudgeCanvasZoom(0.88)}
            aria-label="Zoom out"
          >
            -
          </button>
          <input
            className={styles.canvasZoomSlider}
            data-canvas-zoom-slider="true"
            type="range"
            min={40}
            max={180}
            step={5}
            value={Math.min(180, Math.max(40, canvasZoomPercent))}
            onChange={handleCanvasZoomSliderChange}
            aria-label="Canvas zoom"
          />
          <button
            type="button"
            className={styles.canvasZoomButton}
            onClick={() => nudgeCanvasZoom(1.12)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className={styles.canvasZoomReset}
            data-canvas-zoom-reset="true"
            onClick={onResetViewport}
            aria-label="Reset canvas zoom"
          >
            {canvasZoomPercent}%
          </button>
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
        onSaveTypographyProfile={onSaveDocumentTypographyProfile}
        onClose={clearDraft}
      />
      <ObjectInspectorLayer
        model={surfaceMode === 'canvas' && !contentReadOnly ? selectedCanvasObjectInspectorModel : null}
        onClose={() => setSelectedCanvasObjectId(null)}
        onAction={(actionId) => {
          void handleCanvasObjectContextAction(actionId);
        }}
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
      <ContextMenuLayer
        menu={canvasBlankMenu}
        onClose={() => setCanvasBlankContextMenu(null)}
        onAction={(actionId) => handleCanvasBlankContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={pageFrameShellMenu}
        onClose={() => setPageFrameContextMenu(null)}
        onAction={(actionId) => handlePageFrameContextAction(actionId)}
      />
      <ContextMenuLayer
        menu={shapeShellMenu}
        onClose={() => setShapeContextMenu(null)}
        onAction={(actionId) => {
          void handleShapeContextAction(actionId);
        }}
      />
      <ContextMenuLayer
        menu={imageShellMenu}
        onClose={() => setImageContextMenu(null)}
        onAction={(actionId) => {
          void handleImageContextAction(actionId);
        }}
      />
      <ContextMenuLayer
        menu={tableShellMenu}
        onClose={() => setTableContextMenu(null)}
        onAction={(actionId) => {
          void handleTableContextAction(actionId);
        }}
      />
      <ContextMenuLayer
        menu={visualConnectorShellMenu}
        onClose={() => setVisualConnectorContextMenu(null)}
        onAction={(actionId) => {
          void handleVisualConnectorContextAction(actionId);
        }}
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
      <InlineNamePromptLayer
        prompt={imageMetadataPrompt ? {
          point: imageMetadataPrompt.point,
          title: imageMetadataPrompt.field === 'caption' ? 'Image caption' : 'Image alt text',
          initialValue: imageMetadataPrompt.initialValue,
          confirmLabel: 'Save',
        } : null}
        onCancel={() => setImageMetadataPrompt(null)}
        onCommit={(value) => {
          void handleImageMetadataPromptCommit(value);
        }}
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
          onSavePurposeFrames={onSavePurposeFrames}
        />
      )}
    </section>
  );
}
