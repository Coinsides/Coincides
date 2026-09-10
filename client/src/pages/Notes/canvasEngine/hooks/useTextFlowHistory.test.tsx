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

function renderHistoryEditor(initialText = 'original', options: { legacy?: boolean } = {}) {
  const initialFlow = createTextBlockContentV1(initialText);
  const block: NoteBlock = {
    id: 'synthetic-block', placement_id: 'synthetic-placement', display_overrides_json: {},
    block_type: 'paragraph', title: null, content_json: options.legacy ? {} : { [TEXT_FLOW_CONTENT_KEY]: initialFlow },
    plain_text: initialText, metadata: {}, order_index: 0, source_references: [],
  };
  const boardRanges = createBoardTextRangeEditSession('synthetic-note', async (_note, ranges) => ranges);
  boardRanges.hydrate([]);
  const savedTexts: string[] = [];
  const saveBlock = vi.fn(async (_block: NoteBlock, text: string): Promise<BlockSaveOutcome> => {
    savedTexts.push(text);
    return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
  });
  const saveLayout = vi.fn(async () => true);
  let current!: {
    history: ReturnType<typeof usePlacementHistory>;
    textHistory: ReturnType<typeof useTextFlowHistory>;
    move: (x: number) => void;
    layout: BlockBoxLayout;
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
    current = {
      history, textHistory, layout,
      move: (x) => {
        const after = { ...layout, x };
        history.pushLayoutHistory({ [block.id]: layout }, { [block.id]: after });
        setLayout(after);
      },
    };
    const flow = drafts.blockTextFlowDrafts[block.id] ?? (options.legacy ? null : initialFlow);
    return <TextBlockProjection blockId={block.id} text={flow ? plainTextFromTextFlow(flow) : initialText} textFlow={flow}
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
  const textarea = () => view.container.querySelector('textarea')!;
  const focus = () => { act(() => textarea().focus()); };
  const input = (value: string, beforeStart: number, beforeEnd = beforeStart, inputType = 'insertText', composing = false) => {
    const node = textarea();
    focus();
    node.setSelectionRange(beforeStart, beforeEnd);
    fireEvent(node, new InputEvent('beforeinput', { bubbles: true, inputType, isComposing: composing }));
    const caret = beforeStart + value.length - node.value.length + beforeEnd - beforeStart;
    fireEvent.input(node, { target: { value, selectionStart: caret, selectionEnd: caret }, inputType, isComposing: composing });
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
  return { ...view, current: () => current, savedTexts, saveBlock, saveLayout, textarea, focus, input, idle, key };
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
