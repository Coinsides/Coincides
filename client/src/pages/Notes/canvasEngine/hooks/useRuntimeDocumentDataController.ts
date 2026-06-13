import { useLayoutDraftController } from './useLayoutDraftController';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import { useNoteLoadResetController } from './useNoteLoadResetController';
import { useRuntimeDocumentStatsController } from './useRuntimeDocumentStatsController';

interface UseRuntimeDocumentDataControllerOptions {
  clearBlockSelection: () => void;
  noteId: string | undefined;
}

export function useRuntimeDocumentDataController({
  clearBlockSelection,
  noteId,
}: UseRuntimeDocumentDataControllerOptions) {
  const {
    applyMeasuredBlockHeightDraft,
    clearLayoutDraftForBlock,
    layoutDrafts,
    mergeLayoutDrafts,
    resetLayoutDrafts,
    setLayoutDraftForBlock,
    setLayoutDrafts,
  } = useLayoutDraftController();

  const { handleNoteLoaded } = useNoteLoadResetController({
    clearBlockSelection,
    resetLayoutDrafts,
  });

  const documentData = useNoteCanvasDataAdapter({
    noteId,
    onNoteLoaded: handleNoteLoaded,
    clearLayoutDraftForBlock,
    setLayoutDraftForBlock,
  });

  const { sourceReferenceCount } = useRuntimeDocumentStatsController({
    sortedBlocks: documentData.sortedBlocks,
  });

  return {
    ...documentData,
    applyMeasuredBlockHeightDraft,
    layoutDrafts,
    mergeLayoutDrafts,
    setLayoutDrafts,
    sourceReferenceCount,
  };
}
