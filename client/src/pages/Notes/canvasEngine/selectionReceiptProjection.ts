import type {
  SelectionReceiptRefV1,
  SelectionReceiptTextRangeV1,
  SelectionReceiptV1,
} from '../../../../../shared/types/selectionReceipt';
import type { SelectionDraftV1 } from './selectionDraftService';

function selectionReceiptRef(
  range: SelectionDraftV1['ranges'][number],
): SelectionReceiptRefV1 {
  return {
    blockId: range.blockId,
    textFlowId: range.textFlowId,
    textUnitId: range.textUnitId,
  };
}

function selectionReceiptTextRange(
  range: SelectionDraftV1['ranges'][number],
): SelectionReceiptTextRangeV1 {
  return {
    ...selectionReceiptRef(range),
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    excerpt: range.text.slice(range.startOffset, range.endOffset),
  };
}

export function selectionDraftToReceipt(
  draft: SelectionDraftV1,
  envelope: { noteId: string },
): SelectionReceiptV1 | null {
  if (draft.ranges.length === 0) return null;

  return {
    note_id: envelope.noteId,
    refs: draft.ranges.map(selectionReceiptRef),
    text_ranges: draft.ranges.map(selectionReceiptTextRange),
    at: new Date().toISOString(),
  };
}
