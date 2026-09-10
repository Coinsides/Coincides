import {
  normalizePageFrameCollection,
} from './pageFrameCollectionService';
import { resolveGenericPlacementToWorld, type CoordinateContract } from './placementContractService';
import type {
  CanvasBoundaryKind,
  CanvasMountTargetKind,
  CanvasObject,
  CanvasObjectBacking,
  CanvasObjectClass,
  CanvasObjectKind,
  CanvasObjectSource,
  CanvasObjectStatus,
  CanvasPlacement,
  CanvasPlacementVisibilityState,
  CanvasProjectionMode,
  CanvasRenderVisibility,
  CanvasSurface,
  CanvasSyncPolicy,
  ContentMount,
  ImageCanvasObject,
  PageFrameCollectionModel,
  PageFrameModel,
  StructuredCanvasObject,
  TableCellModel,
  TableColumnModel,
  TableRowModel,
  TableStructuredPayload,
  VisualConnector,
} from './types';

export interface CanvasBlockLayoutRecord {
  placement_id: string;
  block_id: string;
  layout: Record<string, unknown>;
}

export interface NoteCanvasPersistencePayload {
  coordinateContract?: CoordinateContract;
  canvasObjects: CanvasObject[];
  canvasPlacements: CanvasPlacement[];
  contentMounts: ContentMount[];
  visualConnectors: VisualConnector[];
  imageObjects: ImageCanvasObject[];
  structuredObjects: StructuredCanvasObject[];
  pageFrameCollection: PageFrameCollectionModel | null;
  blockLayouts: CanvasBlockLayoutRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(raw: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return fallback;
}

function readOptionalString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  const value = readString(raw, keys, '');
  return value || undefined;
}

function readNumber(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
}

function readOptionalNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function normalizeCanvasObjectSource(value: unknown): CanvasObjectSource {
  if (isRecord(value)) return value;
  if (value === 'runtime_seed' || value === 'entity' || value === 'proposal') return value;
  return 'entity';
}

function normalizeShapeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const shapeType = metadata.shapeType || metadata.shape_type;
  if (shapeType !== 'rectangle' && shapeType !== 'ellipse') return metadata;
  return {
    ...metadata,
    shapeType,
  };
}

function normalizeCanvasObject(raw: unknown): CanvasObject | null {
  if (!isRecord(raw)) return null;
  const objectId = readString(raw, ['objectId', 'object_id', 'id']);
  const kind = readString(raw, ['kind']) as CanvasObjectKind;
  if (!objectId || !kind) return null;
  const metadata = isRecord(raw.metadata) ? normalizeShapeMetadata(raw.metadata) : {};
  return {
    objectId,
    canvasId: readString(raw, ['canvasId', 'canvas_id'], 'primary-note-canvas'),
    kind,
    backing: readString(raw, ['backing'], 'none') as CanvasObjectBacking,
    objectClass: readString(raw, ['objectClass', 'object_class'], 'pure') as CanvasObjectClass,
    status: readString(raw, ['status'], 'active') as CanvasObjectStatus,
    source: normalizeCanvasObjectSource(raw.source ?? raw.source_json),
    metadata,
    ...(kind === 'freehand' && isRecord(metadata.freehand) ? { data: metadata.freehand } : {}),
    createdAt: readOptionalString(raw, ['createdAt', 'created_at']),
    updatedAt: readOptionalString(raw, ['updatedAt', 'updated_at']),
  };
}

function normalizeSnapState(value: unknown): CanvasPlacement['snapState'] {
  if (value === 'snapped' || value === 'free') return value;
  if (isRecord(value)) {
    const state = value.state;
    if (state === 'snapped' || state === 'free') return state;
  }
  return undefined;
}

