import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from './runtimeLayout';
import {
  buildRuntimeBlockPlacement,
  normalizeBlockLayout,
  writeLayoutOverride,
} from './placementService';
import {
  createTextBlockContentV1,
  TEXT_FLOW_CONTENT_KEY,
} from './textFlowService';
import type {
  BlockPlacementModel,
  CanvasObject,
  ContentMount,
  PageFrameModel,
  VisualStyle,
} from './types';

export interface BlockProjectionVisualStyleInput {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface CreateParagraphBlockProjectionInput {
  blockId: string;
  canvasId: string;
  text?: string;
  layout: BlockBoxLayout;
  pageFrame: PageFrameModel | null;
  pageOffsetX: number;
  zIndex: number;
  orderIndex?: number;
  style?: BlockProjectionVisualStyleInput;
}

export interface ParagraphBlockProjection {
  block: NoteBlock;
  canvasObject: CanvasObject;
  placement: BlockPlacementModel;
  contentMount: ContentMount;
  visualStyle: VisualStyle | null;
}

export interface MoveBlockProjectionPlacementInput {
  placement: BlockPlacementModel;
  x: number;
  y: number;
}

export interface ResizeBlockProjectionPlacementInput {
  placement: BlockPlacementModel;
  width: number;
  height: number;
}

export interface RestoreBlockProjectionLayoutInput<TBlock extends {
  id: string;
  display_overrides_json?: Record<string, unknown> | null;
}> {
  block: TBlock;
  fallback: BlockBoxLayout;
  contentWidth: number;
  surfaceMode: SurfaceMode;
  estimateHeight: (block: TBlock, width: number) => number;
}

function createProjectionBlock({
  blockId,
  text,
  orderIndex,
  layout,
}: {
  blockId: string;
  text: string;
  orderIndex: number;
  layout: BlockBoxLayout;
}): NoteBlock {
  const seedBlock: NoteBlock = {
    id: blockId,
    placement_id: `placement-${blockId}`,
    display_overrides_json: {},
    block_type: 'paragraph',
    title: null,
    content_json: {
      [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text, 'paragraph', {
        projection_source: 'canvas_block_projection',
      }),
    },
    plain_text: text,
    metadata: {
      projection_kind: 'paragraph_block_projection',
    },
    order_index: orderIndex,
    source_references: [],
  };

  return {
    ...seedBlock,
    display_overrides_json: writeLayoutOverride(seedBlock, layout),
  };
}

function createProjectionCanvasObject(placement: BlockPlacementModel): CanvasObject {
  return {
    objectId: placement.objectId,
    canvasId: placement.canvasId,
    kind: 'paragraph_block_projection',
    backing: 'note_block',
    objectClass: 'block_backed',
    status: 'active',
    source: 'runtime_seed',
  };
}

function createProjectionContentMount(placement: BlockPlacementModel): ContentMount {
  return {
    mountId: `${placement.objectId}:mount:note-block`,
    objectId: placement.objectId,
    targetKind: 'note_block',
    targetId: placement.blockId,
    projectionMode: 'owned',
    syncPolicy: 'manual',
  };
}

function createProjectionVisualStyle(
  objectId: string,
  style?: BlockProjectionVisualStyleInput,
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

export function createParagraphBlockProjection({
  blockId,
  canvasId,
  text = '',
  layout,
  pageFrame,
  pageOffsetX,
  zIndex,
  orderIndex = 0,
  style,
}: CreateParagraphBlockProjectionInput): ParagraphBlockProjection {
  const block = createProjectionBlock({
    blockId,
    text,
    orderIndex,
    layout,
  });
  const placement = buildRuntimeBlockPlacement({
    block,
    canvasId,
    layout,
    pageOffsetX,
    pageFrame,
    zIndex,
  });
  const canvasObject = createProjectionCanvasObject(placement);
  const contentMount = createProjectionContentMount(placement);
  const visualStyle = createProjectionVisualStyle(canvasObject.objectId, style);

  return {
    block,
    canvasObject,
    placement,
    contentMount,
    visualStyle,
  };
}

export function moveBlockProjectionPlacement({
  placement,
  x,
  y,
}: MoveBlockProjectionPlacementInput): BlockPlacementModel {
  return {
    ...placement,
    x,
    y,
  };
}

export function resizeBlockProjectionPlacement({
  placement,
  width,
  height,
}: ResizeBlockProjectionPlacementInput): BlockPlacementModel {
  return {
    ...placement,
    width,
    height,
  };
}

export function restoreBlockProjectionLayout<TBlock extends {
  id: string;
  display_overrides_json?: Record<string, unknown> | null;
}>({
  block,
  fallback,
  contentWidth,
  surfaceMode,
  estimateHeight,
}: RestoreBlockProjectionLayoutInput<TBlock>): BlockBoxLayout {
  return normalizeBlockLayout({
    block,
    fallback,
    contentWidth,
    surfaceMode,
    estimateHeight,
  });
}
