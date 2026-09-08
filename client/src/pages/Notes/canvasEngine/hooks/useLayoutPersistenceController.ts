import type { CoordinateContract } from '../placementContractService';
import { useCallback } from 'react';
import { layoutsEqual } from '../placementService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';

export interface UseLayoutPersistenceControllerOptions {
  coordinateContract?: CoordinateContract;
  blocks: NoteBlock[];
  blockLayouts: Record<string, BlockBoxLayout>;
  persistBlockLayout: (block: NoteBlock, layout: BlockBoxLayout) => void | Promise<void>;
}

export function useLayoutPersistenceController({
  blocks,
  coordinateContract,
  blockLayouts,
  persistBlockLayout,
}: UseLayoutPersistenceControllerOptions) {
  const persistChangedBlockLayouts = useCallback((nextLayouts: Record<string, BlockBoxLayout>) => {
    Object.entries(nextLayouts).forEach(([blockId, nextLayout]) => {
      const previousLayout = blockLayouts[blockId];
      if (previousLayout && layoutsEqual(previousLayout, nextLayout, coordinateContract)) return;
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, nextLayout);
    });
  }, [blocks, blockLayouts, coordinateContract, persistBlockLayout]);

  const persistLayoutSnapshot = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    Object.entries(layouts).forEach(([blockId, layout]) => {
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, layout);
    });
  }, [blocks, persistBlockLayout]);

  return {
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
  };
}
