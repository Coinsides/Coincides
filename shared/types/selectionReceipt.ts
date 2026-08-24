export interface SelectionReceiptRefV1 {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
}

export interface SelectionReceiptTextRangeV1 extends SelectionReceiptRefV1 {
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * Serializable, frame-free snapshot of a client text selection.
 * UI positioning state deliberately remains on SelectionDraftV1.
 */
export interface SelectionReceiptV1 {
  note_id: string;
  refs: SelectionReceiptRefV1[];
  text_ranges: SelectionReceiptTextRangeV1[];
  at: string;
}
