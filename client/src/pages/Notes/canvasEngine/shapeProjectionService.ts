import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import { writeLayoutOverride } from './placementService';
import {
  createTextBlockContentV1,
  TEXT_FLOW_CONTENT_KEY,
} from './textFlowService';
import type {
  CanvasObject,
  CanvasPlacement,
  CanvasPoint,
  CanvasSurface,
  ContentMount,
  VisualConnector,
  VisualStyle,
} from './types';

export interface ShapeProjectionVisualStyleInput {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface CreatePureShapeProjectionInput {
  objectId: string;
  canvasId: string;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
  style?: ShapeProjectionVisualStyleInput;
}

export interface PureShapeProjection {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  contentMount: null;
  visualStyle: VisualStyle | null;
}

export interface FillShapeWithParagraphBlockInput {
  shape: PureShapeProjection;
  blockId: string;
  text?: string;
  orderIndex?: number;
}

export interface BlockBackedShapeProjection {
  block: NoteBlock;
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  contentMount: ContentMount;
  visualStyle: VisualStyle | null;
}

export interface DemotedShapeProjection extends PureShapeProjection {
  deletedBlockId: string;
  deletedMountId: string;
}

export interface CreateVisualConnectorProjectionInput {
  connectorId: string;
  canvasId: string;
  start: CanvasPoint;
  end: CanvasPoint;
  zIndex: number;
  startObjectId?: string;
  endObjectId?: string;
  style?: ShapeProjectionVisualStyleInput;
}

export interface VisualConnectorProjection {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  visualConnector: VisualConnector;
  contentMount: null;
  visualStyle: VisualStyle | null;
}

function surfaceForLayout(layout: BlockBoxLayout): CanvasSurface {
  return layout.surface === 'tray' ? 'tray' : 'formal_page';
}

function layoutFromPlacement(placement: CanvasPlacement): BlockBoxLayout {
  return {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    rotation: placement.rotation,
    surface: placement.surface,
  };
}

function createVisualStyle(
  objectId: string,
  style?: ShapeProjectionVisualStyleInput,
): VisualStyle | null {
  if (!style) return null;
  return {
    styleId: `${objectId}:visual-style`,
    objectId,
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    borderRadius: style.borderRadius,
    opacity: style.opacity,
  };
}

function createShapeCanvasObject(
  objectId: string,
  canvasId: string,
  backing: CanvasObject['backing'],
  objectClass: CanvasObject['objectClass'],
  metadata?: Record<string, unknown>,
): CanvasObject {
  const canvasObject: CanvasObject = {
    objectId,
    canvasId,
    kind: 'shape',
    backing,
    objectClass,
    status: 'active',
    source: 'runtime_seed',
  };
  if (metadata) canvasObject.metadata = metadata;
  return canvasObject;
}

function createShapePlacement({
  objectId,
  canvasId,
  layout,
  zIndex,
  frameId,
}: {
  objectId: string;
  canvasId: string;
  layout: BlockBoxLayout;
  zIndex: number;
  frameId?: string;
}): CanvasPlacement {
  const surface = surfaceForLayout(layout);
  return {
    placementId: `${objectId}:placement`,
    objectId,
    canvasId,
    frameId: surface === 'formal_page' ? frameId : undefined,
    surface,
    boundaryRole: surface === 'formal_page' ? 'inside' : 'outside',
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: layout.rotation || 0,
    zIndex,
    orderIndex: layout.order_index,
    snapState: surface === 'formal_page' ? 'snapped' : 'free',
    visibilityState: 'normal',
    renderVisibility: 'visible',
  };
}

function createShapeTextBlock({
  blockId,
  text,
  orderIndex,
  placement,
}: {
  blockId: string;
  text: string;
  orderIndex: number;
  placement: CanvasPlacement;
}): NoteBlock {
  const seedBlock: NoteBlock = {
    id: blockId,
    placement_id: `placement-${blockId}`,
    display_overrides_json: {},
    block_type: 'paragraph',
    title: null,
    content_json: {
      [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text, 'paragraph', {
        projection_source: 'block_backed_shape',
        shape_object_id: placement.objectId,
      }),
    },
    plain_text: text,
    metadata: {
      projection_kind: 'block_backed_shape',
      shape_object_id: placement.objectId,
    },
    order_index: orderIndex,
    source_references: [],
  };

  return {
    ...seedBlock,
    display_overrides_json: writeLayoutOverride(seedBlock, layoutFromPlacement(placement)),
  };
}

function createShapeContentMount(objectId: string, blockId: string): ContentMount {
  return {
    mountId: `${objectId}:mount:shape-text`,
    objectId,
    targetKind: 'note_block',
    targetId: blockId,
    projectionMode: 'owned',
    syncPolicy: 'manual',
  };
}

export function createPureShapeProjection({
  objectId,
  canvasId,
  layout,
  zIndex,
  frameId,
  style,
}: CreatePureShapeProjectionInput): PureShapeProjection {
  const canvasObject = createShapeCanvasObject(objectId, canvasId, 'none', 'pure');
  const placement = createShapePlacement({
    objectId,
    canvasId,
    layout,
    zIndex,
    frameId,
  });

  return {
    canvasObject,
    placement,
    contentMount: null,
    visualStyle: createVisualStyle(objectId, style),
  };
}

export function fillShapeWithParagraphBlock({
  shape,
  blockId,
  text = '',
  orderIndex = 0,
}: FillShapeWithParagraphBlockInput): BlockBackedShapeProjection {
  const block = createShapeTextBlock({
    blockId,
    text,
    orderIndex,
    placement: shape.placement,
  });

  return {
    block,
    canvasObject: createShapeCanvasObject(
      shape.canvasObject.objectId,
      shape.canvasObject.canvasId,
      'note_block',
      'block_backed',
      shape.canvasObject.metadata,
    ),
    placement: shape.placement,
    contentMount: createShapeContentMount(shape.canvasObject.objectId, block.id),
    visualStyle: shape.visualStyle,
  };
}

export function clearBlockBackedShapeText(
  shape: BlockBackedShapeProjection,
): DemotedShapeProjection {
  return {
    canvasObject: createShapeCanvasObject(
      shape.canvasObject.objectId,
      shape.canvasObject.canvasId,
      'none',
      'pure',
      shape.canvasObject.metadata,
    ),
    placement: shape.placement,
    contentMount: null,
    visualStyle: shape.visualStyle,
    deletedBlockId: shape.block.id,
    deletedMountId: shape.contentMount.mountId,
  };
}

export function createVisualConnectorProjection({
  connectorId,
  canvasId,
  start,
  end,
  zIndex,
  startObjectId,
  endObjectId,
  style,
}: CreateVisualConnectorProjectionInput): VisualConnectorProjection {
  const objectId = connectorId;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    canvasObject: {
      objectId,
      canvasId,
      kind: 'visual_connector',
      backing: 'none',
      objectClass: 'pure',
      status: 'active',
      source: 'runtime_seed',
    },
    placement: {
      placementId: `${objectId}:placement`,
      objectId,
      canvasId,
      surface: 'canvas_workspace',
      boundaryRole: 'outside',
      x,
      y,
      width,
      height,
      rotation: 0,
      zIndex,
      snapState: 'free',
      visibilityState: 'normal',
      renderVisibility: 'visible',
    },
    visualConnector: {
      connectorId,
      objectId,
      canvasId,
      start,
      end,
      startObjectId,
      endObjectId,
      relationKind: 'visual_only',
      styleId: style ? `${objectId}:visual-style` : undefined,
    },
    contentMount: null,
    visualStyle: createVisualStyle(objectId, style),
  };
}
