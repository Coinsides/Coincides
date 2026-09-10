import type { CoordinateContract } from '../placementContractService';
import { useCallback } from 'react';
import { layoutsEqual } from '../placementService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';

export interface UseLayoutPersistenceControllerOptions {
  coordinateContract?: CoordinateContract;
  blocks: NoteBlock[];
  blockLayouts: Record<string, BlockBoxLayout>;
  persistBlockLayout: (block: NoteBlock, layout: BlockBoxLayout) => void | boolean | Promise<void | boolean>;
}

export function useLayoutPersistenceController({
  blocks,
  coordinateContract,
  blockLayouts,
  persistBlockLayout,
}: UseLayoutPersistenceControllerOptions) {
  const persistChangedBlockLayouts = useCallback(async (nextLayouts: Record<string, BlockBoxLayout>) => {
    const results = await Promise.all(Object.entries(nextLayouts).map(async ([blockId, nextLayout]) => {
      const previousLayout = blockLayouts[blockId];
      if (previousLayout && layoutsEqual(previousLayout, nextLayout, coordinateContract)) return true;
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return false;
      return await persistBlockLayout(targetBlock, nextLayout) !== false;
    }));
    return results.every(Boolean);
  }, [blocks, blockLayouts, coordinateContract, persistBlockLayout]);

  const persistLayoutSnapshot = useCallback(async (layouts: Record<string, BlockBoxLayout>) => {
    const results = await Promise.all(Object.entries(layouts).map(async ([blockId, layout]) => {
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return false;
      return await persistBlockLayout(targetBlock, layout) !== false;
    }));
    return results.every(Boolean);
  }, [blocks, persistBlockLayout]);

  return {
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
  };
}
