import { sameLayoutFrame, type CoordinateContract } from './placementContractService';
import { clamp } from './geometry';
import { applyMeasuredBlockLayoutToLayouts } from './measurementService';
import {
  applyMoveSnap,
  resolveStackedLayoutCollisions,
  snapToTargets,
} from './placementService';
import {
  MIN_BLOCK_WIDTH,
  type BlockBoxLayout,
  type SnapGuide,
} from './runtimeLayout';
import type { TextFocusReceipt } from './textFocusReceipt';

export type RuntimeInteractionMode =
  | 'idle'
  | 'hoveringBlock'
  | 'selectedBlock'
  | 'editingText'
  | 'draggingBlock'
  | 'resizingBlock'
  | 'panningCanvas'
  | 'openingMenu'
  | 'previewing';

export type RuntimeInteractionTarget = 'block' | 'draft' | 'surface' | 'noteChrome' | 'preview';

export interface RuntimeInteractionState {
  mode: RuntimeInteractionMode;
  target: RuntimeInteractionTarget;
  blockId?: string;
  textFlowId?: string;
  textUnitId?: string;
  panel?: 'slashMenu' | 'preview' | 'layout' | 'appearance' | 'moreActions' | 'blockTrash' | 'insert' | 'viewOptions';
}

export function idleInteraction(): RuntimeInteractionState {
  return { mode: 'idle', target: 'surface' };
}

export function hoveringBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'hoveringBlock', target: 'block', blockId };
}

export function selectedBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'selectedBlock', target: 'block', blockId };
}

export function editingTextInteraction(
  receipt: TextFocusReceipt,
  target: Extract<RuntimeInteractionTarget, 'block' | 'draft'>,
): RuntimeInteractionState {
  return {
    mode: 'editingText',
    target,
    blockId: receipt.blockId,
    textFlowId: receipt.textFlowId,
    textUnitId: receipt.textUnitId,
  };
}

export function draggingBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'draggingBlock', target: 'block', blockId };
}

export function resizingBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'resizingBlock', target: 'block', blockId };
}

export function panningCanvasInteraction(): RuntimeInteractionState {
  return { mode: 'panningCanvas', target: 'surface' };
}

export function openingMenuInteraction(
  panel: NonNullable<RuntimeInteractionState['panel']>,
  blockId?: string,
  receipt?: TextFocusReceipt | null,
  target?: RuntimeInteractionTarget,
): RuntimeInteractionState {
  return {
    mode: 'openingMenu',
    target: target || (blockId ? 'block' : 'noteChrome'),
    blockId: blockId || receipt?.blockId,
    textFlowId: receipt?.textFlowId,
    textUnitId: receipt?.textUnitId,
    panel,
  };
}

export function previewingInteraction(): RuntimeInteractionState {
  return { mode: 'previewing', target: 'preview', panel: 'preview' };
}

export function getInteractionBlockId(state: RuntimeInteractionState): string | null {
  return state.blockId || null;
}

export interface WindowPointerSessionOptions {
  onMove: (event: PointerEvent) => void;
  onEnd: (event: PointerEvent) => void;
  onCancel?: (event: PointerEvent) => void;
  pointerId?: number;
  target?: Window;
}

export function attachWindowPointerSession({
  onMove,
  onEnd,
  onCancel,
  pointerId,
  target = window,
}: WindowPointerSessionOptions): () => void {
  const matchesPointer = (event: PointerEvent) => pointerId === undefined || event.pointerId === pointerId;
  const handlePointerMove = (event: PointerEvent) => { if (matchesPointer(event)) onMove(event); };
  const cleanup = () => {
    target.removeEventListener('pointermove', handlePointerMove);
    target.removeEventListener('pointerup', handlePointerUp);
    target.removeEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!matchesPointer(event)) return;
    cleanup();
    onEnd(event);
  };
  const handlePointerCancel = (event: PointerEvent) => {
    if (!matchesPointer(event)) return;
    cleanup();
    onCancel?.(event);
  };

  target.addEventListener('pointermove', handlePointerMove);
  target.addEventListener('pointerup', handlePointerUp);
  target.addEventListener('pointercancel', handlePointerCancel);
  return cleanup;
}

