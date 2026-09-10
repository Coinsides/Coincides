import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextBlockProjection } from '../blocks/TextBlockProjection';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';

const plainTextFromTextFlow = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');

function renderHistoryEditor(initialText = 'original', options: { legacy?: boolean; flow?: TextBlockContentV1 } = {}) {
  const initialFlow = options.flow ?? createTextBlockContentV1(initialText);
  const initialPlainText = options.flow ? plainTextFromTextFlow(options.flow) : initialText;
  const block: NoteBlock = {
    id: 'synthetic-block', placement_id: 'synthetic-placement', display_overrides_json: {},
    block_type: 'paragraph', title: null, content_json: options.legacy ? {} : { [TEXT_FLOW_CONTENT_KEY]: initialFlow },
    plain_text: initialPlainText, metadata: {}, order_index: 0, source_references: [],
  };
  const boardRanges = createBoardTextRangeEditSession('synthetic-note', async (_note, ranges) => ranges);
  boardRanges.hydrate([]);
  const savedTexts: string[] = [];
  const savedFlows: TextBlockContentV1[] = [];
  const saveBlock = vi.fn(async (_block: NoteBlock, text: string, saveOptions?: { textFlow?: TextBlockContentV1 }): Promise<BlockSaveOutcome> => {
    savedTexts.push(text);
    if (saveOptions?.textFlow) savedFlows.push(structuredClone(saveOptions.textFlow));
    return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
  });
  const saveLayout = vi.fn(async () => true);
  let current!: {
    history: ReturnType<typeof usePlacementHistory>;
    textHistory: ReturnType<typeof useTextFlowHistory>;
    move: (x: number) => void;
    layout: BlockBoxLayout;
    flow: TextBlockContentV1 | null;
  };
  function Editor() {
    const drafts = useBlockDraftAuthority();
    const [annotations, setAnnotations] = useState<AnnotationTruthV1[]>([]);
    const annotationsRef = useRef(annotations);
    annotationsRef.current = annotations;
    const hostRef = useRef<TextFlowHistoryHost | null>(null);
    const [layout, setLayout] = useState<BlockBoxLayout>({ x: 0, y: 0, width: 200, height: 40 });
    const textHistory = useTextFlowHistory({
      noteId: 'synthetic-note', generation: 1, blocks: [block],
      annotationTruths: annotations,
      readAnnotationTruths: () => annotationsRef.current,
      setAnnotationTruthsSnapshot: (next) => { annotationsRef.current = next; setAnnotations(next); },
      blockTextFlowDrafts: drafts.blockTextFlowDrafts,
      setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts,
      setBlockTextDrafts: drafts.setBlockTextDrafts,
      captureBoardTextRanges: boardRanges.snapshot,
      restoreBoardTextRanges: boardRanges.restore,
      rebaseBoardTextRanges: boardRanges.rebase,
      saveBlock,
      saveAnnotationTruthsOutcome: async () => true,
      history: hostRef,
    });
    const history = usePlacementHistory({
      noteId: 'synthetic-note', generation: 1,
      beforeHistoryBoundary: () => textHistory.boundary(),
      applyLayoutDrafts: (next) => { if (next[block.id]) setLayout(next[block.id]); },
      persistLayoutSnapshot: saveLayout,
    });
    hostRef.current = history;
    const flow = drafts.blockTextFlowDrafts[block.id] ?? (options.legacy ? null : initialFlow);
    current = {
      history, textHistory, layout, flow,
      move: (x) => {
        const after = { ...layout, x };
        history.pushLayoutHistory({ [block.id]: layout }, { [block.id]: after });
        setLayout(after);
      },
    };
    return <TextBlockProjection blockId={block.id} text={flow ? plainTextFromTextFlow(flow) : initialPlainText} textFlow={flow}
      presentationKind="paragraph" readOnly={textHistory.replaying || history.historyReplaying} annotations={annotations} selectedAnnotationIds={[]}
      showLabelOverlay={false} textareaRef={null} onFocused={vi.fn()} onAnnotationSelect={vi.fn()}
      onAnnotationContextMenu={vi.fn()} onTextUnitSelection={vi.fn()} onTextUnitContextMenu={vi.fn()}
      onTextChange={(text) => { if (!textHistory.isReplaying()) drafts.setBlockTextDrafts((next) => ({ ...next, [block.id]: text })); }}
      onTextFlowChange={(next, metadata, previousTextFlow) => { void textHistory.applyEdit(block, next, { metadata, previousTextFlow }); }}
      onTextEditBoundary={textHistory.boundary}
      onSave={async (_silent, _fields, latestFlow) => {
        const savedFlow = latestFlow ?? flow ?? initialFlow;
        return textHistory.saveBlock(block, plainTextFromTextFlow(savedFlow), { silent: true, textFlow: savedFlow });
      }} onKeyDown={vi.fn()} />;
  }
  const view = render(<Editor />);
  const textarea = (unitIndex = 0) => view.container.querySelectorAll('textarea')[unitIndex]!;
  const focus = (unitIndex = 0) => { act(() => textarea(unitIndex).focus()); };
  const inputAt = (unitIndex: number, value: string, beforeStart: number, beforeEnd = beforeStart, inputType = 'insertText', composing = false) => {
    const node = textarea(unitIndex);
    focus(unitIndex);
    node.setSelectionRange(beforeStart, beforeEnd);
    fireEvent(node, new InputEvent('beforeinput', { bubbles: true, inputType, isComposing: composing }));
    const caret = beforeStart + value.length - node.value.length + beforeEnd - beforeStart;
    fireEvent.input(node, { target: { value, selectionStart: caret, selectionEnd: caret }, inputType, isComposing: composing });
  };
  const input = (value: string, beforeStart: number, beforeEnd = beforeStart, inputType = 'insertText', composing = false) => {
    inputAt(0, value, beforeStart, beforeEnd, inputType, composing);
  };
  const idle = async () => { await act(async () => { await current.history.whenHistoryIdle(); }); };
  const key = async (keyName: string, target: HTMLElement | Window = textarea()) => {
    let allowed = true;
    await act(async () => {
      allowed = fireEvent.keyDown(target, { key: keyName, ctrlKey: true });
      await current.history.whenHistoryIdle();
    });
    return allowed;
  };
  return { ...view, current: () => current, savedTexts, savedFlows, saveBlock, saveLayout, textarea, focus, input, inputAt, idle, key };
}

