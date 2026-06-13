import { useMemo } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';

export interface UseRuntimeDocumentStatsControllerOptions {
  sortedBlocks: NoteBlock[];
}

export function useRuntimeDocumentStatsController({
  sortedBlocks,
}: UseRuntimeDocumentStatsControllerOptions) {
  const sourceReferenceCount = useMemo(
    () => sortedBlocks.reduce((total, block) => total + block.source_references.length, 0),
    [sortedBlocks],
  );

  return {
    sourceReferenceCount,
  };
}
