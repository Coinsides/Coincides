import { useCallback, useEffect, type RefObject } from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
  boardReferenceFromSelection, copyBoardReference, writeBoardReferenceClipboard,
} from '@/pages/Boards/boardTextRangeClipboard';
import type { CapturedSelectionRange } from '../selectionRangeService';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';

export function useBoardReferenceClipboard({ noteId, surfaceRef, selection, blockIds, surfaceMode }: {
  noteId: string;
  surfaceRef: RefObject<HTMLElement>;
  selection: CapturedSelectionRange | null;
  blockIds: string[];
  surfaceMode: string;
}) {
  const addToast = useUIStore((state) => state.addToast);
  const copyReference = useCallback(async (reference: BoardTextRangeSelection) => {
    try {
      const result = await copyBoardReference(reference);
      addToast(result === 'reference' ? 'success' : 'info', result === 'reference'
        ? 'Board reference copied. Paste it onto a board.'
        : 'Copied plain text. Use Ctrl+C on the selected text to copy a board reference.');
    } catch { addToast('error', 'Could not copy. Try Ctrl+C on the selected text.'); }
  }, [addToast]);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const ownedTextarea = (target: EventTarget | null): HTMLTextAreaElement | null => (
      target instanceof HTMLTextAreaElement && target.dataset.textUnitId
      && blockIds.includes(target.dataset.blockId || '') ? target : null
    );
    const draftReference = (textarea: HTMLTextAreaElement) => (
      selection && selection.blockId === textarea.dataset.blockId
      && selection.textFlowId === textarea.dataset.textFlowId
      && selection.textUnitId === textarea.dataset.textUnitId && selection.text === textarea.value
        ? boardReferenceFromSelection(noteId, selection) : null
    );
    const onCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented || !event.clipboardData) return;
      const textarea = ownedTextarea(event.target);
      if (!textarea) return;
      const reference = boardReferenceFromSelection(noteId, {
        blockId: textarea.dataset.blockId || '', textFlowId: textarea.dataset.textFlowId || '',
        textUnitId: textarea.dataset.textUnitId || '', startOffset: textarea.selectionStart,
        endOffset: textarea.selectionEnd, text: textarea.value,
      }) || (textarea.selectionStart === textarea.selectionEnd ? draftReference(textarea) : null);
      if (!reference) return;
      writeBoardReferenceClipboard(event.clipboardData, reference);
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'c') return;
      const textarea = ownedTextarea(event.target);
      if (!textarea || textarea.selectionStart !== textarea.selectionEnd) return;
      // The editor has converted mouse selection into a draft and collapsed
      // native selection. Preserve that receipt through the same copy path.
      const reference = draftReference(textarea);
      if (!reference) return;
      event.preventDefault();
      void copyReference(reference);
    };
    surface.addEventListener('copy', onCopy);
    surface.addEventListener('keydown', onKeyDown);
    return () => {
      surface.removeEventListener('copy', onCopy);
      surface.removeEventListener('keydown', onKeyDown);
    };
  }, [blockIds, copyReference, noteId, selection, surfaceRef, surfaceMode]);

  return useCallback(async () => {
    if (!selection) return;
    if (!blockIds.includes(selection.blockId)) {
      addToast('info', 'Save this text before copying it as a board reference.');
      return;
    }
    const textarea = Array.from(surfaceRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-text-unit-id]') || [])
      .find((element) => element.dataset.blockId === selection.blockId && element.dataset.textUnitId === selection.textUnitId);
    if (textarea && textarea.value !== selection.text) {
      addToast('info', 'The text has changed. Select the passage again before copying.');
      return;
    }
    const reference = boardReferenceFromSelection(noteId, selection);
    if (!reference) return;
    await copyReference(reference);
  }, [addToast, blockIds, copyReference, noteId, selection, surfaceRef]);
}
