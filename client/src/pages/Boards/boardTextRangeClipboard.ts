import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';

export const BOARD_TEXT_RANGE_MIME = 'application/x-coincides-board-text-range+json';

export function parseBoardTextRangeClipboard(raw: string): BoardTextRangeSelection | null {
  if (!raw || raw.length > 210000) return null;
  try {
    const value = JSON.parse(raw) as BoardTextRangeSelection;
    if (!value || typeof value !== 'object'
      || ![value.note_id, value.block_id, value.text_flow_id, value.text_unit_id]
        .every((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 180)
      || !Number.isInteger(value.start_offset) || !Number.isInteger(value.end_offset)
      || value.start_offset < 0 || value.end_offset <= value.start_offset
      || typeof value.excerpt !== 'string' || value.excerpt.length > 200000
      || value.excerpt.length !== value.end_offset - value.start_offset
      || typeof value.at !== 'string' || !Number.isFinite(Date.parse(value.at))) return null;
    return {
      note_id: value.note_id, block_id: value.block_id, text_flow_id: value.text_flow_id,
      text_unit_id: value.text_unit_id, start_offset: value.start_offset, end_offset: value.end_offset,
      excerpt: value.excerpt, at: value.at,
    };
  } catch { return null; }
}

export function boardReferenceFromSelection(noteId: string, selection: {
  blockId: string; textFlowId: string; textUnitId: string;
  startOffset: number; endOffset: number; text: string;
}): BoardTextRangeSelection | null {
  return parseBoardTextRangeClipboard(JSON.stringify({
    note_id: noteId, block_id: selection.blockId, text_flow_id: selection.textFlowId,
    text_unit_id: selection.textUnitId, start_offset: selection.startOffset,
    end_offset: selection.endOffset,
    excerpt: selection.text.slice(selection.startOffset, selection.endOffset),
    at: new Date().toISOString(),
  }));
}

/** The ordinary clipboard remains readable by applications that do not know our MIME. */
export function writeBoardReferenceClipboard(data: Pick<DataTransfer, 'setData'>, reference: BoardTextRangeSelection) {
  data.setData('text/plain', reference.excerpt);
  data.setData(BOARD_TEXT_RANGE_MIME, JSON.stringify(reference));
}

/** A button uses the same native copy contract as Ctrl+C, without a private clipboard cache. */
export async function copyBoardReference(reference: BoardTextRangeSelection): Promise<'reference' | 'text'> {
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        [`web ${BOARD_TEXT_RANGE_MIME}`]: new Blob([JSON.stringify(reference)], { type: BOARD_TEXT_RANGE_MIME }),
        'text/plain': new Blob([reference.excerpt], { type: 'text/plain' }),
      })]);
      return 'reference';
    } catch { /* Fall back to native copying when custom clipboard types are unavailable. */ }
  }
  let copied = false;
  let nativeCopySucceeded = false;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousTextControl = previousFocus instanceof HTMLTextAreaElement || previousFocus instanceof HTMLInputElement
    ? previousFocus : null;
  const previousTextSelection = previousTextControl ? {
    start: previousTextControl.selectionStart,
    end: previousTextControl.selectionEnd,
    direction: previousTextControl.selectionDirection,
  } : null;
  // Mouse selection becomes an annotation draft and collapses its native range.
  // Give execCommand a real selected control so a dispatched copy event is also
  // backed by a successful system clipboard write.
  const nativeSelection = document.getSelection();
  const previousRanges = nativeSelection
    ? Array.from({ length: nativeSelection.rangeCount }, (_, index) => nativeSelection.getRangeAt(index).cloneRange())
    : [];
  const focusedSource = previousFocus instanceof HTMLTextAreaElement
    && previousFocus.dataset.blockId === reference.block_id
    && previousFocus.dataset.textFlowId === reference.text_flow_id
    && previousFocus.dataset.textUnitId === reference.text_unit_id
    && previousFocus.value.slice(reference.start_offset, reference.end_offset) === reference.excerpt
      ? previousFocus : null;
  const copyTarget = focusedSource ?? document.createElement('textarea');
  if (!focusedSource) {
    copyTarget.value = reference.excerpt;
    copyTarget.tabIndex = -1;
    copyTarget.setAttribute('aria-hidden', 'true');
    Object.assign(copyTarget.style, { position: 'fixed', left: '-10000px', top: '0', opacity: '0' });
  }
  const copy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    writeBoardReferenceClipboard(event.clipboardData, reference);
    event.preventDefault();
    copied = true;
  };
  document.addEventListener('copy', copy, true);
  try {
    if (focusedSource) {
      // Reusing the focused source avoids a blur-triggered body save while copying.
      focusedSource.setSelectionRange(reference.start_offset, reference.end_offset);
    } else {
      document.body.append(copyTarget);
      copyTarget.focus({ preventScroll: true });
      copyTarget.select();
    }
    if (typeof document.execCommand === 'function') nativeCopySucceeded = document.execCommand('copy');
  } catch { /* Fall back to plain text when native copying is unavailable. */
  } finally {
    document.removeEventListener('copy', copy, true);
    if (!focusedSource) copyTarget.remove();
    if (previousFocus?.isConnected && document.activeElement !== previousFocus) previousFocus.focus({ preventScroll: true });
    if (previousTextControl?.isConnected && previousTextSelection
      && previousTextSelection.start !== null && previousTextSelection.end !== null) {
      previousTextControl.setSelectionRange(previousTextSelection.start, previousTextSelection.end,
        previousTextSelection.direction ?? undefined);
    }
    if (nativeSelection && previousRanges.length > 0) {
      nativeSelection.removeAllRanges();
      previousRanges.forEach((range) => nativeSelection.addRange(range));
    }
  }
  if (copied && nativeCopySucceeded) return 'reference';
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(reference.excerpt);
  return 'text';
}
