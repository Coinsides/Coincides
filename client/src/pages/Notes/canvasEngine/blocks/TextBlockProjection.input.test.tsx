import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTextBlockContentV1 } from '../textFlowService';
import { TextBlockProjection } from './TextBlockProjection';
import { measureTextareaNavigation, textareaBoundaryCaret } from '../textareaNavigation';

// jsdom has no line layout. Native wrapping and visual columns are also checked
// in the real-browser synthetic fixture; these tests exercise event routing.
vi.mock('../textareaNavigation', () => ({
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({
    x: offset * 8, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: true,
  })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({ offset: Math.min(node.value.length, Math.round(x / 8)), y: 0 })),
}));

afterEach(cleanup);

function renderEditor(initialText = 'alpha SELECT omega', separateUnits = false) {
  const onFlow = vi.fn();
  const onKeyDown = vi.fn();
  const onBoundary = vi.fn();
  const onSave = vi.fn().mockResolvedValue({ status: 'saved' });
  function Editor() {
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
      onTextUnitSelection={vi.fn()}
      onTextUnitContextMenu={vi.fn()}
      onTextChange={vi.fn()}
      onTextFlowChange={(next, edit) => { onFlow(next, edit); setFlow(next); }}
      onTextEditBoundary={onBoundary}
      onSave={onSave}
      onKeyDown={onKeyDown}
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

  it('B5 leaves modifier arrows, selections and Home/End/Page keys native', () => {
    const editor = renderEditor('first\nsecond', true);
    act(() => { editor.textarea.focus(); editor.textarea.setSelectionRange(0, 0); });
    for (const key of ['Home', 'End', 'PageUp', 'PageDown']) {
      expect(fireEvent.keyDown(editor.textarea, { key })).toBe(true);
    }
    for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey', 'altKey']) {
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
