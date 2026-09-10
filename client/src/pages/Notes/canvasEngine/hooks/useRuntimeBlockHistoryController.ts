import type { CoordinateContract } from '../placementContractService';
import { useCallback } from 'react';
import { usePlacementHistory, type UsePlacementHistoryOptions } from './usePlacementHistory';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { TableStructuredPayload } from '../types';

export interface UseRuntimeBlockHistoryControllerOptions {
  noteId?: string;
  generation?: number;
  beforeHistoryBoundary?: UsePlacementHistoryOptions['beforeHistoryBoundary'];
  coordinateContract?: CoordinateContract;
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  blocks: NoteBlock[];
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void | boolean | Promise<void | boolean>;
  persistStructuredObjectForHistory?: (objectId: string, payload: TableStructuredPayload) => Promise<boolean> | boolean;
  restoreBlockForHistory: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  trashBlock: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

export function useRuntimeBlockHistoryController({
  noteId,
  generation,
  beforeHistoryBoundary,
  applyLayoutDrafts,
  coordinateContract,
  blocks,
  persistLayoutSnapshot,
  persistStructuredObjectForHistory,
  restoreBlockForHistory,
  trashBlock,
}: UseRuntimeBlockHistoryControllerOptions) {
  const {
    pushHistoryEntry,
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
    pushTrashedBlockHistory,
    enqueueRuntimeHistoryOperation,
    whenHistoryIdle,
    isReplaying,
    historyReplaying,
    sealRuntimeHistoryBoundary,
    undoRuntimeHistory,
    redoRuntimeHistory,
  } = usePlacementHistory({
    noteId,
    generation,
    beforeHistoryBoundary,
    coordinateContract,
    applyLayoutDrafts,
    persistLayoutSnapshot,
    persistStructuredObject: persistStructuredObjectForHistory,
    restoreBlockForHistory,
    trashBlockForHistory: trashBlock,
  });

  const handleTrashBlock = useCallback(async (blockId: string) => {
    if (!sealRuntimeHistoryBoundary()) return false;
    const block = blocks.find((item) => item.id === blockId);
    return enqueueRuntimeHistoryOperation(async () => {
      const removed = await trashBlock(blockId);
      if (removed && block) return pushHistoryEntry({ type: 'trashedBlock', block }, { skipBoundary: true });
      return removed;
    });
  }, [blocks, enqueueRuntimeHistoryOperation, pushHistoryEntry, sealRuntimeHistoryBoundary, trashBlock]);

  return {
    pushHistoryEntry,
    handleTrashBlock,
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
    pushTrashedBlockHistory,
    enqueueRuntimeHistoryOperation,
    whenHistoryIdle,
    isReplaying,
    historyReplaying,
    sealRuntimeHistoryBoundary,
    undoRuntimeHistory,
    redoRuntimeHistory,
  };
}
