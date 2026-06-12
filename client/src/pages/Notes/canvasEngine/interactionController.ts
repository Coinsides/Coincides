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
  panel?: 'slashMenu' | 'preview' | 'noteInfo' | 'moreActions' | 'insert';
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

export function editingTextInteraction(blockId?: string): RuntimeInteractionState {
  return { mode: 'editingText', target: blockId ? 'block' : 'draft', blockId };
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
): RuntimeInteractionState {
  return { mode: 'openingMenu', target: blockId ? 'block' : 'noteChrome', blockId, panel };
}

export function previewingInteraction(): RuntimeInteractionState {
  return { mode: 'previewing', target: 'preview', panel: 'preview' };
}

export function getInteractionBlockId(state: RuntimeInteractionState): string | null {
  return state.blockId || null;
}

export interface CalculateDraggedBlockLayoutsInput {
  blockId: string;
  startLayouts: Record<string, BlockBoxLayout>;
  initialLayout: BlockBoxLayout;
  deltaX: number;
  deltaY: number;
  contentWidth: number;
  snapEnabled: boolean;
  orderedBlockIds: string[];
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
  snapEnabled,
  orderedBlockIds,
  useElasticAvoidance,
}: CalculateDraggedBlockLayoutsInput): DraggedBlockLayoutResult {
  const currentLayout = startLayouts[blockId] || initialLayout;
  const rawLayout = {
    ...currentLayout,
    x: clamp(currentLayout.x + deltaX, 0, Math.max(0, contentWidth - currentLayout.width)),
    y: Math.max(0, currentLayout.y + deltaY),
  };
  const snapped = snapEnabled
    ? applyMoveSnap(rawLayout, blockId, startLayouts, contentWidth)
    : { layout: rawLayout, guide: null };
  const candidateLayouts = { ...startLayouts, [blockId]: snapped.layout };
  const layouts = useElasticAvoidance
    ? resolveStackedLayoutCollisions(candidateLayouts, orderedBlockIds)
    : candidateLayouts;

  return {
    layouts,
    guide: snapped.guide,
  };
}

export interface CalculateResizedBlockLayoutsInput {
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
        .filter(([id]) => id !== blockId)
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
    }),
    guide: snappedRight.snapped !== undefined ? { x: snappedRight.snapped } : null,
  };
}