describe('B4 TextFlow and application history integration (synthetic memory)', () => {
  it('keeps managed editing closed until a layout replay save finishes', async () => {
    const editor = renderHistoryEditor();
    act(() => editor.current().move(20));
    let finish!: (saved: boolean) => void;
    editor.saveLayout.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    let replay!: Promise<boolean>;
    await act(async () => { replay = editor.current().history.undoRuntimeHistory(); await Promise.resolve(); });
    expect(editor.textarea().readOnly).toBe(true);
    expect(editor.current().textHistory.boundary()).toBe(false);
    await act(async () => { finish(true); expect(await replay).toBe(true); });
    expect(editor.textarea().readOnly).toBe(false);
  });
  it('smoke 1: typing then blur then application Ctrl+Z restores the original text', async () => {
    const editor = renderHistoryEditor();
    editor.input('original typed', 8);
    expect(editor.textarea().value).toBe('original typed');
    fireEvent.blur(editor.textarea());
    await waitFor(() => expect(editor.savedTexts).toContain('original typed'));
    await editor.key('z', window);
    expect(editor.textarea().value).toBe('original');
  });

  it('smoke 2: real typing, layout and typing undo and redo in their original order', async () => {
    const editor = renderHistoryEditor('a');
    editor.input('ab', 1);
    act(() => editor.current().move(20));
    editor.input('abc', 2);
    expect(await editor.key('z')).toBe(false);
    expect(editor.textarea().value).toBe('ab');
    expect(editor.current().layout.x).toBe(20);
    await editor.key('z');
    expect(editor.textarea().value).toBe('ab');
    expect(editor.current().layout.x).toBe(0);
    await editor.key('z');
    expect(editor.textarea().value).toBe('a');
    await editor.key('y');
    expect(editor.textarea().value).toBe('ab');
    await editor.key('y');
    expect(editor.current().layout.x).toBe(20);
    await editor.key('y');
    expect(editor.textarea().value).toBe('abc');
  });

  it('smoke 3: IME stays one unsealed input until compositionend and undoes the complete phrase', async () => {
    const editor = renderHistoryEditor('');
    editor.focus();
    fireEvent.compositionStart(editor.textarea());
    editor.input('中', 0, 0, 'insertCompositionText', true);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });
    fireEvent.keyDown(editor.textarea(), { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(editor.container.querySelectorAll('textarea')).toHaveLength(1);
    editor.input('中文', 0, 1, 'insertCompositionText', true);
    expect(editor.savedTexts).toEqual([]);
    fireEvent.compositionEnd(editor.textarea(), { data: '中文' });
    await editor.idle();
    expect(editor.savedTexts).toEqual(['中文']);
    await editor.key('z');
    expect(editor.textarea().value).toBe('');
    expect(editor.textarea().selectionStart).toBe(0);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });
  });

  it('selection movement closes typing and each undo restores its recorded caret', async () => {
    const editor = renderHistoryEditor('ab');
    editor.input('abc', 2);
    editor.textarea().setSelectionRange(1, 1);
    fireEvent.select(editor.textarea());
    editor.input('aXbc', 1);
    await editor.key('z');
    expect(editor.textarea().value).toBe('abc');
    expect(editor.textarea().selectionStart).toBe(1);
    expect(editor.textarea().selectionEnd).toBe(1);
    await editor.key('z');
    expect(editor.textarea().value).toBe('ab');
    expect(editor.textarea().selectionStart).toBe(2);
    expect(editor.textarea().selectionEnd).toBe(2);
  });

  it('keeps the editor read-only during delayed replay and restores its selection after persistence', async () => {
    const editor = renderHistoryEditor('alpha');
    editor.input('alpha beta', 5);
    fireEvent.blur(editor.textarea());
    await editor.idle();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    editor.saveBlock.mockImplementationOnce(async (block) => {
      await gate;
      return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
    });
    let replay!: Promise<boolean>;
    await act(async () => {
      replay = editor.current().history.undoRuntimeHistory();
      await Promise.resolve();
    });
    expect(editor.textarea().readOnly).toBe(true);
    await act(async () => { finish(); expect(await replay).toBe(true); });
    expect(editor.textarea().readOnly).toBe(false);
    expect(editor.textarea().value).toBe('alpha');
    expect(editor.textarea().selectionStart).toBe(5);
    expect(editor.textarea().selectionEnd).toBe(5);
  });

  it('smoke 4: replacing a selection with Enter is a separate reversible structural entry', async () => {
    const editor = renderHistoryEditor('alpha SELECT omega');
    editor.focus();
    editor.textarea().setSelectionRange(6, 12);
    fireEvent.keyDown(editor.textarea(), { key: 'Enter' });
    await editor.idle();
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['alpha ', ' omega']);
    await editor.key('z');
    expect(editor.container.querySelectorAll('textarea')).toHaveLength(1);
    expect(editor.textarea().value).toBe('alpha SELECT omega');
    expect(editor.textarea().dataset.textUnitId).toBe('tu-1');
    expect(editor.textarea().selectionStart).toBe(6);
    expect(editor.textarea().selectionEnd).toBe(12);
    await editor.key('y');
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['alpha ', ' omega']);
  });

  it('preserves the exact projected unit identities when undoing the first legacy multiline edit', async () => {
    const editor = renderHistoryEditor('alpha\nbeta', { legacy: true });
    const units = () => [...editor.container.querySelectorAll('textarea')].map((node) => ({
      id: node.dataset.textUnitId, text: node.value,
    }));
    const before = units();
    expect(before).toEqual([{ id: 'tu-1', text: 'alpha' }, { id: 'tu-2', text: 'beta' }]);
    editor.input('alpha X', 5);
    expect(units()).toEqual([{ id: 'tu-1', text: 'alpha X' }, { id: 'tu-2', text: 'beta' }]);
    await editor.key('z');
    expect(units()).toEqual(before);
    expect(editor.textarea().selectionStart).toBe(5);
    await editor.key('y');
    expect(units()).toEqual([{ id: 'tu-1', text: 'alpha X' }, { id: 'tu-2', text: 'beta' }]);
  });
});

