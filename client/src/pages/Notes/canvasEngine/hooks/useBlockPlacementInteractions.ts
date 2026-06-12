import {
  useCallback,
  useMemo,
  type Dispatch,
  type MutableRefObject,
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

interface PlacementInteractionBlock {
  id: string;
}

export interface UseBlockPlacementInteractionsOptions<TBlock extends PlacementInteractionBlock> {
  blockLayouts: Record<string, BlockBoxLayout>;
  contentWidth: number;
  estimateBlockHeightForText: (block: TBlock, text: string, width: number) => number;
  movingBlockIdRef: MutableRefObject<string | null>;
  orderedBlocks: TBlock[];
  persistChangedBlockLayouts: (layouts: Record<string, BlockBoxLayout>) => void;
  pushLayoutHistory: (
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => void;
  setInteractionState: (state: RuntimeInteractionState) => void;
  setLayoutDrafts: Dispatch<SetStateAction<Record<string, BlockBoxLayout>>>;
  setLayoutMode: (value: boolean) => void;
  setSelectedBlockId: (blockId: string) => void;
  setSnapGuide: (guide: SnapGuide | null) => void;
  snapEnabled: boolean;
  suppressMeasuredReflowUntilRef: MutableRefObject<number>;
  surfacePolicy: SurfaceModePolicy;
}

export function useBlockPlacementInteractions<TBlock extends PlacementInteractionBlock>({
  blockLayouts,
  contentWidth,
  estimateBlockHeightForText,
  movingBlockIdRef,
  orderedBlocks,
  persistChangedBlockLayouts,
  pushLayoutHistory,
  setInteractionState,
  setLayoutDrafts,
  setLayoutMode,
  setSelectedBlockId,
  setSnapGuide,
  snapEnabled,
  suppressMeasuredReflowUntilRef,
  surfacePolicy,
}: UseBlockPlacementInteractionsOptions<TBlock>) {
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
    setLayoutMode(true);
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startLayouts = { ...blockLayouts };
    let latestLayouts: Record<string, BlockBoxLayout> = startLayouts;
    movingBlockIdRef.current = block.id;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLayoutDrafts(() => {
        const deltaX = moveEvent.clientX - startClientX;
        const deltaY = moveEvent.clientY - startClientY;
        const result = calculateDraggedBlockLayouts({
          blockId: block.id,
          startLayouts,
          initialLayout: layout,
          deltaX,
          deltaY,
          contentWidth,
          snapEnabled,
          orderedBlockIds,
          useElasticAvoidance: shouldUseElasticAvoidance({
            policy: surfacePolicy,
            snapEnabled,
            deltaY,
          }),
        });
        latestLayouts = result.layouts;
        setSnapGuide(result.guide);
        return latestLayouts;
      });
    };

    attachWindowPointerSession({
      onMove: handlePointerMove,
      onEnd: () => {
        suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
        movingBlockIdRef.current = null;
        setSnapGuide(null);
        setInteractionState(selectedBlockInteraction(block.id));
        pushLayoutHistory(startLayouts, latestLayouts);
        persistChangedBlockLayouts(latestLayouts);
      },
    });
  }, [
    blockLayouts,
    contentWidth,
    movingBlockIdRef,
    orderedBlockIds,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    setInteractionState,
    setLayoutDrafts,
    setLayoutMode,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
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
    setLayoutMode(true);
    const startClientX = event.clientX;
    let latestLayouts: Record<string, BlockBoxLayout> = blockLayouts;
    const startLayouts = { ...blockLayouts };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      setLayoutDrafts((current) => {
        const result = calculateResizedBlockLayouts({
          blockId: block.id,
          baseLayouts: blockLayouts,
          currentLayouts: current,
          initialLayout: layout,
          deltaX,
          contentWidth,
          snapEnabled,
          orderedBlockIds,
          resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
          estimateHeight: (width) => estimateBlockHeightForText(block, text, width),
        });
        latestLayouts = result.layouts;
        setSnapGuide(result.guide);
        return latestLayouts;
      });
    };

    attachWindowPointerSession({
      onMove: handlePointerMove,
      onEnd: () => {
        setSnapGuide(null);
        setInteractionState(selectedBlockInteraction(block.id));
        pushLayoutHistory(startLayouts, latestLayouts);
        persistChangedBlockLayouts(latestLayouts);
      },
    });
  }, [
    blockLayouts,
    contentWidth,
    estimateBlockHeightForText,
    orderedBlockIds,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    setInteractionState,
    setLayoutDrafts,
    setLayoutMode,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    surfacePolicy,
  ]);

  return {
    beginMoveBlock,
    beginResizeBlock,
  };
}