function normalizeCanvasPlacement(
  raw: unknown,
  objectKinds: Map<string, CanvasObjectKind>,
  frames: PageFrameModel[],
  coordinateContract: CoordinateContract,
): CanvasPlacement | null {
  if (!isRecord(raw)) return null;
  const placementId = readString(raw, ['placementId', 'placement_id', 'id']);
  const objectId = readString(raw, ['objectId', 'object_id']);
  if (!placementId || !objectId) return null;
  const surface = readString(raw, ['surface'], 'canvas_workspace') as CanvasSurface;
  const placement: CanvasPlacement = {
    placementId,
    objectId,
    canvasId: readString(raw, ['canvasId', 'canvas_id'], 'primary-note-canvas'),
    frameId: readOptionalString(raw, ['frameId', 'frame_id']),
    surface,
    boundaryRole: readString(
      raw,
      ['boundaryRole', 'boundary_role'],
      surface === 'formal_page' ? 'inside' : 'outside',
    ) as CanvasBoundaryKind,
    x: readNumber(raw, ['x']),
    y: readNumber(raw, ['y']),
    width: readNumber(raw, ['width']),
    height: readNumber(raw, ['height']),
    rotation: readNumber(raw, ['rotation']),
    zIndex: readNumber(raw, ['zIndex', 'z_index']),
    orderIndex: readOptionalNumber(raw, ['orderIndex', 'order_index']) ?? null,
    snapState: normalizeSnapState(raw.snapState ?? raw.snap_state),
    visibilityState: readOptionalString(
      raw,
      ['visibilityState', 'visibility_state'],
    ) as CanvasPlacementVisibilityState | undefined,
    renderVisibility: readOptionalString(
      raw,
      ['renderVisibility', 'render_visibility'],
    ) as CanvasRenderVisibility | undefined,
  };
  const metadata = isRecord(raw.metadata) ? raw.metadata : {};
  const layoutPolicy = isRecord(metadata.layout_policy) ? metadata.layout_policy : {};
  return resolveGenericPlacementToWorld(
    placement,
    objectKinds.get(objectId),
    raw.coordinate_space ?? layoutPolicy.coordinate_space,
    frames,
    coordinateContract,
  );
}

function normalizeContentMount(raw: unknown): ContentMount | null {
  if (!isRecord(raw)) return null;
  const mountId = readString(raw, ['mountId', 'mount_id', 'id']);
  const objectId = readString(raw, ['objectId', 'object_id']);
  const targetId = readString(raw, ['targetId', 'target_id']);
  const targetKind = readString(raw, ['targetKind', 'target_kind']);
  if (!mountId || !objectId || !targetId || !targetKind) return null;
  return {
    mountId,
    objectId,
    targetKind: targetKind as CanvasMountTargetKind,
    targetId,
    projectionMode: readString(raw, ['projectionMode', 'projection_mode'], 'owned') as CanvasProjectionMode,
    syncPolicy: readString(raw, ['syncPolicy', 'sync_policy'], 'manual') as CanvasSyncPolicy,
  };
}

function normalizeVisualConnector(raw: unknown): VisualConnector | null {
  if (!isRecord(raw)) return null;
  const objectId = readString(raw, ['objectId', 'object_id']);
  if (!objectId) return null;
  const connectorId = readString(raw, ['connectorId', 'connector_id'], objectId);
  const startKind = readString(raw, ['startKind', 'start_kind'], 'point') as VisualConnector['startKind'];
  const endKind = readString(raw, ['endKind', 'end_kind'], 'point') as VisualConnector['endKind'];
  const startX = readOptionalNumber(raw, ['startX', 'start_x']);
  const startY = readOptionalNumber(raw, ['startY', 'start_y']);
  const endX = readOptionalNumber(raw, ['endX', 'end_x']);
  const endY = readOptionalNumber(raw, ['endY', 'end_y']);
  const relationKind = readString(raw, ['relationKind', 'relation_kind'], 'visual_only');
  if (relationKind !== 'visual_only') return null;

  return {
    connectorId,
    objectId,
    canvasId: readString(raw, ['canvasId', 'canvas_id'], 'primary-note-canvas'),
    startKind,
    endKind,
    start: {
      x: startX ?? 0,
      y: startY ?? 0,
    },
    end: {
      x: endX ?? 0,
      y: endY ?? 0,
    },
    startObjectId: readOptionalString(raw, ['startObjectId', 'start_object_id']),
    endObjectId: readOptionalString(raw, ['endObjectId', 'end_object_id']),
    startAnchor: readOptionalString(raw, ['startAnchor', 'start_anchor']) as VisualConnector['startAnchor'],
    endAnchor: readOptionalString(raw, ['endAnchor', 'end_anchor']) as VisualConnector['endAnchor'],
    lineStyle: readOptionalString(raw, ['lineStyle', 'line_style']) as VisualConnector['lineStyle'],
    stroke: readOptionalString(raw, ['stroke']),
    strokeWidth: readOptionalNumber(raw, ['strokeWidth', 'stroke_width']),
    startMarker: readOptionalString(raw, ['startMarker', 'start_marker']) as VisualConnector['startMarker'],
    endMarker: readOptionalString(raw, ['endMarker', 'end_marker']) as VisualConnector['endMarker'],
    relationKind: 'visual_only',
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
  };
}

