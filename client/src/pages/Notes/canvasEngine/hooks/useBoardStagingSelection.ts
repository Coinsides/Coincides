import { useCallback, useContext, type RefObject } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { boardReferenceFromSelection } from '@/pages/Boards/boardTextRangeClipboard';
import { NoteCanvasRuntimeContext } from '../NoteCanvasRuntimeProvider';
import type { CapturedSelectionRange } from '../selectionRangeService';

export function useBoardStagingSelection({ noteId, surfaceRef, selection, blockIds }: {
  noteId: string;
  surfaceRef: RefObject<HTMLElement>;
  selection: CapturedSelectionRange | null;
  blockIds: string[];
}) {
  const runtime = useContext(NoteCanvasRuntimeContext);
  const onSendToStaging = runtime?.hostMode === 'modal' ? runtime.onSendToStaging : undefined;
  const addToast = useUIStore((state) => state.addToast);
  const send = useCallback(async () => {
    if (!selection || !onSendToStaging) return false;
    if (!blockIds.includes(selection.blockId)) {
      addToast('info', 'Save this text before sending it to staging.');
      return false;
    }
    const textarea = Array.from(surfaceRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-text-unit-id]') || [])
      .find((element) => element.dataset.blockId === selection.blockId
        && element.dataset.textFlowId === selection.textFlowId && element.dataset.textUnitId === selection.textUnitId);
    if (textarea && textarea.value !== selection.text) {
      addToast('info', 'The text has changed. Select the passage again before sending it to staging.');
      return false;
    }
    // Capture the same single-unit receipt as Copy as board reference before
    // the modal flushes its editor and mounts through the existing range chain.
    const reference = boardReferenceFromSelection(noteId, selection);
    if (!reference) return false;
    try {
      if (await onSendToStaging(reference)) return true;
    } catch { /* Keep the selection available for retry after save or mount failure. */ }
    addToast('error', 'Could not send this passage to staging. Try again.');
    return false;
  }, [addToast, blockIds, noteId, onSendToStaging, selection, surfaceRef]);
  return onSendToStaging ? send : undefined;
}
