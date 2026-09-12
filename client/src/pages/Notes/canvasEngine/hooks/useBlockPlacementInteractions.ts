import { applyWorldRectToLayout, resolveWorldRect, selectPlacementFrame, type CoordinateContract } from '../placementContractService';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import {
  attachWindowPointerSession,
  calculateDraggedBlockLayouts,
  calculateResizedBlockLayouts,
  draggingBlockInteraction,
  resizingBlockInteraction,
  selectedBlockInteraction,
  type RuntimeInteractionState,
} from '../interactionController';
import { clampCrossingPlacementIntoPageFrameContent } from '../pageFrameAffiliationService';
import {
  shouldResolvePageCollisions,
  shouldUseElasticAvoidance,
  type SurfaceModePolicy,
} from '../modePolicyService';
import {
  LAYOUT_MEASURE_SUPPRESSION_MS,
  type BlockBoxLayout,
  type SnapGuide,
} from '../runtimeLayout';
import type { CanvasViewport, DocumentTypographyProfile, PageFrameModel } from '../types';

interface PlacementInteractionBlock {
  id: string;
}

export interface UseBlockPlacementInteractionsOptions<TBlock extends PlacementInteractionBlock> {
  noteId?: string;
  coordinateContract?: CoordinateContract;
  blockLayouts: Record<string, BlockBoxLayout>;
  contentWidth: number;
  documentTypographyProfile?: DocumentTypographyProfile;
  estimateBlockHeightForText: (block: TBlock, text: string, width: number, typography?: DocumentTypographyProfile) => number;
  movingBlockIdRef: MutableRefObject<string | null>;
  orderedBlocks: TBlock[];
  pageFrames: PageFrameModel[];
  pageOffsetX: number;
  persistChangedBlockLayouts: (layouts: Record<string, BlockBoxLayout>) => void;
  pushLayoutHistory: (
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => void;
  beginTemporaryLayoutMode: () => void;
  clearTemporaryLayoutMode: () => void;
  setInteractionState: (state: RuntimeInteractionState) => void;
  setLayoutDrafts: Dispatch<SetStateAction<Record<string, BlockBoxLayout>>>;
  setSelectedBlockId: (blockId: string) => void;
  setSnapGuide: (guide: SnapGuide | null) => void;
  snapEnabled: boolean;
  suppressMeasuredReflowUntilRef: MutableRefObject<number>;
  surfacePolicy: SurfaceModePolicy;
  viewportTransform: CanvasViewport;
  trayDropTargetRef?: RefObject<HTMLElement>;
  onMoveBlockToTray?: (blockId: string, before: BlockBoxLayout) => void;
}

function collectCrossingBlockOnRelease({
  blockId,
  layouts,
  organizeModeEnabled,
  pageFrames,
  pageOffsetX,
  coordinateContract,
}: {
  blockId: string;
  layouts: Record<string, BlockBoxLayout>;
  organizeModeEnabled: boolean;
  pageFrames: PageFrameModel[];
  pageOffsetX: number;
  coordinateContract?: CoordinateContract;
}): Record<string, BlockBoxLayout> {
  if (!organizeModeEnabled) return layouts;
  const layout = layouts[blockId];
  if (!layout) return layouts;

  const frame = selectPlacementFrame(layout, pageFrames, coordinateContract);
  // Unplaced paper coordinates and unresolved explicit IDs have no frame authority.
  // Preserve their presentation until save-time affiliation; later releases collect normally.
  if (coordinateContract === 'v2' && !frame
    && (layout.frame_id || layout.coordinate_space !== 'canvas_world')) return layouts;
  const worldRect = resolveWorldRect(layout, frame, coordinateContract, pageOffsetX);
  const collected = clampCrossingPlacementIntoPageFrameContent({
    placement: worldRect,
    pageFrames,
  });
  const nextLayout = applyWorldRectToLayout(layout, worldRect, collected, coordinateContract, () => {
    const worldOffsetX = layout.coordinate_space === 'canvas_world' ? 0 : pageOffsetX;
    return { ...layout, x: collected.x - worldOffsetX, y: collected.y };
  });
  if (nextLayout.x === layout.x && nextLayout.y === layout.y) return layouts;

  return {
    ...layouts,
    [blockId]: nextLayout,
  };
}

export function useBlockPlacementInteractions<TBlock extends PlacementInteractionBlock>({
  noteId,
  blockLayouts,
  coordinateContract,
  contentWidth,
  documentTypographyProfile,
  estimateBlockHeightForText,
  movingBlockIdRef,
  orderedBlocks,
  pageFrames,
  pageOffsetX,
  persistChangedBlockLayouts,
  pushLayoutHistory,
  beginTemporaryLayoutMode,
  clearTemporaryLayoutMode,
  setInteractionState,
  setLayoutDrafts,
  setSelectedBlockId,
  setSnapGuide,
  snapEnabled,
  suppressMeasuredReflowUntilRef,
  surfacePolicy,
  viewportTransform,
  trayDropTargetRef,
  onMoveBlockToTray,
}: UseBlockPlacementInteractionsOptions<TBlock>) {
  const pointerSessionCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => {
    pointerSessionCleanup.current?.();
    movingBlockIdRef.current = null;
  }, [movingBlockIdRef, noteId]);
  const orderedBlockIds = useMemo(
    () => orderedBlocks.map((item) => item.id),
    [orderedBlocks],
  );