function normalizeImageObject(raw: unknown): ImageCanvasObject | null {
  if (!isRecord(raw)) return null;
  const objectId = readString(raw, ['objectId', 'object_id']);
  const assetId = readString(raw, ['assetId', 'asset_id']);
  if (!objectId || !assetId) return null;
  const assetRaw = isRecord(raw.asset) ? raw.asset : {};
  const filename = readString(assetRaw, ['filename'], readString(raw, ['filename'], 'image'));
  const mimeType = readString(assetRaw, ['mimeType', 'mime_type'], readString(raw, ['mimeType', 'mime_type'], 'image/png'));
  const fit = readString(raw, ['fit'], 'contain');
  return {
    imageObjectId: readString(raw, ['imageObjectId', 'image_object_id'], objectId),
    objectId,
    canvasId: readString(raw, ['canvasId', 'canvas_id'], 'primary-note-canvas'),
    assetId,
    fit: fit === 'cover' ? 'cover' : 'contain',
    caption: readOptionalString(raw, ['caption']),
    altText: readOptionalString(raw, ['altText', 'alt_text']),
    naturalWidth: readOptionalNumber(raw, ['naturalWidth', 'natural_width']),
    naturalHeight: readOptionalNumber(raw, ['naturalHeight', 'natural_height']),
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
    asset: {
      assetId,
      kind: 'image',
      filename,
      mimeType,
      byteSize: readNumber(assetRaw, ['byteSize', 'byte_size'], readNumber(raw, ['byteSize', 'byte_size'])),
      width: readOptionalNumber(assetRaw, ['width']),
      height: readOptionalNumber(assetRaw, ['height']),
      sha256: readOptionalString(assetRaw, ['sha256']),
      blobUrl: readString(assetRaw, ['blobUrl', 'blob_url'], `/api/canvas-assets/${assetId}/blob`),
      metadata: isRecord(assetRaw.metadata) ? assetRaw.metadata : {},
    },
  };
}

function normalizeTableRows(rawRows: unknown): TableRowModel[] {
  if (!Array.isArray(rawRows)) return [];
  return rawRows
    .filter(isRecord)
    .map((row, index) => ({
      rowId: readString(row, ['rowId', 'row_id'], `row-${index}`),
      index: readNumber(row, ['index'], index),
      height: readOptionalNumber(row, ['height']),
    }))
    .sort((a, b) => a.index - b.index);
}

function normalizeTableColumns(rawColumns: unknown): TableColumnModel[] {
  if (!Array.isArray(rawColumns)) return [];
  return rawColumns
    .filter(isRecord)
    .map((column, index) => ({
      columnId: readString(column, ['columnId', 'column_id'], `column-${index}`),
      index: readNumber(column, ['index'], index),
      width: readOptionalNumber(column, ['width']),
      label: readOptionalString(column, ['label']),
    }))
    .sort((a, b) => a.index - b.index);
}

