import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  editingTextInteraction,
  idleInteraction,
  selectedBlockInteraction,
  type RuntimeInteractionState,
} from '../interactionController';

export interface UseBlockSelectionControllerOptions {
  onBeforeBlockFocus?: () => void;
  onBeforeBlockSelect?: () => void;
  setInteractionState: (state: RuntimeInteractionState) => void;
}

export function useBlockSelectionController({
  onBeforeBlockFocus,
  onBeforeBlockSelect,
  setInteractionState,
}: UseBlockSelectionControllerOptions) {
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockId(null);
    setActiveBlockId(null);
    setFocusBlockId(null);
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const markBlockFocused = useCallback((blockId: string) => {
    onBeforeBlockFocus?.();
    setSelectedBlockId(blockId);
    setActiveBlockId(blockId);
    setFocusBlockId(null);
    setInteractionState(editingTextInteraction(blockId));
  }, [onBeforeBlockFocus, setInteractionState]);

  const markBlockSelected = useCallback((blockId: string) => {
    onBeforeBlockSelect?.();
    setSelectedBlockId(blockId);
    setActiveBlockId((current) => (current === blockId ? current : null));
    setFocusBlockId((current) => (current === blockId ? current : null));
    setInteractionState(selectedBlockInteraction(blockId));
  }, [onBeforeBlockSelect, setInteractionState]);

  return {
    activeBlockId,
    clearBlockSelection,
    focusBlockId,
    markBlockFocused,
    markBlockSelected,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setSelectedBlockId,
  } satisfies {
    activeBlockId: string | null;
    clearBlockSelection: () => void;
    focusBlockId: string | null;
    markBlockFocused: (blockId: string) => void;
    markBlockSelected: (blockId: string) => void;
    selectedBlockId: string | null;
    setActiveBlockId: Dispatch<SetStateAction<string | null>>;
    setFocusBlockId: Dispatch<SetStateAction<string | null>>;
    setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  };
}
