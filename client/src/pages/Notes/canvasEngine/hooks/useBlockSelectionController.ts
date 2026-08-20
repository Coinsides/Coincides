import {
  useCallback,
  useRef,
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
import {
  textFocusReceiptsEqual,
  type TextFocusReceipt,
} from '../textFocusReceipt';

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
  const [focusedTextOwner, setFocusedTextOwner] = useState<TextFocusReceipt | null>(null);
  const focusedTextOwnerRef = useRef<TextFocusReceipt | null>(null);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockId(null);
    setActiveBlockId(null);
    setFocusBlockId(null);
    focusedTextOwnerRef.current = null;
    setFocusedTextOwner(null);
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const markBlockFocused = useCallback((receipt: TextFocusReceipt) => {
    onBeforeBlockFocus?.();
    setSelectedBlockId(receipt.blockId);
    setActiveBlockId(receipt.blockId);
    setFocusBlockId(null);
    focusedTextOwnerRef.current = receipt;
    setFocusedTextOwner(receipt);
    setInteractionState(editingTextInteraction(receipt, 'block'));
  }, [onBeforeBlockFocus, setInteractionState]);

  const markDraftFocused = useCallback((receipt: TextFocusReceipt) => {
    onBeforeBlockFocus?.();
    setSelectedBlockId(null);
    setActiveBlockId(null);
    setFocusBlockId(null);
    focusedTextOwnerRef.current = receipt;
    setFocusedTextOwner(receipt);
    setInteractionState(editingTextInteraction(receipt, 'draft'));
  }, [onBeforeBlockFocus, setInteractionState]);

  const releaseTextFocus = useCallback((receipt: TextFocusReceipt) => {
    if (!textFocusReceiptsEqual(focusedTextOwnerRef.current, receipt)) return;
    focusedTextOwnerRef.current = null;
    setFocusedTextOwner(null);
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const markBlockSelected = useCallback((blockId: string) => {
    onBeforeBlockSelect?.();
    setSelectedBlockId(blockId);
    setActiveBlockId((current) => (current === blockId ? current : null));
    setFocusBlockId((current) => (current === blockId ? current : null));
    focusedTextOwnerRef.current = null;
    setFocusedTextOwner(null);
    setInteractionState(selectedBlockInteraction(blockId));
  }, [onBeforeBlockSelect, setInteractionState]);

  return {
    activeBlockId,
    clearBlockSelection,
    focusBlockId,
    focusedTextOwner,
    markBlockFocused,
    markDraftFocused,
    markBlockSelected,
    releaseTextFocus,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setSelectedBlockId,
  } satisfies {
    activeBlockId: string | null;
    clearBlockSelection: () => void;
    focusBlockId: string | null;
    focusedTextOwner: TextFocusReceipt | null;
    markBlockFocused: (receipt: TextFocusReceipt) => void;
    markDraftFocused: (receipt: TextFocusReceipt) => void;
    markBlockSelected: (blockId: string) => void;
    releaseTextFocus: (receipt: TextFocusReceipt) => void;
    selectedBlockId: string | null;
    setActiveBlockId: Dispatch<SetStateAction<string | null>>;
    setFocusBlockId: Dispatch<SetStateAction<string | null>>;
    setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  };
}
