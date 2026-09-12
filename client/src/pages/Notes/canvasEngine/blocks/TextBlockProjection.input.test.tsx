import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTextBlockContentV1 } from '../textFlowService';
import { useSelectionDraftController } from '../hooks/useSelectionDraftController';
import { TextBlockProjection } from './TextBlockProjection';
import { measureTextareaNavigation, textareaBoundaryCaret, textareaCaretAtPoint } from '../textareaNavigation';

// jsdom has no line layout. Native wrapping and visual columns are also checked
// in the real-browser synthetic fixture; these tests exercise event routing.
vi.mock('../textareaNavigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../textareaNavigation')>(),
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({
    x: offset * 8, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: true,
  })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({ offset: Math.min(node.value.length, Math.round(x / 8)), y: 0 })),
  textareaCaretAtPoint: vi.fn((_node: HTMLTextAreaElement, x: number) => ({ offset: x / 8, y: 0 })),
}));

afterEach(cleanup);

function renderEditor(initialText = 'alpha SELECT omega', separateUnits = false, nativeDraft = false, onPasteImage?: (file: File) => void) {
  const onFlow = vi.fn();
  const onKeyDown = vi.fn();
  const onBoundary = vi.fn();
  const onSave = vi.fn().mockResolvedValue({ status: 'saved' });
  function Editor() {
    const selectionDraft = useSelectionDraftController();
    const [flow, setFlow] = useState(() => {
      const initial = createTextBlockContentV1(initialText);
      return separateUnits ? { ...initial, units: initialText.split('\n').map((text, index) => ({
        ...initial.units[0], id: `tu-${index + 1}`, text, order_index: index,
      })) } : initial;
    });
    return <TextBlockProjection
      blockId="synthetic-block"
      readOnly={false}
      text={flow.units.map((unit) => unit.text).join('\n')}
      textFlow={flow}
      presentationKind="paragraph"
      annotations={[]}
      selectedAnnotationIds={[]}
      showLabelOverlay={false}
      textareaRef={null}
      onFocused={vi.fn()}
      onAnnotationSelect={vi.fn()}
      onAnnotationContextMenu={vi.fn()}
      draftAnnotationRanges={nativeDraft ? selectionDraft.draftAnnotationRanges : []}
      onFlowSelectionStart={selectionDraft.clearDraft}
      onTextUnitSelection={nativeDraft ? (range, anchorRect) => selectionDraft.replaceDraft({ range, anchorRect }) : vi.fn()}
      onTextUnitContextMenu={vi.fn()}
      onTextChange={vi.fn()}
      onTextFlowChange={(next, edit) => { onFlow(next, edit); setFlow(next); }}
      onTextEditBoundary={onBoundary}
      onSave={onSave}
      onKeyDown={onKeyDown}
      onPasteImage={onPasteImage}
    />;
  }
  const view = render(<Editor />);
  return {
    ...view,
    onFlow,
    onKeyDown,
    onBoundary,
    onSave,
    textarea: view.container.querySelector('textarea')!,
    texts: () => [...view.container.querySelectorAll('textarea')].map((node) => node.value),
  };
}

