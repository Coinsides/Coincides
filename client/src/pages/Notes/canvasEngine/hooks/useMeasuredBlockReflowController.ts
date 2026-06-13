import { useCallback, type MutableRefObject } from 'react';
import { presentationKindForBlock } from '../blockContentService';
import {
  shouldResolvePageCollisions,
  type SurfaceModePolicy,
} from '../modePolicyService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';

export interface ApplyMeasuredBlockHeightDraft {
  (options: {
    baseLayouts: Record<string, BlockBoxLayout>;
    blockId: string;
    fallbackLayout: BlockBoxLayout;
    measuredHeight: number;
    orderedBlockIds: string[];
    resolveCollisions: boolean;
  }): void;
}

export interface UseMeasuredBlockReflowControllerOptions {
  applyMeasuredBlockHeightDraft: ApplyMeasuredBlockHeightDraft;
  blockLayouts: Record<string, BlockBoxLayout>;
  movingBlockIdRef: MutableRefObject<string | null>;
  orderedBlocks: NoteBlock[];
  suppressMeasuredReflowUntilRef: MutableRefObject<number>;
  surfacePolicy: SurfaceModePolicy;
}

export function useMeasuredBlockReflowController({
  applyMeasuredBlockHeightDraft,
  blockLayouts,
  movingBlockIdRef,
  orderedBlocks,
  suppressMeasuredReflowUntilRef,
  surfacePolicy,
}: UseMeasuredBlockReflowControllerOptions) {
  const handleMeasuredBlockHeight = useCallback((
    block: NoteBlock,
    layout: BlockBoxLayout,
    isActive: boolean,
    measuredHeight: number,
  ) => {
    const allowActiveFormulaReflow = isActive && presentationKindForBlock(block) === 'formula';
    if (movingBlockIdRef.current) return;
    if (!allowActiveFormulaReflow && Date.now() < suppressMeasuredReflowUntilRef.current) return;
    applyMeasuredBlockHeightDraft({
      baseLayouts: blockLayouts,
      blockId: block.id,
      fallbackLayout: layout,
      measuredHeight,
      orderedBlockIds: orderedBlocks.map((item) => item.id),
      resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
    });
  }, [
    applyMeasuredBlockHeightDraft,
    blockLayouts,
    movingBlockIdRef,
    orderedBlocks,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
  ]);

  return {
    handleMeasuredBlockHeight,
  };
}