  const beginMoveBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: TBlock,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setInteractionState(draggingBlockInteraction(block.id));
    beginTemporaryLayoutMode();
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startLayouts = { ...blockLayouts, [block.id]: layout };
    let latestLayouts: Record<string, BlockBoxLayout> = startLayouts;
    movingBlockIdRef.current = block.id;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const zoom = viewportTransform.zoom;
      const deltaX = (moveEvent.clientX - startClientX) / zoom;
      const deltaY = (moveEvent.clientY - startClientY) / zoom;
      const result = calculateDraggedBlockLayouts({
        coordinateContract,
        blockId: block.id,
        startLayouts,
        initialLayout: layout,
        deltaX,
        deltaY,
        contentWidth,
        dragBoundsWidth: contentWidth,
        snapEnabled,
        orderedBlockIds,
        resolveCollisions: shouldResolvePageCollisions(surfacePolicy) || snapEnabled,
        useElasticAvoidance: shouldUseElasticAvoidance({
          policy: surfacePolicy,
          snapEnabled,
          deltaY,
        }),
      });
      latestLayouts = result.layouts;
      setSnapGuide(result.guide);
      setLayoutDrafts(latestLayouts);
    };

    const restoreBeforeDrag = () => {
      suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
      movingBlockIdRef.current = null;
      setSnapGuide(null);
      clearTemporaryLayoutMode();
      setInteractionState(selectedBlockInteraction(block.id));
      // Collision avoidance is only a preview. Restore every pushed neighbour too.
      setLayoutDrafts(startLayouts);
    };

    pointerSessionCleanup.current?.();
    pointerSessionCleanup.current = attachWindowPointerSession({
      pointerId: event.pointerId,
      onMove: handlePointerMove,
      onCancel: restoreBeforeDrag,
      onEnd: (endEvent) => {
        const target = trayDropTargetRef?.current;
        const rect = target?.getBoundingClientRect();
        if (onMoveBlockToTray && target?.isConnected && rect && rect.width > 0 && rect.height > 0
          && endEvent.clientX >= rect.left && endEvent.clientX <= rect.right
          && endEvent.clientY >= rect.top && endEvent.clientY <= rect.bottom) {
          restoreBeforeDrag();
          onMoveBlockToTray(block.id, startLayouts[block.id]);
          return;
        }
        const releasedLayouts = collectCrossingBlockOnRelease({
          coordinateContract,
          blockId: block.id,
          layouts: latestLayouts,
          organizeModeEnabled: snapEnabled,
          pageFrames,
          pageOffsetX,
        });
        latestLayouts = releasedLayouts;
        suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
        movingBlockIdRef.current = null;
        setSnapGuide(null);
        clearTemporaryLayoutMode();
        setInteractionState(selectedBlockInteraction(block.id));
        setLayoutDrafts(releasedLayouts);
        pushLayoutHistory(startLayouts, releasedLayouts);
        persistChangedBlockLayouts(releasedLayouts);
      },
    });
  }, [
    blockLayouts,
    coordinateContract,
    contentWidth,
    movingBlockIdRef,
    orderedBlockIds,
    pageFrames,
    pageOffsetX,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    beginTemporaryLayoutMode,
    clearTemporaryLayoutMode,
    setInteractionState,
    setLayoutDrafts,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
    viewportTransform,
    trayDropTargetRef,
    onMoveBlockToTray,
  ]);

  const beginResizeBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: TBlock,
    text: string,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setInteractionState(resizingBlockInteraction(block.id));
    beginTemporaryLayoutMode();
    const startClientX = event.clientX;
    let latestLayouts: Record<string, BlockBoxLayout> = blockLayouts;
    const startLayouts = { ...blockLayouts };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const zoom = viewportTransform.zoom;
      const deltaX = (moveEvent.clientX - startClientX) / zoom;
      setLayoutDrafts((current) => {
        const result = calculateResizedBlockLayouts({
          coordinateContract,
            blockId: block.id,
          baseLayouts: blockLayouts,
          currentLayouts: current,
          initialLayout: layout,
          deltaX,
          contentWidth,
          snapEnabled,
          orderedBlockIds,
          resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
          estimateHeight: (width) => estimateBlockHeightForText(block, text, width, documentTypographyProfile),
        });
        latestLayouts = result.layouts;
        setSnapGuide(result.guide);
        return latestLayouts;
      });
    };

    pointerSessionCleanup.current?.();
    pointerSessionCleanup.current = attachWindowPointerSession({
      pointerId: event.pointerId,
      onMove: handlePointerMove,
      onCancel: () => {
        setSnapGuide(null);
        clearTemporaryLayoutMode();
        setInteractionState(selectedBlockInteraction(block.id));
        setLayoutDrafts(startLayouts);
      },
      onEnd: () => {
        const releasedLayouts = collectCrossingBlockOnRelease({
          coordinateContract,
          blockId: block.id,
          layouts: latestLayouts,
          organizeModeEnabled: snapEnabled,
          pageFrames,
          pageOffsetX,
        });
        latestLayouts = releasedLayouts;
        setSnapGuide(null);
        clearTemporaryLayoutMode();
        setInteractionState(selectedBlockInteraction(block.id));
        setLayoutDrafts(releasedLayouts);
        pushLayoutHistory(startLayouts, releasedLayouts);
        persistChangedBlockLayouts(releasedLayouts);
      },
    });
  }, [
    blockLayouts,
    coordinateContract,
    contentWidth,
    documentTypographyProfile,
    estimateBlockHeightForText,
    orderedBlockIds,
    pageFrames,
    pageOffsetX,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    beginTemporaryLayoutMode,
    clearTemporaryLayoutMode,
    setInteractionState,
    setLayoutDrafts,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    surfacePolicy,
    viewportTransform,
  ]);

  return {
    beginMoveBlock,
    beginResizeBlock,
  };
}