describe('B5 smoke 6: cursor traversal preserves B4 history (synthetic memory)', () => {
  function renderUnits(texts: string[]) {
    const flow = createTextBlockContentV1('');
    flow.units = texts.map((text, index) => ({
      ...createTextBlockContentV1(text).units[0], id: `b5-unit-${index + 1}`, order_index: index,
    }));
    const editor = renderHistoryEditor('', { flow });
    const units = () => [...editor.container.querySelectorAll('textarea')].map((node) => ({
      id: node.dataset.textUnitId, text: node.value,
    }));
    const expectCaret = (unitIndex: number, caret: number) => {
      const node = editor.textarea(unitIndex);
      expect(document.activeElement).toBe(node);
      expect(node.selectionStart).toBe(caret);
      expect(node.selectionEnd).toBe(caret);
    };
    const arrow = async (key: 'ArrowLeft' | 'ArrowRight') => {
      await act(async () => {
        fireEvent.keyDown(document.activeElement!, { key });
        fireEvent.keyUp(document.activeElement!, { key });
        await editor.current().history.whenHistoryIdle();
      });
    };
    return { ...editor, units, expectCaret, arrow };
  }

  it.each([2, 3])('leaves undo and redo empty after a pure %i-unit left/right round trip', async (count) => {
    const editor = renderUnits(count === 2 ? ['a', 'c'] : ['a', '', 'c']);
    const before = editor.units();
    editor.focus();
    editor.textarea().setSelectionRange(1, 1);
    for (let index = 1; index < count; index += 1) {
      await editor.arrow('ArrowRight');
      editor.expectCaret(index, 0);
    }
    for (let index = count - 2; index >= 0; index -= 1) {
      await editor.arrow('ArrowLeft');
      editor.expectCaret(index, index === 0 ? 1 : 0);
    }
    expect(editor.units()).toEqual(before);
    await act(async () => {
      expect(await editor.current().history.undoRuntimeHistory()).toBe(false);
      expect(await editor.current().history.redoRuntimeHistory()).toBe(false);
    });
    expect(editor.units()).toEqual(before);
  });

  it('seals A typing before traversing to B and replays exactly two edits with their unit identities and carets', async () => {
    const editor = renderUnits(['a', 'b']);
    const expectTexts = (a: string, b: string) => expect(editor.units()).toEqual([
      { id: 'b5-unit-1', text: a }, { id: 'b5-unit-2', text: b },
    ]);
    editor.inputAt(0, 'aX', 1);
    await editor.arrow('ArrowRight');
    editor.expectCaret(1, 0);
    editor.inputAt(1, 'Yb', 0);
    expectTexts('aX', 'Yb');

    await editor.key('z', window);
    expectTexts('aX', 'b');
    editor.expectCaret(1, 0);
    await editor.key('z', window);
    expectTexts('a', 'b');
    editor.expectCaret(0, 1);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });

    await editor.key('y', window);
    expectTexts('aX', 'b');
    editor.expectCaret(0, 2);
    await editor.key('y', window);
    expectTexts('aX', 'Yb');
    editor.expectCaret(1, 1);
    await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });
  });

  it('keeps typing groups separate after traversing away and back to the same unit and caret', async () => {
    const editor = renderUnits(['a', 'b']);
    const expectTexts = (a: string) => expect(editor.units()).toEqual([
      { id: 'b5-unit-1', text: a }, { id: 'b5-unit-2', text: 'b' },
    ]);
    editor.inputAt(0, 'aX', 1);
    await editor.arrow('ArrowRight');
    editor.expectCaret(1, 0);
    await editor.arrow('ArrowLeft');
    editor.expectCaret(0, 2);
    editor.inputAt(0, 'aXY', 2);

    await editor.key('z', window);
    expectTexts('aX');
    editor.expectCaret(0, 2);
    await editor.key('z', window);
    expectTexts('a');
    editor.expectCaret(0, 1);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });

    await editor.key('y', window);
    expectTexts('aX');
    editor.expectCaret(0, 2);
    await editor.key('y', window);
    expectTexts('aXY');
    editor.expectCaret(0, 3);
    await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });
  });
});

