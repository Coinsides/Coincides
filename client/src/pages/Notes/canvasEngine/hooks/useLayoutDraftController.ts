import type { CoordinateContract } from '../placementContractService';
import {
  useCallback,
  useState,
} from 'react';
import { applyMeasuredBlockHeightToLayouts } from '../measurementService';
import type { BlockBoxLayout } from '../runtimeLayout';

export interface ApplyMeasuredBlockHeightDraftOptions {
  coordinateContract?: CoordinateContract;
  baseLayouts: Record<string, BlockBoxLayout>;
  blockId: string;
  fallbackLayout: BlockBoxLayout;
  measuredHeight: number;
  orderedBlockIds: string[];
  resolveCollisions: boolean;
}

export function useLayoutDraftController() {
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, BlockBoxLayout>>({});

  const resetLayoutDrafts = useCallback(() => {
    setLayoutDrafts({});
  }, []);

  const clearLayoutDraftForBlock = useCallback((blockId: string) => {
    setLayoutDrafts((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });
  }, []);

  const setLayoutDraftForBlock = useCallback((blockId: string, layout: BlockBoxLayout) => {
    setLayoutDrafts((current) => ({ ...current, [blockId]: layout }));
  }, []);

  const mergeLayoutDrafts = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    setLayoutDrafts((current) => ({ ...current, ...layouts }));
  }, []);

  const applyMeasuredBlockHeightDraft = useCallback(({
    baseLayouts,
    blockId,
    fallbackLayout,
    measuredHeight,
    orderedBlockIds,
    resolveCollisions,
    coordinateContract,
  }: ApplyMeasuredBlockHeightDraftOptions) => {
    setLayoutDrafts((current) => (
      applyMeasuredBlockHeightToLayouts({
        currentLayouts: current,
        baseLayouts,
        blockId,
        fallbackLayout,
        measuredHeight,
        orderedBlockIds,
        resolveCollisions,
        coordinateContract,
      })
    ));
  }, []);

  return {
    applyMeasuredBlockHeightDraft,
    clearLayoutDraftForBlock,
    layoutDrafts,
    mergeLayoutDrafts,
    resetLayoutDrafts,
    setLayoutDraftForBlock,
    setLayoutDrafts,
  };
}
