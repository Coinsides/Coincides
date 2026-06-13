import { useCallback } from 'react';

interface UseNoteLoadResetControllerInput {
  clearBlockSelection: () => void;
  resetLayoutDrafts: () => void;
}

export function useNoteLoadResetController({
  clearBlockSelection,
  resetLayoutDrafts,
}: UseNoteLoadResetControllerInput) {
  const handleNoteLoaded = useCallback(() => {
    resetLayoutDrafts();
    clearBlockSelection();
  }, [clearBlockSelection, resetLayoutDrafts]);

  return { handleNoteLoaded };
}
