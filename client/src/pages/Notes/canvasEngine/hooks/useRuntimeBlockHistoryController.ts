import { useCallback } from 'react';
import { usePlacementHistory } from './usePlacementHistory';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { TableStructuredPayload } from '../types';

export interface UseRuntimeBlockHistoryControllerOptions {
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  blocks: NoteBlock[];
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void;
  persistStructuredObjectForHistory?: (objectId: string, payload: TableStructuredPayload) => Promise<boolean> | boolean;
  restoreBlockForHistory: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  trashBlock: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

export function useRuntimeBlockHistoryController({
  applyLayoutDrafts,
  blocks,
  persistLayoutSnapshot,
  persistStructuredObjectForHistory,
  restoreBlockForHistory,
  trashBlock,
}: UseRuntimeBlockHistoryControllerOptions) {
  const {
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
    pushTrashedBlockHistory,
  } = usePlacementHistory({
    applyLayoutDrafts,
    persistLayoutSnapshot,
    persistStructuredObject: persistStructuredObjectForHistory,
    restoreBlockForHistory,
    trashBlockForHistory: trashBlock,
  });

  const handleTrashBlock = useCallback(async (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    const removed = await trashBlock(blockId);
    if (removed && block) pushTrashedBlockHistory(block);
    return removed;
  }, [blocks, pushTrashedBlockHistory, trashBlock]);

  return {
    handleTrashBlock,
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
  };
}