describe('B4 TextFlow input boundaries with synthetic content', () => {
  it('13.6 branches pure images before empty text without touching TextFlow', () => {
    const onPasteImage = vi.fn();
    const editor = renderEditor('keep text', false, false, onPasteImage);
    const file = new File(['synthetic'], 'Screenshot.png', { type: 'image/png' });
    expect(fireEvent.paste(editor.textarea, { clipboardData: { getData: () => '', types: ['Files'], files: [file] } })).toBe(false);
    expect(onPasteImage).toHaveBeenCalledWith(file);
    expect(editor.onFlow).not.toHaveBeenCalled(); expect(editor.texts()).toEqual(['keep text']);
  });
  it.each([false, true])('13.6 keeps the existing plain-text path with image=%s', (hasImage) => {
    const onPasteImage = vi.fn();
    const editor = renderEditor('keep text', false, false, onPasteImage);
    const file = new File(['synthetic'], 'Screenshot.png', { type: 'image/png' });
    act(() => editor.textarea.setSelectionRange(0, 0));
    expect(fireEvent.paste(editor.textarea, { clipboardData: { getData: () => 'ordinary text', types: ['text/plain'], files: hasImage ? [file] : [] } })).toBe(true);
    expect(onPasteImage).not.toHaveBeenCalled(); expect(editor.onFlow).not.toHaveBeenCalled();
    fireEvent.paste(editor.textarea, { clipboardData: { getData: () => 'line one\nline two', types: ['text/plain'], files: hasImage ? [file] : [] } });
    expect(onPasteImage).not.toHaveBeenCalled(); expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });
  it('13.6 leaves an explicitly present empty text/plain representation on the text path', () => {
    const onPasteImage = vi.fn(); const editor = renderEditor('keep', false, false, onPasteImage);
    const file = new File(['synthetic'], 'Screenshot.png', { type: 'image/png' });
    expect(fireEvent.paste(editor.textarea, { clipboardData: { getData: () => '', types: ['text/plain', 'Files'], files: [file] } })).toBe(true);
    expect(onPasteImage).not.toHaveBeenCalled();
  });
  it('fix1 smoke 2: reverses across the original middle-unit anchor without moving it', () => {
    const editor = renderEditor('First paragraph has enough text here\nWe are the Champions of the world\nThird paragraph has enough text here', true, true);
    const [first, middle, last] = [...editor.container.querySelectorAll('textarea')];
    act(() => { middle.focus(); middle.setSelectionRange(21, 21); });
    fireEvent.keyDown(middle, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(last, { key: 'ArrowUp', shiftKey: true });
    expect([middle.selectionStart, middle.selectionEnd]).toEqual([21, 21]);
    fireEvent.keyDown(middle, { key: 'ArrowUp', shiftKey: true });
    const setData = vi.fn();
    fireEvent.copy(first, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', first.value.slice(21) + '\nWe are the Champions ');
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    expect([middle.selectionStart, middle.selectionEnd]).toEqual([21, 21]);
    expect(editor.container.querySelector('[data-textflow-selection-layer]')).toBeNull();
  });

  it.each(['Delete', 'Backspace', 'beforeinput', 'paste'] as const)('fix1 Henry %s changes only the anchor-to-focus interval', (operation) => {
    const editor = renderEditor('We are the Champions of the world\nSecond paragraph has more text here\nThird paragraph has more text here', true, true);
    const [first, second, third] = [...editor.container.querySelectorAll('textarea')];
    const suffix = third.value.slice(21);
    act(() => { first.focus(); first.setSelectionRange(21, 21); });
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(second, { key: 'ArrowDown', shiftKey: true });
    const replacement = operation === 'beforeinput' || operation === 'paste' ? 'X' : '';
    if (operation === 'beforeinput') fireEvent(third, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'X' }));
    else if (operation === 'paste') fireEvent.paste(third, { clipboardData: { getData: () => 'X' } });
    else fireEvent.keyDown(third, { key: operation });
    expect(editor.texts()).toEqual(['We are the Champions ' + replacement + suffix]);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.onFlow.mock.calls[0][1].beforeSelection).toEqual({ unitId: 'tu-1', start: 21, end: 21 });
  });

  it('F14 red: Henry mid-paragraph native Shift then cross-unit Shift must retire the full-row draft highlight', () => {
    const editor = renderEditor('We are the Champions of the world\nSecond paragraph has more text here\nThird paragraph has more text here', true, true);
    const [first, second] = [...editor.container.querySelectorAll('textarea')];
    act(() => { first.focus(); first.setSelectionRange(21, 21); });
    vi.mocked(measureTextareaNavigation).mockReturnValueOnce({ x: 168, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: false });
    expect(fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true })).toBe(true);
    // jsdom has no native line movement. Supply the real browser's first-step range.
    act(() => first.setSelectionRange(21, first.value.length, 'forward'));
    fireEvent.select(first);
    fireEvent.keyUp(first, { key: 'ArrowDown', shiftKey: true });
    expect(editor.container.querySelector('[class*="textUnitDraftRange"]')).not.toBeNull();
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(second);
    const setData = vi.fn();
    fireEvent.copy(second, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'of the world\nSecond paragraph has ');
    expect(editor.container.querySelector('[class*="textUnitDraftRange"]'), 'native annotation draft must not paint before the pinned offset after traversal').toBeNull();
  });

  it.each(['😀', '👩‍👩‍👧‍👦', 'e\u0301'])('B9 Shift and plain arrows cross %s in one UTF-16 boundary step', (cluster) => {
    const editor = renderEditor(`A${cluster}B`);
    const node = editor.textarea;
    act(() => { node.focus(); node.setSelectionRange(1, 1); });
    expect(fireEvent.keyDown(node, { key: 'ArrowRight', shiftKey: true })).toBe(false);
    expect([node.selectionStart, node.selectionEnd]).toEqual([1, 1 + cluster.length]);
    expect(node.value.slice(node.selectionStart, node.selectionEnd)).toBe(cluster);
    fireEvent.keyDown(node, { key: 'ArrowLeft', shiftKey: true });
    expect([node.selectionStart, node.selectionEnd]).toEqual([1, 1]);
    expect(fireEvent.keyDown(node, { key: 'ArrowRight' })).toBe(false);
    expect([node.selectionStart, node.selectionEnd]).toEqual([1 + cluster.length, 1 + cluster.length]);
    expect(fireEvent.keyDown(node, { key: 'ArrowLeft' })).toBe(false);
    expect(node.selectionStart).toBe(1);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B9 snaps native click/selection capture and does not interfere with active composition', () => {
    const editor = renderEditor('A😀B');
    const node = editor.textarea;
    act(() => { node.focus(); node.setSelectionRange(2, 2); });
    fireEvent.mouseUp(node);
    expect([node.selectionStart, node.selectionEnd]).toEqual([3, 3]);
    act(() => node.setSelectionRange(1, 2));
    fireEvent.keyUp(node, { key: 'ArrowRight' });
    expect([node.selectionStart, node.selectionEnd]).toEqual([1, 3]);
    fireEvent.compositionStart(node);
    act(() => node.setSelectionRange(2, 2));
    fireEvent.keyDown(node, { key: 'ArrowRight', shiftKey: true, isComposing: true });
    fireEvent.mouseUp(node);
    expect([node.selectionStart, node.selectionEnd]).toEqual([2, 2]);
    fireEvent.compositionEnd(node);
    expect([node.selectionStart, node.selectionEnd]).toEqual([3, 3]);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B9 snaps cross-unit Shift click hit offsets before storing or replacing the logical range', () => {
    const editor = renderEditor('start\nA😀B', true);
    const [source, target] = [...editor.container.querySelectorAll('textarea')];
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.mouseDown(target, { shiftKey: true, clientX: 16, clientY: 0 });
    expect(target.selectionStart).toBe(3);
    const setData = vi.fn();
    fireEvent.copy(target, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'art\nA😀');
    fireEvent.keyDown(target, { key: 'Delete' });
    expect(editor.texts()).toEqual(['stB']);
  });

  it.each([true, false])('B9 preserves an inserted emoji sharing a surrogate prefix in the input fallback (data=%s)', (withData) => {
    const editor = renderEditor('start\n😀B', true);
    const [source, target] = [...editor.container.querySelectorAll('textarea')];
    act(() => { source.focus(); source.setSelectionRange(2, 5, 'forward'); });
    fireEvent.keyDown(source, { key: 'ArrowRight', shiftKey: true });
    expect(target.selectionStart).toBe(0);
    fireEvent.input(target, { target: { value: '😁😀B', selectionStart: 2, selectionEnd: 2 }, inputType: 'insertText',
      ...(withData ? { data: '😁' } : {}) });
    expect(editor.texts()).toEqual(['st😁😀B']);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });

  it.each([
    { oldText: 'AeZ', offset: 2, inserted: '\u0301', withData: true },
    { oldText: 'AeZ', offset: 2, inserted: '\u0301', withData: false },
    { oldText: 'A👩Z', offset: 3, inserted: '\u200d👧', withData: true },
    { oldText: 'A👩Z', offset: 3, inserted: '\u200d👧', withData: false },
  ])('B9 applies only the inserted cluster-joining bytes to a reverse logical range ($oldText, data=$withData)', ({ oldText, offset, inserted, withData }) => {
    const editor = renderEditor(`${oldText}\nlast`, true);
    const [target, source] = [...editor.container.querySelectorAll('textarea')];
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.mouseDown(target, { shiftKey: true, clientX: offset * 8, clientY: 0 });
    expect(target.selectionStart).toBe(offset);
    const value = `${oldText.slice(0, offset)}${inserted}${oldText.slice(offset)}`;
    fireEvent.input(target, { target: { value, selectionStart: offset + inserted.length, selectionEnd: offset + inserted.length },
      inputType: 'insertText', ...(withData ? { data: inserted } : {}) });
    expect(editor.texts()).toEqual([`${oldText.slice(0, offset)}${inserted}st`]);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });

  it('B9 treats a noncancelable deletion as deleting the logical range without reinserting grapheme context', () => {
    const editor = renderEditor('Ae\u0301Z\nlast', true);
    const [target, source] = [...editor.container.querySelectorAll('textarea')];
    act(() => { source.focus(); source.setSelectionRange(2, 2); });
    fireEvent.mouseDown(target, { shiftKey: true, clientX: 24, clientY: 0 });
    fireEvent.input(target, { target: { value: 'AeZ', selectionStart: 2, selectionEnd: 2 }, inputType: 'deleteContentBackward' });
    expect(editor.texts()).toEqual(['Ae\u0301st']);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });

  it.each(['AB', '中文'])('B9 preserves the native in-unit single-code-unit arrow path for %s', (text) => {
    const editor = renderEditor(text);
    act(() => { editor.textarea.focus(); editor.textarea.setSelectionRange(0, 0); });
    expect(fireEvent.keyDown(editor.textarea, { key: 'ArrowRight' })).toBe(true);
    expect(fireEvent.keyDown(editor.textarea, { key: 'ArrowRight', shiftKey: true })).toBe(true);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B6 smoke 1: Shift+Down crosses the textarea boundary and copies the flow range', () => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    expect(units).toHaveLength(3);
    act(() => { units[0].focus(); units[0].setSelectionRange(2, 2); });
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(units[1]);
    const setData = vi.fn();
    fireEvent.copy(units[1], { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'rst\nse');
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B5 smoke 1: arrows traverse three paragraphs in both directions', () => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    expect(units).toHaveLength(3);
    act(() => { units[0].focus(); units[0].setSelectionRange(0, 0); });
    fireEvent.keyDown(units[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(units[1]);
    fireEvent.keyDown(units[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(units[2]);
    fireEvent.keyDown(units[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(units[1]);
    fireEvent.keyDown(units[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(units[0]);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B5 smoke 2: a short unit does not replace the sticky column', () => {
    const editor = renderEditor('long text here\nhi\nlong text again', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    act(() => { units[0].focus(); units[0].setSelectionRange(9, 9); });
    fireEvent.keyDown(units[0], { key: 'ArrowDown' });
    expect(units[1].selectionStart).toBe(2);
    fireEvent.keyUp(units[1], { key: 'ArrowDown' });
    fireEvent.select(units[1]);
    fireEvent.keyDown(units[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(units[2]);
    expect(units[2].selectionStart).toBe(9);
    fireEvent.keyDown(units[2], { key: 'ArrowUp' });
    fireEvent.keyDown(units[1], { key: 'ArrowUp' });
    expect(units[0].selectionStart).toBe(9);
    fireEvent.mouseDown(units[0]);
    act(() => units[0].setSelectionRange(1, 1));
    fireEvent.keyDown(units[0], { key: 'ArrowDown' });
    expect(units[1].selectionStart).toBe(1);
  });

  it('B5 smoke 3: horizontal traversal changes only the boundary caret', () => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    act(() => { units[0].focus(); units[0].setSelectionRange(5, 5); });
    expect(fireEvent.keyDown(units[0], { key: 'ArrowRight' })).toBe(false);
    expect(document.activeElement).toBe(units[1]);
    expect(units[1].selectionStart).toBe(0);
    expect(fireEvent.keyDown(units[1], { key: 'ArrowLeft' })).toBe(false);
    expect(document.activeElement).toBe(units[0]);
    expect(units[0].selectionStart).toBe(5);
    expect(editor.onFlow).not.toHaveBeenCalled();
    act(() => units[0].setSelectionRange(0, 0));
    expect(fireEvent.keyDown(units[0], { key: 'ArrowLeft' })).toBe(true);
  });

  it('B5 smoke 4: native End keeps the upstream soft-wrap line until native Down moves', () => {
    const editor = renderEditor('first row second row\nnext', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    const measure = vi.mocked(measureTextareaNavigation);
    const original = measure.getMockImplementation()!;
    measure.mockImplementation((_node, offset, preferredY) => {
      const y = offset < 10 || (offset === 10 && preferredY === 0) ? 0 : 20;
      return { x: (offset - (y === 20 ? 10 : 0)) * 8, y, lineHeight: 20, atFirstLine: y === 0, atLastLine: y === 20 };
    });
    try {
      act(() => { units[0].focus(); units[0].setSelectionRange(4, 4); });
      expect(fireEvent.keyDown(units[0], { key: 'End' })).toBe(true);
      act(() => units[0].setSelectionRange(10, 10)); // native End at upstream edge
      fireEvent.keyUp(units[0], { key: 'End' });
      expect(fireEvent.keyDown(units[0], { key: 'ArrowDown' })).toBe(true);
      expect(document.activeElement).toBe(units[0]);
      act(() => units[0].setSelectionRange(20, 20)); // native Down reaches final row
      fireEvent.keyUp(units[0], { key: 'ArrowDown' });
      expect(fireEvent.keyDown(units[0], { key: 'ArrowDown' })).toBe(false);
      expect(document.activeElement).toBe(units[1]);
      expect(editor.onFlow).not.toHaveBeenCalled();
    } finally { measure.mockImplementation(original); }
  });

  it.each([
    { offset: 5, y: 0, nativeLineEndFrom: 4, direction: 'forward', granularity: 'lineboundary' },
    { offset: 5, y: 0, nativeColumnSeed: { offset: 21, steps: 1, direction: 'backward' as const }, direction: 'backward', granularity: 'line' },
  ])('B5 preserves native boundary affinity without publishing an edit ($granularity)', (caret) => {
    const editor = renderEditor('first\ntiny a long synthetic second line', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    const modify = vi.fn(() => units[1].setSelectionRange(caret.offset, caret.offset));
    const selection = vi.spyOn(document, 'getSelection').mockReturnValue({ modify } as unknown as Selection);
    vi.mocked(textareaBoundaryCaret).mockReturnValueOnce(caret);
    try {
      act(() => { units[0].focus(); units[0].setSelectionRange(4, 4); });
      expect(fireEvent.keyDown(units[0], { key: 'ArrowDown' })).toBe(false);
      expect(document.activeElement).toBe(units[1]);
      expect(units[1].selectionStart).toBe(caret.offset);
      expect(modify).toHaveBeenCalledExactlyOnceWith('move', caret.direction, caret.granularity);
      expect(editor.onFlow).not.toHaveBeenCalled();
    } finally { selection.mockRestore(); }
  });

  it('B5 does not leave focus on the column seed when native selection motion is unavailable', () => {
    const editor = renderEditor('first\ntiny a long synthetic second line', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    const selection = vi.spyOn(document, 'getSelection').mockReturnValue(null);
    vi.mocked(textareaBoundaryCaret).mockReturnValueOnce({ offset: 4, y: 0, nativeColumnSeed: { offset: 21, steps: 1, direction: 'backward' } });
    try {
      act(() => units[0].focus());
      fireEvent.keyDown(units[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(units[1]);
      expect(units[1].selectionStart).toBe(4);
      expect(editor.onFlow).not.toHaveBeenCalled();
    } finally { selection.mockRestore(); }
  });

  it('B5 skips a unit whose ancestor has no layout and respects parent keyboard handling', () => {
    const editor = renderEditor('first\nhidden\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    units[1].parentElement!.style.display = 'none';
    Object.defineProperty(units[1], 'checkVisibility', { value: () => false });
    act(() => { units[0].focus(); units[0].setSelectionRange(5, 5); });
    editor.onKeyDown.mockImplementationOnce(event => event.preventDefault());
    fireEvent.keyDown(units[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(units[0]);
    fireEvent.keyDown(units[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(units[2]);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B5 smoke 5: all composition guards keep all four arrows inside the unit', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    act(() => units[0].focus());
    fireEvent.compositionStart(units[0]);
    const boundaries = editor.onBoundary.mock.calls.length;
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      act(() => units[0].setSelectionRange(key === 'ArrowRight' ? 5 : 0, key === 'ArrowRight' ? 5 : 0));
      expect(fireEvent.keyDown(units[0], { key })).toBe(true);
      expect(document.activeElement).toBe(units[0]);
    }
    expect(editor.onBoundary).toHaveBeenCalledTimes(boundaries);
    expect(editor.onFlow).not.toHaveBeenCalled();
    fireEvent.compositionEnd(units[0]);
    for (const guard of [{ isComposing: true }, { keyCode: 229 }]) {
      expect(fireEvent.keyDown(units[0], { key: 'ArrowDown', ...guard })).toBe(true);
      expect(document.activeElement).toBe(units[0]);
    }
  });

  it('B5 leaves Ctrl/Meta/Alt arrows, single-unit selections and Home/End/Page keys native', () => {
    const editor = renderEditor('first\nsecond', true);
    act(() => { editor.textarea.focus(); editor.textarea.setSelectionRange(0, 0); });
    for (const key of ['Home', 'End', 'PageUp', 'PageDown']) {
      expect(fireEvent.keyDown(editor.textarea, { key })).toBe(true);
    }
    // Shift across a unit boundary is now owned by B6; the other modifiers stay native.
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      expect(fireEvent.keyDown(editor.textarea, { key: 'ArrowDown', [modifier]: true })).toBe(true);
    }
    act(() => editor.textarea.setSelectionRange(0, 3));
    expect(fireEvent.keyDown(editor.textarea, { key: 'ArrowDown' })).toBe(true);
    expect(document.activeElement).toBe(editor.textarea);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('B5 smoke 6: Enter, boundary Backspace and Tab retain structural behavior', () => {
    const editor = renderEditor('alpha');
    act(() => { editor.textarea.focus(); editor.textarea.setSelectionRange(2, 2); });
    fireEvent.keyDown(editor.textarea, { key: 'Enter' });
    let units = [...editor.container.querySelectorAll('textarea')];
    expect(editor.texts()).toEqual(['al', 'pha']);
    fireEvent.keyDown(units[1], { key: 'Tab' });
    expect(editor.onFlow.mock.lastCall![0].units[1].indent_level).toBe(1);
    fireEvent.keyDown(units[1], { key: 'Tab', shiftKey: true });
    expect(editor.onFlow.mock.lastCall![0].units[1].indent_level).toBe(0);
    act(() => units[1].setSelectionRange(0, 0));
    fireEvent.keyDown(units[1], { key: 'Backspace' });
    units = [...editor.container.querySelectorAll('textarea')];
    expect(editor.texts()).toEqual(['alpha']);
    expect(units[0].selectionStart).toBe(2);
  });

  it('smoke 4: Enter replaces the entire selected span and keeps the outside text', () => {
    const editor = renderEditor();
    editor.textarea.setSelectionRange(6, 12);
    fireEvent.keyDown(editor.textarea, { key: 'Enter' });
    expect(editor.texts()).toEqual(['alpha ', ' omega']);
  });

  it('smoke 4: structured multiline paste replaces the entire selected span', () => {
    const editor = renderEditor();
    editor.textarea.setSelectionRange(6, 12);
    fireEvent.paste(editor.textarea, { clipboardData: { getData: () => 'first\nsecond' } });
    expect(editor.texts()).toEqual(['alpha first', 'second', ' omega']);
  });

  it('smoke 3: composition confirmation never reaches slash or Enter splitting', () => {
    const editor = renderEditor('synthetic');
    fireEvent.compositionStart(editor.textarea);
    fireEvent.keyDown(editor.textarea, { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(editor.onKeyDown).not.toHaveBeenCalled();
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.texts()).toEqual(['synthetic']);
    fireEvent.compositionEnd(editor.textarea, { data: '字' });
  });

  it('smoke 3: composition remains open through updates and blur, then seals the complete input once', () => {
    const editor = renderEditor('');
    fireEvent.compositionStart(editor.textarea);
    fireEvent.change(editor.textarea, { target: { value: '中', selectionStart: 1, selectionEnd: 1 } });
    fireEvent.change(editor.textarea, { target: { value: '中文', selectionStart: 2, selectionEnd: 2 } });
    fireEvent.blur(editor.textarea);
    expect(editor.onBoundary.mock.calls.map(([reason]) => reason)).toEqual(['compositionStart']);
    expect(editor.onSave).not.toHaveBeenCalled();
    expect(editor.onFlow.mock.calls.map(([, edit]) => edit.isComposing)).toEqual([true, true]);
    fireEvent.compositionEnd(editor.textarea, { data: '中文' });
    fireEvent.change(editor.textarea, { target: { value: '中文', selectionStart: 2, selectionEnd: 2 } });
    expect(editor.onFlow).toHaveBeenCalledTimes(2);
    expect(editor.onBoundary.mock.calls.map(([reason]) => reason)).toEqual(['compositionStart', 'compositionEnd', 'blur']);
    expect(editor.onSave).toHaveBeenCalledTimes(1);
    expect(editor.onSave.mock.calls[0][2].units[0].text).toBe('中文');
  });

  it('reports the actual replacement selection before input and the resulting caret', () => {
    const editor = renderEditor();
    editor.textarea.setSelectionRange(6, 12);
    fireEvent(editor.textarea, new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: 'X' }));
    fireEvent.input(editor.textarea, { target: { value: 'alpha X omega', selectionStart: 7, selectionEnd: 7 }, inputType: 'insertText' });
    expect(editor.onFlow.mock.calls[0][1]).toEqual({
      unitId: 'tu-1', inputType: 'insertText', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: 'tu-1', start: 6, end: 12 },
      afterSelection: { unitId: 'tu-1', start: 7, end: 7 },
    });
    expect(editor.textarea.dataset.runtimeTextflowEditor).toBe('true');
  });

  it('publishes the complete composition value before sealing when final input is delivered later', () => {
    const editor = renderEditor('');
    fireEvent.compositionStart(editor.textarea);
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(editor.textarea, '完成');
    editor.textarea.setSelectionRange(2, 2);
    fireEvent.compositionEnd(editor.textarea, { data: '完成' });
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.onFlow.mock.calls[0][0].units[0].text).toBe('完成');
    expect(editor.onFlow.mock.calls[0][1].isComposing).toBe(true);
    expect(editor.onBoundary.mock.calls.map(([reason]) => reason)).toEqual(['compositionStart', 'compositionEnd']);
    fireEvent.input(editor.textarea, { target: { value: '完成', selectionStart: 2, selectionEnd: 2 }, inputType: 'insertFromComposition' });
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });

  it('keeps structured paste native during composition without splitting units', () => {
    const editor = renderEditor('synthetic');
    fireEvent.compositionStart(editor.textarea);
    fireEvent.paste(editor.textarea, { clipboardData: { getData: () => 'first\nsecond' } });
    fireEvent.keyDown(editor.textarea, { key: 'Tab' });
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(editor.texts()).toEqual(['synthetic']);
    fireEvent.compositionEnd(editor.textarea);
  });
});

describe('B6 cross-unit selection event boundaries', () => {
  const layers = (container: HTMLElement) => container.querySelectorAll('[data-textflow-selection-layer="true"]');
  const clipboardText = (textarea: HTMLTextAreaElement) => {
    const setData = vi.fn();
    fireEvent.copy(textarea, { clipboardData: { setData } });
    return setData.mock.lastCall?.[1] as string | undefined;
  };
  const focusAt = (textarea: HTMLTextAreaElement, offset: number) => {
    act(() => { textarea.focus(); textarea.setSelectionRange(offset, offset); });
  };

  it('extends and retracts Shift+Right into a forward native range without losing its anchor', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    act(() => { units[0].focus(); units[0].setSelectionRange(2, 5, 'forward'); });
    expect(fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(units[1]);
    expect(clipboardText(units[1])).toBe('rst\n');
    fireEvent.keyDown(units[1], { key: 'ArrowRight', shiftKey: true });
    expect(clipboardText(units[1])).toBe('rst\ns');
    fireEvent.keyDown(units[1], { key: 'ArrowLeft', shiftKey: true });
    expect(clipboardText(units[1])).toBe('rst\n');
    fireEvent.keyDown(units[1], { key: 'ArrowLeft', shiftKey: true });
    expect(document.activeElement).toBe(units[0]);
    expect([units[0].selectionStart, units[0].selectionEnd, units[0].selectionDirection]).toEqual([2, 5, 'forward']);
    expect(layers(editor.container)).toHaveLength(0);
    expect(clipboardText(units[0])).toBeUndefined();
    // Re-expanding must keep offset 2 as the anchor after the native hand-back.
    fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true });
    expect(clipboardText(units[1])).toBe('rst\n');
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('extends and retracts Shift+Left into a backward native range without reversing its anchor', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    act(() => { units[1].focus(); units[1].setSelectionRange(0, 3, 'backward'); });
    expect(fireEvent.keyDown(units[1], { key: 'ArrowLeft', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(units[0]);
    expect(clipboardText(units[0])).toBe('\nsec');
    fireEvent.keyDown(units[0], { key: 'ArrowLeft', shiftKey: true });
    expect(clipboardText(units[0])).toBe('t\nsec');
    fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true });
    expect(clipboardText(units[0])).toBe('\nsec');
    fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true });
    expect(document.activeElement).toBe(units[1]);
    expect([units[1].selectionStart, units[1].selectionEnd, units[1].selectionDirection]).toEqual([0, 3, 'backward']);
    expect(layers(editor.container)).toHaveLength(0);
    expect(clipboardText(units[1])).toBeUndefined();
    fireEvent.keyDown(units[1], { key: 'ArrowLeft', shiftKey: true });
    expect(clipboardText(units[0])).toBe('\nsec');
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it.each([
    { source: 0, anchor: 2, target: 2, offset: 3, expected: 'rst\nsecond\nthi' },
    { source: 2, anchor: 3, target: 0, offset: 1, expected: 'irst\nsecond\nthi' },
  ])('Shift+Click maps its point to the correct endpoint from unit $source to $target', ({ source, anchor, target, offset, expected }) => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[source], anchor);
    expect(fireEvent.mouseDown(units[target], { shiftKey: true, clientX: offset * 8, clientY: 12 })).toBe(false);
    expect(textareaCaretAtPoint).toHaveBeenLastCalledWith(units[target], offset * 8, 12);
    expect(document.activeElement).toBe(units[target]);
    expect(units[target].selectionStart).toBe(offset);
    expect(clipboardText(units[target])).toBe(expected);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('Shift+Click keeps the original anchor while moving the endpoint and contracting to one unit', () => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.mouseDown(units[2], { shiftKey: true, clientX: 24, clientY: 10 });
    fireEvent.mouseDown(units[1], { shiftKey: true, clientX: 8, clientY: 10 });
    expect(clipboardText(units[1])).toBe('rst\ns');
    fireEvent.mouseDown(units[0], { shiftKey: true, clientX: 8, clientY: 10 });
    expect([units[0].selectionStart, units[0].selectionEnd, units[0].selectionDirection]).toEqual([1, 2, 'backward']);
    expect(layers(editor.container)).toHaveLength(0);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it.each([
    { key: 'Escape', target: 1 },
    { key: 'ArrowLeft', target: 0 },
    { key: 'ArrowUp', target: 0 },
    { key: 'ArrowRight', target: 1 },
    { key: 'ArrowDown', target: 1 },
  ])('$key collapses the range to its semantic endpoint and stops intercepting copy', ({ key, target }) => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(clipboardText(units[1])).toBe('rst\nse');
    expect(fireEvent.keyDown(units[1], { key })).toBe(false);
    expect(document.activeElement).toBe(units[target]);
    expect([units[target].selectionStart, units[target].selectionEnd]).toEqual([2, 2]);
    expect(layers(editor.container)).toHaveLength(0);
    expect(clipboardText(units[target])).toBeUndefined();
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('ordinary mouse down clears the range before native click placement', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(layers(editor.container)).toHaveLength(2);
    expect(fireEvent.mouseDown(units[0], { clientX: 8, clientY: 10 })).toBe(true);
    focusAt(units[0], 1); // jsdom does not perform native mousedown caret placement.
    expect(layers(editor.container)).toHaveLength(0);
    expect(clipboardText(units[0])).toBeUndefined();
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('compositionStart first clears the range, then Shift arrows and Shift+Click cannot cross units', () => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(layers(editor.container)).toHaveLength(2);
    fireEvent.compositionStart(units[1]);
    expect(layers(editor.container)).toHaveLength(0);
    const boundaries = editor.onBoundary.mock.calls.length;
    const parentKeys = editor.onKeyDown.mock.calls.length;
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      const offset = key === 'ArrowRight' || key === 'ArrowDown' ? units[1].value.length : 0;
      act(() => units[1].setSelectionRange(offset, offset));
      expect(fireEvent.keyDown(units[1], { key, shiftKey: true })).toBe(true);
      expect(document.activeElement).toBe(units[1]);
      expect([units[1].selectionStart, units[1].selectionEnd]).toEqual([offset, offset]);
      expect(layers(editor.container)).toHaveLength(0);
    }
    expect(fireEvent.mouseDown(units[2], { shiftKey: true, clientX: 8, clientY: 10 })).toBe(false);
    expect(document.activeElement).toBe(units[1]);
    expect(editor.onBoundary).toHaveBeenCalledTimes(boundaries);
    expect(editor.onKeyDown).toHaveBeenCalledTimes(parentKeys);
    expect(editor.onFlow).not.toHaveBeenCalled();
    fireEvent.compositionEnd(units[1]);
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])('native IME guard %j preserves an already active range', (guard) => {
    const editor = renderEditor('first\nsecond\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    const boundaries = editor.onBoundary.mock.calls.length;
    const parentKeys = editor.onKeyDown.mock.calls.length;
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(fireEvent.keyDown(units[1], { key, shiftKey: true, ...guard })).toBe(true);
      expect(document.activeElement).toBe(units[1]);
      expect([units[1].selectionStart, units[1].selectionEnd]).toEqual([2, 2]);
      expect(clipboardText(units[1])).toBe('rst\nse');
      expect(layers(editor.container)).toHaveLength(2);
    }
    expect(editor.onBoundary).toHaveBeenCalledTimes(boundaries);
    expect(editor.onKeyDown).toHaveBeenCalledTimes(parentKeys);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])('native IME guard %j cannot initiate a Shift range across a boundary', (guard) => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], units[0].value.length);
    expect(fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true, ...guard })).toBe(true);
    expect(fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true, ...guard })).toBe(true);
    expect(document.activeElement).toBe(units[0]);
    expect(layers(editor.container)).toHaveLength(0);
    expect(editor.onKeyDown).not.toHaveBeenCalled();
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('%s+Shift+Arrow clears an old flow range and returns control to the browser', (modifier) => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(clipboardText(units[1])).toBe('rst\nse');
    expect(fireEvent.keyDown(units[1], { key: 'ArrowDown', shiftKey: true, [modifier]: true })).toBe(true);
    expect(layers(editor.container)).toHaveLength(0);
    expect(clipboardText(units[1])).toBeUndefined();
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('Shift arrows within one unit preserve native selection ownership and direction', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    const measure = vi.mocked(measureTextareaNavigation);
    const original = measure.getMockImplementation()!;
    measure.mockImplementation((_node, offset) => ({ x: offset * 8, y: 20, lineHeight: 20, atFirstLine: false, atLastLine: false }));
    try {
      act(() => { units[0].focus(); units[0].setSelectionRange(1, 3, 'backward'); });
      for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
        expect(fireEvent.keyDown(units[0], { key, shiftKey: true })).toBe(true);
        expect(document.activeElement).toBe(units[0]);
        // Native motion is not emulated by jsdom; the handler must leave it alone.
        expect([units[0].selectionStart, units[0].selectionEnd, units[0].selectionDirection]).toEqual([1, 3, 'backward']);
        expect(layers(editor.container)).toHaveLength(0);
      }
      expect(editor.onFlow).not.toHaveBeenCalled();
    } finally { measure.mockImplementation(original); }
  });

  it('includes each separator when Shift+Right traverses an empty unit', () => {
    const editor = renderEditor('first\n\nthird', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], units[0].value.length);
    fireEvent.keyDown(units[0], { key: 'ArrowRight', shiftKey: true });
    expect(document.activeElement).toBe(units[1]);
    expect(clipboardText(units[1])).toBe('\n');
    fireEvent.keyDown(units[1], { key: 'ArrowRight', shiftKey: true });
    expect(document.activeElement).toBe(units[2]);
    expect(clipboardText(units[2])).toBe('\n\n');
    expect(layers(editor.container)).toHaveLength(3);
    expect(editor.texts()).toEqual(['first', '', 'third']);
    expect(editor.onFlow).not.toHaveBeenCalled();
  });

  it('a noncancelable beforeinput defers cross-unit replacement to exactly one input fallback', () => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    const before = new InputEvent('beforeinput', { bubbles: true, cancelable: false, inputType: 'insertText', data: 'X' });
    fireEvent(units[1], before);
    expect(before.defaultPrevented).toBe(false);
    expect(editor.onFlow).not.toHaveBeenCalled();
    expect(clipboardText(units[1])).toBe('rst\nse');
    fireEvent.input(units[1], { target: { value: 'seXcond', selectionStart: 3, selectionEnd: 3 }, inputType: 'insertText', data: 'X' });
    expect(editor.texts()).toEqual(['fiXcond']);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.onFlow.mock.calls[0][1]).toMatchObject({ kind: 'structural', inputType: 'replaceFlowSelection' });
    expect(editor.onFlow.mock.calls[0][0].units[0].id).toBe('tu-1');
    const merged = editor.container.querySelector('textarea')!;
    expect([merged.selectionStart, merged.selectionEnd]).toEqual([3, 3]);
    expect(layers(editor.container)).toHaveLength(0);
    fireEvent.input(merged, { target: { value: 'fiXcond', selectionStart: 3, selectionEnd: 3 }, inputType: 'insertText', data: 'X' });
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
  });

  it.each(['X', 'ONE\nTWO'])('paste replaces the complete flow range once with %j', (pasted) => {
    const editor = renderEditor('first\nsecond', true);
    const units = [...editor.container.querySelectorAll('textarea')];
    focusAt(units[0], 2);
    fireEvent.keyDown(units[0], { key: 'ArrowDown', shiftKey: true });
    expect(fireEvent.paste(units[1], { clipboardData: { getData: () => pasted } })).toBe(false);
    expect(editor.texts()).toEqual([`fi${pasted}cond`]);
    expect(editor.onFlow).toHaveBeenCalledTimes(1);
    expect(editor.onFlow.mock.calls[0][1]).toMatchObject({ kind: 'structural', inputType: 'replaceFlowSelection' });
    expect(editor.onFlow.mock.calls[0][0].units.map((unit: { id: string }) => unit.id)).toEqual(['tu-1']);
    const merged = editor.container.querySelector('textarea')!;
    expect([merged.selectionStart, merged.selectionEnd]).toEqual([2 + pasted.length, 2 + pasted.length]);
    expect(layers(editor.container)).toHaveLength(0);
  });
});