describe('B6 smokes 2 and 3: cross-unit edits retain B4 history (synthetic memory)', () => {
  function renderCrossUnitEditor() {
    const flow: TextBlockContentV1 = {
      ...createTextBlockContentV1(''),
      metadata: { locale: 'en', nested: { preserved: true } },
      units: [
        { ...createTextBlockContentV1('alpha').units[0], id: 'b6-first', writing_role: 'todo_item',
          indent_level: 1, order_index: 0, metadata: { checked: true, origin: { label: 'first' } } },
        { ...createTextBlockContentV1('beta').units[0], id: 'b6-middle', writing_role: 'heading',
          indent_level: 2, order_index: 1, metadata: { level: 2, origin: { label: 'middle' } } },
        { ...createTextBlockContentV1('gamma').units[0], id: 'b6-last', writing_role: 'quote',
          indent_level: 0, order_index: 2, metadata: { origin: { label: 'last' } } },
      ],
      inline_structures: [{
        id: 'b6-inline', semantic_kind: 'inline_code', parent_text_unit_id: 'b6-middle',
        anchor_text: 'et', anchor_range: { start: 1, end: 3 },
        field_values: { language: 'text' }, metadata: { retained: { yes: true } }, status: 'active',
      }],
    };
    const before = structuredClone(flow);
    const editor = renderHistoryEditor('', { flow });
    const selectAcross = async () => {
      editor.focus();
      editor.textarea().setSelectionRange(2, 5, 'forward');
      // Cross alpha -> beta, traverse all of beta, then select the first two letters of gamma.
      for (let step = 0; step < 8; step += 1) {
        await act(async () => {
          expect(fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', shiftKey: true })).toBe(false);
          fireEvent.keyUp(document.activeElement!, { key: 'ArrowRight', shiftKey: true });
        });
      }
      expect(document.activeElement).toBe(editor.textarea(2));
      expect(editor.textarea(2).selectionStart).toBe(2);
      expect(editor.textarea(2).selectionEnd).toBe(2);
      expect(editor.current().flow).toEqual(before);
      await editor.idle();
      // B5 may save the unchanged flow on a unit blur. These saves do not create history entries.
      for (const saved of editor.savedFlows) expect(saved).toEqual(before);
      expect(editor.savedTexts).toEqual(editor.savedFlows.map(plainTextFromTextFlow));
      await act(async () => {
        expect(await editor.current().history.undoRuntimeHistory()).toBe(false);
        expect(await editor.current().history.redoRuntimeHistory()).toBe(false);
      });
      // Reset observation buffers only; the live editor and history remain untouched.
      editor.savedFlows.length = 0;
      editor.savedTexts.length = 0;
    };
    const assertReplayWithFollowingTyping = async (inserted: string) => {
      const mergedText = `al${inserted}mma`;
      const after = { ...before, units: [{ ...before.units[0], text: mergedText }] };
      const afterTyping = { ...before, units: [{ ...before.units[0], text: `al${inserted}Ymma` }] };
      await editor.idle();
      expect(editor.current().flow).toEqual(after);
      expect(editor.textarea().dataset.textUnitId).toBe('b6-first');
      expect(editor.textarea().selectionStart).toBe(2 + inserted.length);
      expect(editor.savedFlows).toEqual([after]);

      editor.inputAt(0, afterTyping.units[0].text, 2 + inserted.length);
      expect(editor.current().flow).toEqual(afterTyping);
      await editor.key('z', window);
      expect(editor.current().flow).toEqual(after);
      expect(editor.textarea().selectionStart).toBe(2 + inserted.length);
      await editor.key('z', window);
      expect(editor.current().flow).toEqual(before);
      expect([...editor.container.querySelectorAll('textarea')].map((node) => node.dataset.textUnitId))
        .toEqual(['b6-first', 'b6-middle', 'b6-last']);
      expect(editor.textarea().selectionStart).toBe(2);
      await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });

      await editor.key('y', window);
      expect(editor.current().flow).toEqual(after);
      await editor.key('y', window);
      expect(editor.current().flow).toEqual(afterTyping);
      await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });
      expect(editor.savedFlows).toEqual([after, afterTyping, after, before, after, afterTyping]);
      expect(editor.savedTexts).toEqual(editor.savedFlows.map(plainTextFromTextFlow));
      expect(flow).toEqual(before);
    };
    return { ...editor, selectAcross, assertReplayWithFollowingTyping };
  }

  it('smoke 2: native beforeinput replaces a cross-unit range in one independent entry', async () => {
    const editor = renderCrossUnitEditor();
    await editor.selectAcross();
    const input = new InputEvent('beforeinput', {
      bubbles: true, cancelable: true, inputType: 'insertText', data: 'X',
    });
    expect(fireEvent(document.activeElement!, input)).toBe(false);
    await editor.assertReplayWithFollowingTyping('X');
  });

  it.each(['Delete', 'Backspace'])('smoke 3: %s merges a cross-unit range and restores every field on replay', async (key) => {
    const editor = renderCrossUnitEditor();
    await editor.selectAcross();
    expect(fireEvent.keyDown(document.activeElement!, { key })).toBe(false);
    await editor.assertReplayWithFollowingTyping('');
  });

  it('smoke 3: cut copies unit separators and records only the deletion as an independent entry', async () => {
    const editor = renderCrossUnitEditor();
    await editor.selectAcross();
    const setData = vi.fn();
    expect(fireEvent.cut(document.activeElement!, { clipboardData: { setData } })).toBe(false);
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('text/plain', 'pha\nbeta\nga');
    await editor.assertReplayWithFollowingTyping('');
  });
});
