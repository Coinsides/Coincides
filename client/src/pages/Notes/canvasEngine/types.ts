export type NoteCanvasMode = 'page' | 'canvas';

export type CanvasSurface = 'formal_page' | 'canvas_workspace' | 'tray';

export type CanvasBoundaryKind = 'inside' | 'outside' | 'crossing';

export type PageFrameCrossingExportPolicy =
  | 'exclude_workspace'
  | 'include_if_center_inside'
  | 'include_if_intersects'
  | 'clip_to_page_frame'
  | 'manual';

export type PageFrameCrossingExportDecisionKind =
  | 'included'
  | 'excluded'
  | 'clipped'
  | 'manual_required';

export type PageFrameCrossingExportDecisionReason =
  | 'center_inside_page_frame'
  | 'intersects_page_frame'
  | 'outside_page_frame'
  | 'workspace_excluded'
  | 'manual_required';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

export interface PageFrameCrossingExportDecision {
  policy: PageFrameCrossingExportPolicy;
  decision: PageFrameCrossingExportDecisionKind;
  reason: PageFrameCrossingExportDecisionReason;
  exportCandidate: boolean;
  requiresManualDecision: boolean;
  clippedRect?: CanvasRect;
}

export interface CanvasInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PageFramePageSize = 'A4' | 'Letter' | 'Custom';

export type PageFrameTemplateId =
  | 'a4_portrait'
  | 'letter_portrait'
  | 'screen_note'
  | 'custom';

export type PageFrameBackgroundKind = 'paper' | 'screen' | 'custom';

export interface PageFrameBackgroundStyle {
  kind: PageFrameBackgroundKind;
  fill: string;
  borderColor: string;
  shadow: string;
  gridVisible?: boolean;
}

export interface DocumentTypographyProfile {
  profileId: string;
  fontFamily: string;
  // Layout units are internal px; paper presentation applies physicalScale later.
  fontSizePx: number;
  lineHeightPx: number;
  paragraphSpacingPx: number;
  averageCharWidthPx: number;
}

export interface PageFramePrintProfile {
  pageSize: PageFramePageSize;
  physicalWidthMm: number | null;
  physicalScale: number;
  width: number;
  height: number;
  contentInset: CanvasInset;
  contentWidth: number;
  contentHeight: number;
  documentTypography: DocumentTypographyProfile;
}

export interface PageFrameTemplate {
  templateId: PageFrameTemplateId;
  label: string;
  pageSize: PageFramePageSize;
  width: number;
  height: number;
  contentInset: CanvasInset;
  background: PageFrameBackgroundStyle;
  exportable: boolean;
  defaultTypographyToken: DocumentTypographyProfile['profileId'];
}

export type PageFrameSlotKind = 'header' | 'footer' | 'page_number';

export type PageFrameSlotTextSource = 'empty' | 'generated' | 'metadata_text';

export interface PageFrameSlot {
  slotId: string;
  frameId: string;
  kind: PageFrameSlotKind;
  enabled: boolean;
  rect: CanvasRect;
  text: string;
  textSource: PageFrameSlotTextSource;
  align: 'left' | 'center' | 'right';
}

export interface PageFrameSlots {
  header?: PageFrameSlot;
  footer?: PageFrameSlot;
  pageNumber?: PageFrameSlot;
}

