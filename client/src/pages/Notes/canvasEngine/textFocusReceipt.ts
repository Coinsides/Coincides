export interface TextFocusReceipt {
  blockId: string;
  textFlowId: string;
  textUnitId: string;
}

export interface TextOwnerReconciliation {
  from: TextFocusReceipt;
  to: TextFocusReceipt;
  selectionStart: number;
  selectionEnd: number;
}

export function textFocusReceiptForBlock(
  blockId: string,
  textUnitId = 'tu-1',
): TextFocusReceipt {
  return {
    blockId,
    textFlowId: `textflow-${blockId}`,
    textUnitId,
  };
}

export function textFocusReceiptForDraft(sessionId: number): TextFocusReceipt {
  const blockId = `draft-${sessionId}`;
  return {
    blockId,
    textFlowId: `textflow-${blockId}`,
    textUnitId: 'tu-1',
  };
}

export function textFocusReceiptsEqual(
  left: TextFocusReceipt | null | undefined,
  right: TextFocusReceipt | null | undefined,
): boolean {
  return Boolean(
    left
    && right
    && left.blockId === right.blockId
    && left.textFlowId === right.textFlowId
    && left.textUnitId === right.textUnitId,
  );
}

export function reconcileTextFocusReceipt(
  current: TextFocusReceipt | null,
  reconciliation: TextOwnerReconciliation,
): TextFocusReceipt | null {
  return textFocusReceiptsEqual(current, reconciliation.from)
    ? reconciliation.to
    : current;
}
