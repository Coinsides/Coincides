import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { textFocusReceiptForBlock, textFocusReceiptForDraft } from '../textFocusReceipt';
import { useBlockSelectionController } from './useBlockSelectionController';

describe('useBlockSelectionController focus receipts', () => {
  it('enters editing only from an exact DOM owner triple', () => {
    const setInteractionState = vi.fn();
    const subject = renderHook(() => useBlockSelectionController({ setInteractionState }));
    const draftReceipt = textFocusReceiptForDraft(1);
    const blockReceipt = textFocusReceiptForBlock('block-1', 'tu-7');

    act(() => subject.result.current.markDraftFocused(draftReceipt));
    expect(subject.result.current.focusedTextOwner).toEqual(draftReceipt);
    expect(setInteractionState).toHaveBeenLastCalledWith({
      mode: 'editingText',
      target: 'draft',
      blockId: draftReceipt.blockId,
      textFlowId: draftReceipt.textFlowId,
      textUnitId: draftReceipt.textUnitId,
    });

    act(() => subject.result.current.markBlockFocused(blockReceipt));
    expect(subject.result.current.focusedTextOwner).toEqual(blockReceipt);
    expect(subject.result.current.activeBlockId).toBe(blockReceipt.blockId);
    expect(setInteractionState).toHaveBeenLastCalledWith({
      mode: 'editingText',
      target: 'block',
      blockId: blockReceipt.blockId,
      textFlowId: blockReceipt.textFlowId,
      textUnitId: blockReceipt.textUnitId,
    });
  });

  it('does not let a stale blur receipt clear a newer focused owner', () => {
    const setInteractionState = vi.fn();
    const subject = renderHook(() => useBlockSelectionController({ setInteractionState }));
    const oldReceipt = textFocusReceiptForBlock('block-1', 'unit-1');
    const currentReceipt = textFocusReceiptForBlock('block-2', 'unit-2');

    act(() => subject.result.current.markBlockFocused(oldReceipt));
    act(() => subject.result.current.markBlockFocused(currentReceipt));
    act(() => subject.result.current.releaseTextFocus(oldReceipt));
    expect(subject.result.current.focusedTextOwner).toEqual(currentReceipt);

    act(() => subject.result.current.releaseTextFocus(currentReceipt));
    expect(subject.result.current.focusedTextOwner).toBeNull();
    expect(setInteractionState).toHaveBeenLastCalledWith({ mode: 'idle', target: 'surface' });
  });
});