export interface CanvasViewport extends CanvasPoint, CanvasSize {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface PageFrameModel extends CanvasRect {
  id: string;
  role: 'primary_page_frame' | 'secondary_page_frame';
  templateId?: PageFrameTemplateId;
  pageSize?: PageFramePageSize;
  background?: PageFrameBackgroundStyle;
  exportable: boolean;
  contentInset: CanvasInset;
}

export type PageStackCreatedFrom =
  | 'a4_note_seed'
  | 'user_created'
  | 'merge'
  | 'import';

export interface PageStackNumberingModel {
  enabled: boolean;
  startAt: number;
}

export interface PageStackLayoutModel {
  direction: 'vertical';
  gap: number;
  collapsedPreviewPages: number;
}

export interface PageStackModel {
  id: string;
  displayName: string;
  frameIds: string[];
  primaryFrameId: string | null;
  selectedFrameId?: string | null;
  collapsed: boolean;
  numbering: PageStackNumberingModel;
  layout: PageStackLayoutModel;
  createdFrom: PageStackCreatedFrom;
}

export interface PageFrameCollectionModel {
  pageFrames: PageFrameModel[];
  pageStacks?: PageStackModel[];
  primaryFrameId: string | null;
  primaryStackId?: string | null;
  selectedFrameId?: string | null;
  selectedStackId?: string | null;
}

export type PageStackBlockFragmentRole =
  | 'single'
  | 'start'
  | 'middle'
  | 'end';

export interface PageStackBlockFragmentRef {
  pageStackId: string;
  pageFrameId: string;
  pageIndex: number;
  pageTotal: number;
  fragmentIndex: number;
  fragmentTotal: number;
  role: PageStackBlockFragmentRole;
  visibleRect: CanvasRect;
  clippedTop: boolean;
  clippedBottom: boolean;
}

export interface PageStackBlockFragmentProjection extends PageStackBlockFragmentRef {
  blockId: string;
  blockRect: CanvasRect;
  pageContentRect: CanvasRect;
}

export interface PageSliceOpenOriginalTarget {
  noteId: string;
  pageStackId: string;
  pageFrameId: string;
}

export interface PageSliceSnapshotV1 {
  id: string;
  kind: 'page_slice_snapshot';
  source: 'page_stack_page';
  noteId: string;
  pageFrameId: string;
  pageStackId: string;
  pageIndex: number;
  pageTotal: number;
  label: string;
  bbox: CanvasRect;
  contentBbox: CanvasRect;
  blockIds: string[];
  snapshotText: string;
  snapshotHash: string;
  capturedAt: string;
  openOriginal: PageSliceOpenOriginalTarget;
  metadata?: Record<string, unknown>;
}

export interface PageSliceReferenceDescriptor {
  mode: 'reference';
  snapshotId: string;
  noteId: string;
  pageFrameId: string;
  pageStackId: string;
  pageIndex: number;
  pageTotal: number;
  label: string;
  previewText: string;
  openOriginal: PageSliceOpenOriginalTarget;
}

export interface CanvasWorldModel extends CanvasSize {
  origin: CanvasPoint;
}

export type CanvasObjectKind =
  | 'page_frame'
  | 'paragraph_block_projection'
  | 'shape'
  | 'visual_connector'
  | 'image'
  | 'table'
  | 'content_group_projection'
  | 'structured_object';

export type CanvasObjectBacking =
  | 'none'
  | 'note_block'
  | 'asset'
  | 'structured_object'
  | 'content_group';

export type CanvasObjectClass =
  | 'pure'
  | 'block_backed'
  | 'media'
  | 'structured'
  | 'projection_backed';

export type CanvasObjectStatus = 'active' | 'archived';

export type CanvasObjectSource =
  | 'runtime_seed'
  | 'entity'
  | 'proposal'
  | Record<string, unknown>;

export type CanvasPlacementVisibilityState =
  | 'normal'
  | 'scratch'
  | 'ai_hidden'
  | 'export_hidden';

export type CanvasRenderVisibility = 'visible' | 'hidden' | 'collapsed';

export type CanvasMountTargetKind =
  | 'note_block'
  | 'asset'
  | 'structured_object'
  | 'content_group';

export type CanvasProjectionMode =
  | 'owned'
  | 'reference'
  | 'duplicate'
  | 'fork'
  | 'materialized';

export type CanvasSyncPolicy = 'manual' | 'read_through' | 'snapshot';

export interface NoteCanvas {
  canvasId: string;
  noteId?: string;
  world: CanvasWorldModel;
  defaultMode: NoteCanvasMode;
  primaryFrameId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasObject {
  objectId: string;
  canvasId: string;
  kind: CanvasObjectKind;
  backing: CanvasObjectBacking;
  objectClass: CanvasObjectClass;
  status: CanvasObjectStatus;
  source?: CanvasObjectSource;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanvasPlacement extends CanvasRect {
  placementId: string;
  objectId: string;
  canvasId: string;
  frameId?: string;
  surface: CanvasSurface;
  boundaryRole: CanvasBoundaryKind;
  zIndex: number;
  orderIndex?: number | null;
  snapState?: 'snapped' | 'free';
  visibilityState?: CanvasPlacementVisibilityState;
  renderVisibility?: CanvasRenderVisibility;
  rotation: number;
}

export interface ContentMount {
  mountId: string;
  objectId: string;
  targetKind: CanvasMountTargetKind;
  targetId: string;
  projectionMode: CanvasProjectionMode;
  syncPolicy: CanvasSyncPolicy;
}

export interface PageFrameExtension {
  frameId: string;
  objectId: string;
  pageStackId?: string | null;
  pageStackPageIndex?: number | null;
  pageStackPageTotal?: number | null;
  pageStackCollapsed?: boolean;
  pageStackCollapsedPreviewPages?: number | null;
  pageStackNumberLabel?: string | null;
  templateId: PageFrameTemplateId;
  pageSize: PageFramePageSize;
  width: number;
  height: number;
  contentInset: CanvasInset;
  background: PageFrameBackgroundStyle;
  defaultTypographyToken: DocumentTypographyProfile['profileId'];
  documentTypography: DocumentTypographyProfile;
  rulerEnabled: boolean;
  snapEnabled: boolean;
  headerFooterEnabled: boolean;
  pageNumberEnabled: boolean;
  slots?: PageFrameSlots;
  exportable: boolean;
}

export type PageFrameGuideKind =
  | 'top_ruler'
  | 'left_margin'
  | 'right_margin'
  | 'center_line';

export type PageFrameGuideAxis = 'x' | 'y';

export interface PageFrameGuide {
  id: string;
  frameId: string;
  kind: PageFrameGuideKind;
  axis: PageFrameGuideAxis;
  x: number;
  y: number;
  length: number;
}

export interface PageFrameGuideSet {
  frameId: string;
  outerRect: CanvasRect;
  contentRect: CanvasRect;
  topRuler: PageFrameGuide;
  leftMargin: PageFrameGuide;
  rightMargin: PageFrameGuide;
  centerLine: PageFrameGuide;
}

export interface PageFrameGuideVisibility {
  topRuler: boolean;
  leftRight: boolean;
  center: boolean;
}

export interface PageFrameSnapResult {
  rect: CanvasRect;
  guide: { x?: number; y?: number } | null;
  snapState: 'snapped' | 'free';
  snappedAxes: {
    x: boolean;
    y: boolean;
  };
}

export interface VisualStyle {
  styleId: string;
  objectId: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export type CanvasObjectStylePresetId =
  | 'shape.default'
  | 'shape.sticky_note';

export interface CanvasObjectStyleMetadata {
  presetId: CanvasObjectStylePresetId;
  family: 'shape';
  variant: 'default' | 'yellow';
  textInset?: number;
}

export interface CanvasObjectPresentationRef {
  presetId: CanvasObjectStylePresetId;
  family: CanvasObjectStyleMetadata['family'];
  variant: CanvasObjectStyleMetadata['variant'];
  textBacked: boolean;
  textInset?: number;
}

export interface VisualConnector {
  connectorId: string;
  objectId: string;
  canvasId: string;
  start: CanvasPoint;
  end: CanvasPoint;
  startKind?: 'object' | 'point';
  endKind?: 'object' | 'point';
  startObjectId?: string;
  endObjectId?: string;
  startAnchor?: 'auto' | 'center' | 'north' | 'east' | 'south' | 'west';
  endAnchor?: 'auto' | 'center' | 'north' | 'east' | 'south' | 'west';
  relationKind: 'visual_only';
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  stroke?: string;
  strokeWidth?: number;
  startMarker?: 'none' | 'arrow' | 'dot';
  endMarker?: 'none' | 'arrow' | 'dot';
  styleId?: string;
  metadata?: Record<string, unknown>;
}

export interface CanvasImageAsset {
  assetId: string;
  kind: 'image';
  filename: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  sha256?: string;
  blobUrl: string;
  metadata?: Record<string, unknown>;
}

export interface ImageCanvasObject {
  imageObjectId: string;
  objectId: string;
  canvasId: string;
  assetId: string;
  asset: CanvasImageAsset;
  fit: 'contain' | 'cover';
  caption?: string;
  altText?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  metadata?: Record<string, unknown>;
}

export interface TableRowModel {
  rowId: string;
  index: number;
  height?: number;
}

export interface TableColumnModel {
  columnId: string;
  index: number;
  width?: number;
  label?: string;
}

export interface TableCellModel {
  cellId: string;
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  text: string;
  valueType: 'text';
}

export interface TableStructuredPayload {
  version: 'table.v1';
  rows: TableRowModel[];
  columns: TableColumnModel[];
  cells: TableCellModel[];
}

export interface StructuredCanvasObject {
  objectId: string;
  canvasId: string;
  structuredKind: 'table';
  schemaVersion: 'table.v1';
  rowCount: number;
  columnCount: number;
  payload: TableStructuredPayload;
  metadata?: Record<string, unknown>;
}

export interface CanvasAIReadableNode {
  id: string;
  kind: CanvasObjectKind | 'canvas' | 'page_stack' | 'page_frame_reference';
  label?: string;
  bbox: CanvasRect;
  contentBbox?: CanvasRect;
  zIndex: number;
  surface: CanvasSurface;
  frameId?: string;
  visible: boolean;
  selected?: boolean;
  order?: number;
  readingOrder?: number;
  pageStackId?: string | null;
  pageStackPageIndex?: number | null;
  pageStackPageTotal?: number | null;
  pageStackBlockFragments?: PageStackBlockFragmentRef[];
  state?: {
    collapsed?: boolean;
    pageCount?: number;
    numberingStart?: number;
  };
  pageFrameRef?: {
    role: PageFrameModel['role'];
    templateId?: PageFrameTemplateId;
    pageSize?: PageFramePageSize;
    exportable: boolean;
    contentInset: PageFrameModel['contentInset'];
    defaultTypographyToken?: DocumentTypographyProfile['profileId'];
    documentTypography?: DocumentTypographyProfile;
    headerFooterEnabled?: boolean;
    pageNumberEnabled?: boolean;
    stackId?: string | null;
    stackPageIndex?: number | null;
    stackPageTotal?: number | null;
    primary: boolean;
  };
  pageFrameStyle?: {
    background: PageFrameBackgroundStyle;
  };
  pageFrameSlots?: PageFrameSlots;
  text?: string;
  summary?: string;
  presentationRef?: CanvasObjectPresentationRef;
  contentRef?: {
    kind: CanvasMountTargetKind;
    id: string;
  };
  connectorRef?: {
    startKind?: 'object' | 'point';
    endKind?: 'object' | 'point';
    startObjectId?: string;
    endObjectId?: string;
    startAnchor?: VisualConnector['startAnchor'];
    endAnchor?: VisualConnector['endAnchor'];
    relationKind: 'visual_only';
    start: CanvasPoint;
    end: CanvasPoint;
  };
  imageRef?: {
    assetId: string;
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
    fit: ImageCanvasObject['fit'];
    caption?: string;
    altText?: string;
  };
  structuredRef?: {
    structuredKind: StructuredCanvasObject['structuredKind'];
    schemaVersion: StructuredCanvasObject['schemaVersion'];
    rowCount: number;
    columnCount: number;
    payload: TableStructuredPayload;
  };
  children?: CanvasAIReadableNode[];
}

export interface CanvasAIReadableSnapshot {
  snapshotId: string;
  canvasId: string;
  source: 'derived_runtime';
  generatedAt?: string;
  nodes: CanvasAIReadableNode[];
  selectedObjectIds: string[];
}

export type CanvasCommandKind =
  | 'create_canvas_object'
  | 'move_canvas_object'
  | 'resize_canvas_object'
  | 'update_visual_style'
  | 'delete_canvas_object'
  | 'set_primary_page_frame';

export interface CanvasCommand {
  commandId: string;
  canvasId: string;
  kind: CanvasCommandKind;
  actor: 'user' | 'system' | 'agent_proposal';
  createdAt?: string;
  payload: Record<string, unknown>;
}

export interface CanvasDelta {
  commandId: string;
  created?: Array<{ kind: string; id: string }>;
  updated?: Array<{ kind: string; id: string; before?: unknown; after?: unknown }>;
  deleted?: Array<{ kind: string; id: string }>;
}

export interface BlockPlacementModel extends CanvasPlacement {
  blockId: string;
  objectKind: 'note_block';
}

export interface CanvasObjectReserve extends CanvasRect {
  id: string;
  kind: 'shape' | 'freehand' | 'image' | 'frame' | 'region';
  rotation?: number;
}

export interface RelationEndpointReserve {
  id: string;
  ownerId: string;
  ownerKind: 'note_block' | 'canvas_object' | 'page_frame';
  anchor: CanvasPoint;
  normal?: CanvasPoint;
}

export interface NoteCanvasRuntimeModel {
  coordinateContract?: import('./placementContractService').CoordinateContract;
  version: string;
  route: 'self_owned_minimal_hybrid';
  mode: NoteCanvasMode;
  world: CanvasWorldModel;
  viewport: CanvasViewport;
  primaryPageFrame: PageFrameModel | null;
  pageFrames: PageFrameModel[];
  pageStacks: PageStackModel[];
  blockPlacements: BlockPlacementModel[];
  canvasObjects: CanvasObject[];
  canvasPlacements: CanvasPlacement[];
  contentMounts: ContentMount[];
  pageFrameExtensions: PageFrameExtension[];
  blockFragmentProjections: PageStackBlockFragmentProjection[];
  visualStyles: VisualStyle[];
  visualConnectors: VisualConnector[];
  imageObjects: ImageCanvasObject[];
  structuredObjects: StructuredCanvasObject[];
  canvasAIReadableSnapshot: CanvasAIReadableSnapshot;
  visibleBlockIds: string[];
  canvasObjectReserve: CanvasObjectReserve[];
  relationEndpointReserve: RelationEndpointReserve[];
}
