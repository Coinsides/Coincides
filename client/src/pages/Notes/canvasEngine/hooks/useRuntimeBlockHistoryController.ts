import { useCallback } from 'react';
import { usePlacementHistory } from './usePlacementHistory';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';

export interface UseRuntimeBlockHistoryControllerOptions {
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  blocks: NoteBlock[];
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void;
  restoreBlockForHistory: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  trashBlock: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

export function useRuntimeBlockHistoryController({
  applyLayoutDrafts,
  blocks,
  persistLayoutSnapshot,
  restoreBlockForHistory,
  trashBlock,
}: UseRuntimeBlockHistoryControllerOptions) {
  const {
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushTrashedBlockHistory,
  } = usePlacementHistory({
    applyLayoutDrafts,
    persistLayoutSnapshot,
    restoreBlockForHistory,
    trashBlockForHistory: trashBlock,
  });

  const handleTrashBlock = useCallback(async (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    const removed = await trashBlock(blockId);
    if (removed && block) pushTrashedBlockHistory(block);
  }, [blocks, pushTrashedBlockHistory, trashBlock]);

  return {
    handleTrashBlock,
    pushCreatedBlockHistory,
    pushLayoutHistory,
  };
}