export interface CalculateDraggedBlockLayoutsInput {
  coordinateContract?: CoordinateContract;
  blockId: string;
  startLayouts: Record<string, BlockBoxLayout>;
  initialLayout: BlockBoxLayout;
  deltaX: number;
  deltaY: number;
  contentWidth: number;
  dragBoundsWidth?: number;
  snapEnabled: boolean;
  orderedBlockIds: string[];
  resolveCollisions: boolean;
  useElasticAvoidance: boolean;
}

export interface DraggedBlockLayoutResult {
  layouts: Record<string, BlockBoxLayout>;
  guide: SnapGuide | null;
}

export function calculateDraggedBlockLayouts({
  blockId,
  startLayouts,
  initialLayout,
  deltaX,
  deltaY,
  contentWidth,
  dragBoundsWidth,
  snapEnabled,
  orderedBlockIds,
  resolveCollisions,
  coordinateContract,
  useElasticAvoidance,
}: CalculateDraggedBlockLayoutsInput): DraggedBlockLayoutResult {
  const currentLayout = startLayouts[blockId] || initialLayout;
  const maxDragWidth = dragBoundsWidth || contentWidth;
  const rawLayout = {
    ...currentLayout,
    x: clamp(currentLayout.x + deltaX, 0, Math.max(0, maxDragWidth - currentLayout.width)),
    y: Math.max(0, currentLayout.y + deltaY),
  };
  const snapped = snapEnabled
    ? applyMoveSnap(rawLayout, blockId, startLayouts, contentWidth, coordinateContract)
    : { layout: rawLayout, guide: null };
  const candidateLayouts = { ...startLayouts, [blockId]: snapped.layout };
  const layouts = resolveCollisions || useElasticAvoidance
    ? resolveStackedLayoutCollisions(candidateLayouts, orderedBlockIds, coordinateContract)
    : candidateLayouts;

  return {
    layouts,
    guide: snapped.guide,
  };
}

export interface CalculateResizedBlockLayoutsInput {
  coordinateContract?: CoordinateContract;
  blockId: string;
  baseLayouts: Record<string, BlockBoxLayout>;
  currentLayouts: Record<string, BlockBoxLayout>;
  initialLayout: BlockBoxLayout;
  deltaX: number;
  contentWidth: number;
  snapEnabled: boolean;
  orderedBlockIds: string[];
  resolveCollisions: boolean;
  estimateHeight: (width: number) => number;
}

export interface ResizedBlockLayoutResult {
  layout: BlockBoxLayout;
  layouts: Record<string, BlockBoxLayout>;
  guide: SnapGuide | null;
}

export function calculateResizedBlockLayouts({
  blockId,
  baseLayouts,
  currentLayouts,
  initialLayout,
  deltaX,
  contentWidth,
  snapEnabled,
  orderedBlockIds,
  resolveCollisions,
  coordinateContract,
  estimateHeight,
}: CalculateResizedBlockLayoutsInput): ResizedBlockLayoutResult {
  const width = clamp(
    initialLayout.width + deltaX,
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, contentWidth - initialLayout.x),
  );
  const snappedRight: { value: number; snapped?: number } = snapEnabled
    ? snapToTargets(initialLayout.x + width, [
      contentWidth,
      ...Object.entries(baseLayouts)
        .filter(([id, item]) => id !== blockId && sameLayoutFrame(initialLayout, item, coordinateContract))
        .flatMap(([, item]) => [item.x, item.x + item.width]),
    ])
    : { value: initialLayout.x + width };
  const nextWidth = clamp(
    snappedRight.value - initialLayout.x,
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, contentWidth - initialLayout.x),
  );
  const layout = {
    ...initialLayout,
    width: nextWidth,
    height: estimateHeight(nextWidth),
    width_mode: 'manual' as const,
  };

  return {
    layout,
    layouts: applyMeasuredBlockLayoutToLayouts({
      currentLayouts,
      baseLayouts,
      blockId,
      fallbackLayout: initialLayout,
      nextLayout: layout,
      orderedBlockIds,
      resolveCollisions,
      coordinateContract,
    }),
    guide: snappedRight.snapped !== undefined ? { x: snappedRight.snapped } : null,
  };
}