function normalizeTableCells(rawCells: unknown): TableCellModel[] {
  if (!Array.isArray(rawCells)) return [];
  return rawCells
    .filter(isRecord)
    .map((cell, index) => ({
      cellId: readString(cell, ['cellId', 'cell_id'], `cell-${index}`),
      rowId: readString(cell, ['rowId', 'row_id']),
      columnId: readString(cell, ['columnId', 'column_id']),
      rowIndex: readNumber(cell, ['rowIndex', 'row_index']),
      columnIndex: readNumber(cell, ['columnIndex', 'column_index']),
      text: typeof cell.text === 'string' ? cell.text : '',
      valueType: 'text' as const,
    }))
    .sort((a, b) => (a.rowIndex - b.rowIndex) || (a.columnIndex - b.columnIndex));
}

function normalizeTablePayload(rawPayload: unknown): TableStructuredPayload {
  const payload = isRecord(rawPayload) ? rawPayload : {};
  return {
    version: 'table.v1',
    rows: normalizeTableRows(payload.rows),
    columns: normalizeTableColumns(payload.columns),
    cells: normalizeTableCells(payload.cells),
  };
}

function normalizeStructuredObject(raw: unknown): StructuredCanvasObject | null {
  if (!isRecord(raw)) return null;
  const objectId = readString(raw, ['objectId', 'object_id']);
  if (!objectId) return null;
  const structuredKind = readString(raw, ['structuredKind', 'structured_kind'], 'table');
  const schemaVersion = readString(raw, ['schemaVersion', 'schema_version'], 'table.v1');
  if (structuredKind !== 'table' || schemaVersion !== 'table.v1') return null;
  const payload = normalizeTablePayload(raw.payload);
  return {
    objectId,
    canvasId: readString(raw, ['canvasId', 'canvas_id'], 'primary-note-canvas'),
    structuredKind: 'table',
    schemaVersion: 'table.v1',
    rowCount: readNumber(raw, ['rowCount', 'row_count'], payload.rows.length),
    columnCount: readNumber(raw, ['columnCount', 'column_count'], payload.columns.length),
    payload,
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
  };
}

export function normalizeCanvasPersistencePayload(
  raw: unknown,
  coordinateContract: CoordinateContract = 'v1',
  pageFrames: PageFrameModel[] = [],
): NoteCanvasPersistencePayload {
  const payload = isRecord(raw) ? raw : {};
  const pageFrameCollection = payload.pageFrameCollection
    ? normalizePageFrameCollection(payload.pageFrameCollection as PageFrameCollectionModel)
    : null;
  const canvasObjects = Array.isArray(payload.canvasObjects)
    ? payload.canvasObjects.map(normalizeCanvasObject).filter((object): object is CanvasObject => Boolean(object))
    : [];
  const objectKinds = new Map(canvasObjects.map((object) => [object.objectId, object.kind]));
  const blockLayouts = Array.isArray(payload.blockLayouts)
    ? payload.blockLayouts.filter((layout): layout is CanvasBlockLayoutRecord => (
      Boolean(layout)
      && typeof layout.placement_id === 'string'
      && typeof layout.block_id === 'string'
      && Boolean(layout.layout)
      && typeof layout.layout === 'object'
    ))
    : [];
  return {
    canvasObjects,
    canvasPlacements: Array.isArray(payload.canvasPlacements)
      ? payload.canvasPlacements.map((placement) => normalizeCanvasPlacement(
        placement, objectKinds, pageFrameCollection?.pageFrames || pageFrames, coordinateContract,
      )).filter((placement): placement is CanvasPlacement => Boolean(placement))
      : [],
    contentMounts: Array.isArray(payload.contentMounts)
      ? payload.contentMounts.map(normalizeContentMount).filter((mount): mount is ContentMount => Boolean(mount))
      : [],
    visualConnectors: Array.isArray(payload.visualConnectors)
      ? payload.visualConnectors.map(normalizeVisualConnector).filter((connector): connector is VisualConnector => Boolean(connector))
      : [],
    imageObjects: Array.isArray(payload.imageObjects)
      ? payload.imageObjects.map(normalizeImageObject).filter((image): image is ImageCanvasObject => Boolean(image))
      : [],
    structuredObjects: Array.isArray(payload.structuredObjects)
      ? payload.structuredObjects
        .map(normalizeStructuredObject)
        .filter((structured): structured is StructuredCanvasObject => Boolean(structured))
      : [],
    pageFrameCollection,
    blockLayouts,
  };
}
