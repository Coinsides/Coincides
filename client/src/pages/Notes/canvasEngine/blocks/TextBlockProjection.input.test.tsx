import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTextBlockContentV1 } from '../textFlowService';
import { TextBlockProjection } from './TextBlockProjection';

afterEach(cleanup);

function renderEditor(initialText = 'alpha SELECT omega') {
  const onFlow = vi.fn();
  const onKeyDown = vi.fn();
  const onBoundary = vi.fn();
  const onSave = vi.fn().mockResolvedValue({ status: 'saved' });
  function Editor() {
    const [flow, setFlow] = useState(() => createTextBlockContentV1(initialText));
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
