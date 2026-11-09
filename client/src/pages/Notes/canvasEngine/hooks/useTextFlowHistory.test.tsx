import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { TextBlockProjection } from '../blocks/TextBlockProjection';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';
import { IDLE_SAVE_MS, useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { readUnplacedWords } from '../structureTypingBuffer';
import { splitTextUnitForEnter } from '../textUnitEditorService';
import { mergeTypedText } from './useHeadingStructureController';

const plainTextFromTextFlow = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');

function renderHistoryEditor(initialText = 'original', options: {
  legacy?: boolean; flow?: TextBlockContentV1;
  annotations?: AnnotationTruthV1[]; boardRanges?: BoardTextRangeV1[];
  saveFails?: () => boolean; canSaveWhileTyping?: () => boolean; receiptKey?: string; holdSave?: () => boolean;
  saveRefused?: () => boolean;
} = {}) {
  const initialFlow = options.flow ?? createTextBlockContentV1(initialText);
  const initialPlainText = options.flow ? plainTextFromTextFlow(options.flow) : initialText;
  const block: NoteBlock = {
    id: 'synthetic-block', placement_id: 'synthetic-placement', display_overrides_json: {},
    block_type: 'paragraph', title: null, content_json: options.legacy ? {} : { [TEXT_FLOW_CONTENT_KEY]: initialFlow },
    plain_text: initialPlainText, metadata: {}, order_index: 0, source_references: [],
  };
  const boardRanges = createBoardTextRangeEditSession('synthetic-note', async (_note, ranges) => ranges);
  boardRanges.hydrate(options.boardRanges ?? []);
  const savedTexts: string[] = [];
  const heldSaves: (() => void)[] = [];
  const savedFlows: TextBlockContentV1[] = [];
  const saveBlock = vi.fn(async (_block: NoteBlock, text: string, saveOptions?: { textFlow?: TextBlockContentV1 }): Promise<BlockSaveOutcome> => {
    savedTexts.push(text);
    if (saveOptions?.textFlow) savedFlows.push(structuredClone(saveOptions.textFlow));
    if (options.holdSave?.()) await new Promise<void>((resolve) => { heldSaves.push(resolve); });
    // Refused before the adapter writes a receipt (A-20 r3 M5: the save is never sent).
    if (options.saveRefused?.()) return { status: 'rejected', block: null, recoveryReceipt: null, reconciliation: 'not_attempted',
      durableState: 'not_checked', reason: 'request_failed', staleEpoch: false };
    // A save that was sent and failed: the adapter wrote its recovery receipt before sending.
    if (options.saveFails?.()) return { status: 'rejected', block: null,
      recoveryReceipt: { recoveryKey: options.receiptKey ?? 'harness-receipt' } as never, reconciliation: 'not_attempted',
      durableState: 'not_checked', reason: 'request_failed', staleEpoch: false };
    return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
  });
  const onSaveFailure = vi.fn();
  const saveLayout = vi.fn(async () => true);
  let current!: {
    history: ReturnType<typeof usePlacementHistory>;
    textHistory: ReturnType<typeof useTextFlowHistory>;
    move: (x: number) => void;
    layout: BlockBoxLayout;
    flow: TextBlockContentV1 | null;
    annotations: AnnotationTruthV1[];
  };
  function Editor() {
    const drafts = useBlockDraftAuthority();
    const [annotations, setAnnotations] = useState<AnnotationTruthV1[]>(options.annotations ?? []);
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
      onSaveFailure,
      canSaveWhileTyping: options.canSaveWhileTyping,
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
      history, textHistory, layout, flow, annotations,
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
  return { ...view, current: () => current, savedTexts, savedFlows, saveBlock, saveLayout, textarea, focus, input, inputAt, idle, key, boardRanges, onSaveFailure, heldSaves };
}

describe('B10 pointer reorder through the existing runtime history', () => {
  it('smokes 2/3: one drag preserves every anchor field and one undo/redo restores exact unit order', async () => {
    const flow = createTextBlockContentV1('Alpha');
    flow.metadata = { nested: { retained: 'flow metadata' } };
    flow.units = ['Alpha', 'Bravo', 'Charlie'].map((text, index) => ({
      ...flow.units[0], id: `drag-unit-${index}`, text, order_index: index,
      writing_role: index === 1 ? 'todo_item' : 'paragraph', indent_level: index,
      metadata: { checked: true, nested: { original: index } },
    }));
    flow.inline_structures = [{
      id: 'inline-on-bravo', semantic_kind: 'inline_code', parent_text_unit_id: 'drag-unit-1',
      anchor_text: 'rav', anchor_range: { start: 1, end: 4 }, field_values: { language: 'text' },
      metadata: { nested: { retained: 'inline metadata' } }, status: 'active',
    }];
    const ranges: BoardTextRangeV1[] = [{
      id: 'board-range-on-bravo', note_id: 'synthetic-note', board_id: 'synthetic-board',
      block_id: 'synthetic-block', text_flow_id: 'textflow-synthetic-block', text_unit_id: 'drag-unit-1',
      start_offset: 1, end_offset: 4, excerpt: 'rav', status: 'active', pre_edit_offsets: null,
      at: 'synthetic-at', created_at: 'synthetic-created', updated_at: 'synthetic-updated',
    }];
    const annotations: AnnotationTruthV1[] = [{
      id: 'annotation-on-bravo', note_id: 'synthetic-note', canvas_id: 'synthetic-canvas', raw_label: 'Bravo span',
      ranges: [{ id: 'annotation-range-on-bravo', target_kind: 'text_span', block_id: 'synthetic-block',
        text_flow_id: 'textflow-synthetic-block', text_unit_id: 'drag-unit-1',
        start_offset: 1, end_offset: 4, range_text_cache: 'rav' }],
      parent_annotation_id: null, child_annotation_ids: [],
      visual_style: { color_token: 'blue', marker_kind: 'highlight' }, created_by: 'human', status: 'active',
      created_at: 'synthetic-created', updated_at: 'synthetic-updated',
    }];
    const before = structuredClone({ flow, ranges, annotations });
    const editor = renderHistoryEditor('', { flow, annotations, boardRanges: ranges });
    const projection = editor.container.querySelector<HTMLElement>('[data-text-unit-editor]')!;
    const rect = (y: number, height: number): DOMRect => ({ x: 100, y, left: 100, top: y, right: 500,
      bottom: y + height, width: 400, height, toJSON: () => ({ y, height }) });
    vi.spyOn(projection, 'getBoundingClientRect').mockReturnValue(rect(100, 120));
    [...projection.querySelectorAll<HTMLElement>('[data-text-unit-row]')].forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect(100 + index * 40, 40));
    });
    const handle = projection.querySelector<HTMLElement>('[data-text-unit-handle="drag-unit-1"]')!;
    const pointer = (type: string, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 90, clientY: y });
      Object.defineProperties(event, { pointerId: { value: 7 }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
      fireEvent(handle, event);
    };
    pointer('pointerdown', 150);
    pointer('pointermove', 105);
    expect(projection.querySelector('[data-text-unit-drop-indicator="drag-unit-0"]')?.getAttribute('data-drop-edge')).toBe('before');
    pointer('pointerup', 105);
    await editor.idle();
    const after = { ...before.flow,
      units: [1, 0, 2].map((index, order_index) => ({ ...before.flow.units[index], order_index })) };
    expect(editor.current().flow).toEqual(after);
    expect(editor.current().annotations).toEqual(before.annotations);
    expect(editor.boardRanges.snapshot('synthetic-block').ranges).toEqual(before.ranges);
    expect(editor.savedFlows).toEqual([after]);

    await editor.key('z', window);
    expect(editor.current().flow).toEqual(before.flow);
    expect(editor.current().annotations).toEqual(before.annotations);
    expect(editor.boardRanges.snapshot('synthetic-block').ranges).toEqual(before.ranges);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });
    await editor.key('y', window);
    expect(editor.current().flow).toEqual(after);
    expect(editor.current().annotations).toEqual(before.annotations);
    expect(editor.boardRanges.snapshot('synthetic-block').ranges).toEqual(before.ranges);
    await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });
    expect(editor.savedFlows).toEqual([after, before.flow, after]);
  });
});

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

describe('B8 smoke 4: inline snapshots through the real editor and application history (synthetic memory)', () => {
  it('uses native beforeinput at the beginning of repeated text to shift the inline anchor and preserve replay payloads', async () => {
    const flow = createTextBlockContentV1('aaaa');
    flow.inline_structures = [{
      id: 'b8-repeated-inline', semantic_kind: 'inline_code', parent_text_unit_id: flow.units[0].id,
      anchor_text: 'aa', anchor_range: { start: 1, end: 3 },
      field_values: { language: 'text' }, metadata: { retained: { original: true } }, status: 'active',
    }];
    const before = structuredClone(flow);
    const editor = renderHistoryEditor('', { flow });
    editor.focus();
    editor.textarea().setSelectionRange(0, 0);
    fireEvent(editor.textarea(), new InputEvent('beforeinput', {
      bubbles: true, cancelable: true, inputType: 'insertText', data: 'a',
    }));
    fireEvent.input(editor.textarea(), {
      target: { value: 'aaaaa', selectionStart: 1, selectionEnd: 1 }, inputType: 'insertText', data: 'a',
    });
    act(() => { expect(editor.current().textHistory.boundary()).toBe(true); });
    await editor.idle();
    const after: TextBlockContentV1 = {
      ...before, units: [{ ...before.units[0], text: 'aaaaa' }],
      inline_structures: [{ ...before.inline_structures[0], anchor_range: { start: 2, end: 4 } }],
    };
    expect(editor.current().flow).toStrictEqual(after);
    expect(editor.savedFlows).toStrictEqual([after]);
    await editor.key('z', window);
    expect(editor.current().flow).toStrictEqual(before);
    expect(editor.textarea().selectionStart).toBe(0);
    await editor.key('y', window);
    expect(editor.current().flow).toStrictEqual(after);
    expect(editor.textarea().selectionStart).toBe(1);
    expect(editor.savedFlows).toStrictEqual([after, before, after]);
    expect(editor.saveBlock.mock.calls.map(([, , saveOptions]) => saveOptions?.textFlow)).toStrictEqual([after, before, after]);
    expect(flow).toStrictEqual(before);
  });

  it.each(['inline_formula', 'inline_code'] as const)('replays every %s field after a shift and an interior edit, including save payloads', async (semanticKind) => {
    const flow = createTextBlockContentV1('lead alpha tail');
    flow.metadata = { language: 'en', retained: { author: 'synthetic' } };
    flow.units[0].metadata = { retained: { unit: true } };
    flow.inline_structures = [{
      id: `b8-${semanticKind}`, semantic_kind: semanticKind, parent_text_unit_id: flow.units[0].id,
      anchor_text: 'alpha', anchor_range: { start: 5, end: 10 },
      field_values: { expression: '\\alpha', language: 'text', nested: { preserved: ['alpha', 1] } },
      metadata: { retained: { birth: 'synthetic' } }, status: 'active',
    }];
    const before = structuredClone(flow);
    const editor = renderHistoryEditor('', { flow });
    const shifted: TextBlockContentV1 = {
      ...before,
      units: [{ ...before.units[0], text: '++lead alpha tail' }],
      inline_structures: [{ ...before.inline_structures[0], anchor_range: { start: 7, end: 12 } }],
    };
    editor.input(shifted.units[0].text, 0);
    act(() => { expect(editor.current().textHistory.boundary()).toBe(true); });
    await editor.idle();
    expect(editor.current().flow).toStrictEqual(shifted);
    expect(editor.savedFlows).toStrictEqual([shifted]);

    const degraded: TextBlockContentV1 = {
      ...shifted,
      units: [{ ...shifted.units[0], text: '++lead al+pha tail' }],
      inline_structures: [{
        ...shifted.inline_structures[0], anchor_range: null,
        metadata: {
          ...shifted.inline_structures[0].metadata,
          pre_edit_offsets: { text_unit_id: before.units[0].id, start_offset: 7, end_offset: 12, range_text_cache: 'alpha' },
        },
      }],
    };
    editor.input(degraded.units[0].text, 9);
    act(() => { expect(editor.current().textHistory.boundary()).toBe(true); });
    await editor.idle();
    expect(editor.current().flow).toStrictEqual(degraded);
    expect(editor.savedFlows).toStrictEqual([shifted, degraded]);

    await editor.key('z', window);
    expect(editor.current().flow).toStrictEqual(shifted);
    await editor.key('z', window);
    expect(editor.current().flow).toStrictEqual(before);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });
    await editor.key('y', window);
    expect(editor.current().flow).toStrictEqual(shifted);
    await editor.key('y', window);
    expect(editor.current().flow).toStrictEqual(degraded);
    await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });

    const snapshots = [shifted, degraded, shifted, before, shifted, degraded];
    expect(editor.savedFlows).toStrictEqual(snapshots);
    expect(editor.saveBlock.mock.calls.map(([, , saveOptions]) => saveOptions?.textFlow)).toStrictEqual(snapshots);
    expect(editor.savedTexts).toStrictEqual(snapshots.map(plainTextFromTextFlow));
    expect(flow).toStrictEqual(before);
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
      const after: TextBlockContentV1 = {
        ...before, units: [{ ...before.units[0], text: mergedText }],
        inline_structures: [{
          ...before.inline_structures[0], parent_text_unit_id: 'b6-first', anchor_range: null,
          metadata: {
            ...before.inline_structures[0].metadata,
            pre_edit_offsets: { text_unit_id: 'b6-middle', start_offset: 1, end_offset: 3, range_text_cache: 'et' },
          },
        }],
      };
      const afterTyping = { ...after, units: [{ ...before.units[0], text: `al${inserted}Ymma` }] };
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

// A-20, road B: a pause writes the open group without sealing it. Undo groups exactly as it did before.
describe('A-20 idle save: written at a pause, undo unchanged', () => {
  const pause = async (editor: ReturnType<typeof renderHistoryEditor>) => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, IDLE_SAVE_MS + 150)); });
    await editor.idle();
  };

  it('writes the open text after a pause, and one Ctrl+Z still takes back everything typed since the last seal', async () => {
    const editor = renderHistoryEditor('original');
    editor.input('original a', 8);
    await pause(editor);
    expect(editor.savedTexts).toEqual(['original a']);
    editor.input('original ab', 10);
    await pause(editor);
    expect(editor.savedTexts).toEqual(['original a', 'original ab']);
    // The pause did not cut the group: one undo goes all the way back, and the server follows.
    await editor.key('z');
    expect(editor.textarea().value).toBe('original');
    expect(editor.savedTexts[editor.savedTexts.length - 1]).toBe('original');
    await editor.key('z');
    expect(editor.textarea().value).toBe('original');
  }, 15_000);

  it('does not write the same body again when the group is sealed after the idle save wrote it', async () => {
    const editor = renderHistoryEditor('original');
    editor.input('original a', 8);
    await pause(editor);
    expect(editor.saveBlock).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.saveBlock).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('a failed idle save is not retried at every pause and does not hold the note; the sealed save tries again', async () => {
    let failing = true;
    const editor = renderHistoryEditor('original', { saveFails: () => failing });
    editor.input('original a', 8);
    await pause(editor);
    expect(editor.saveBlock).toHaveBeenCalledTimes(1);
    expect(editor.onSaveFailure).not.toHaveBeenCalled();
    editor.input('original ab', 10);
    await pause(editor);
    expect(editor.saveBlock).toHaveBeenCalledTimes(1);
    failing = false;
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.savedTexts[editor.savedTexts.length - 1]).toBe('original ab');
  }, 15_000);

  it('waits while something else holds the note, and asks again after another pause while text is still open', async () => {
    let free = false;
    const editor = renderHistoryEditor('original', { canSaveWhileTyping: () => free });
    editor.input('original a', 8);
    await pause(editor);
    expect(editor.saveBlock).not.toHaveBeenCalled();
    free = true;
    await pause(editor);
    expect(editor.savedTexts).toEqual(['original a']);
  }, 15_000);

  it('keeps open, unsaved text in the kept-words archive when its note stops being current', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('original');
    editor.input('original a', 8);
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([expect.objectContaining({
      blockId: 'synthetic-block', initialText: 'original', text: 'original a',
    })]);
    localStorage.clear();
  });
});

// A-20 r2: a departure keeps, per unit, from what the server holds (the last confirmed save) to what is on screen.
// Only the open, unsealed group is kept; sealed typing is recovered from its save's receipt (Main_Designer r2).
describe('A-20 r2 departure records start from what the server holds', () => {
  const pause = async (editor: ReturnType<typeof renderHistoryEditor>) => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, IDLE_SAVE_MS + 150)); });
    await editor.idle();
  };

  it('K1: after an idle save, the record of the still-open typing starts from the saved text, so landing it does not write the saved part twice', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('Note:');
    editor.input('Note: alpha', 5);
    await pause(editor);
    expect(editor.savedTexts).toEqual(['Note: alpha']);
    // Typed on, not sealed and not saved yet when the note stops being current.
    editor.input('Note: alpha beta', 11);
    editor.unmount();
    const [record] = readUnplacedWords('synthetic-note');
    expect(record).toMatchObject({ initialText: 'Note: alpha', text: 'Note: alpha beta' });
    // What the server holds when the note is opened again: the idle save's text. Landing gives the text once.
    expect(mergeTypedText('Note: alpha', record.initialText, record.text, record.text.length, { emptyMatches: false })?.text)
      .toBe('Note: alpha beta');
    localStorage.clear();
  }, 15_000);

  it('K2: a failed save that was undone keeps nothing; the undone words do not come back', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('original', { saveFails: () => true });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    await editor.key('z');
    expect(editor.textarea().value).toBe('original');
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    localStorage.clear();
  });

  it('K5: a recovery receipt left by this visit\'s own typing save is known as one, so the banner does not offer it', async () => {
    const editor = renderHistoryEditor('original', { saveFails: () => true, receiptKey: 'visit-receipt' });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.current().textHistory.isVisitReceipt('visit-receipt')).toBe(true);
    expect(editor.current().textHistory.isVisitReceipt('another-visit')).toBe(false);
  });
});

describe('A-20 r2 sealed typing is not kept in the kept-words archive', () => {
  it('a sealed group whose save failed is left to its recovery receipt, not recorded at departure (SPLIT, RETRY)', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('alpha beta', { saveFails: () => true });
    editor.input('alpha beta gamma', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    localStorage.clear();
  });
});

// A-20 r2: three ledgers, a group in exactly one: the open session, sealed-but-not-handed (unsent), the receipt (handed).
describe('A-20 r2 a group is in exactly one ledger', () => {
  it('a group queued behind a save on its way is unsent until handed over, then only the receipt has it', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('original', { holdSave: () => hold });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    // The first group is handed to the adapter (its save is on its way): not in the session, not unsent.
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    expect(editor.current().textHistory.unsentGroups()).toEqual([]);
    editor.input('original ab', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    // The second is sealed and waits behind the first: unsent, and no longer open.
    expect(editor.current().textHistory.unsentGroups().map((group) => group.after.textFlow.units[0].text)).toEqual(['original ab']);
    // The page goes now: kept from what was handed ('original a') to the newest text, nothing of the first group.
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([expect.objectContaining({ initialText: 'original a', text: 'original ab' })]);
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

  it('once the queued group is handed to the adapter it leaves the unsent ledger', async () => {
    let hold = true;
    const editor = renderHistoryEditor('original', { holdSave: () => hold });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.input('original ab', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    expect(editor.current().textHistory.unsentGroups()).toHaveLength(1);
    hold = false;
    await act(async () => { editor.heldSaves.splice(0).forEach((release) => release()); });
    await editor.idle();
    expect(editor.current().textHistory.unsentGroups()).toEqual([]);
    expect(editor.savedTexts[editor.savedTexts.length - 1]).toBe('original ab');
  });
});

// A-20 r2 (RETRY-del): a group that waited behind a failed save never reached hand-over 2. When Retry saves the whole
// screen it is on the server, so it leaves the unsent ledger; a later departure must not keep its words again.
describe('A-20 r2 a retried group leaves the unsent ledger', () => {
  it('after Retry saved it and the words were then removed and saved, leaving keeps nothing and the words do not come back', async () => {
    localStorage.clear();
    let failing = true;
    const editor = renderHistoryEditor('original', { saveFails: () => failing });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    editor.input('original ab', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    // The second group waited behind the first's failure: never handed to the adapter.
    expect(editor.current().textHistory.unsentGroups()).toHaveLength(1);
    failing = false;
    editor.focus();
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.savedTexts[editor.savedTexts.length - 1]).toBe('original ab');
    expect(editor.current().textHistory.unsentGroups()).toEqual([]);
    // The person removes the typing; that save succeeds too. Then the note is left.
    editor.input('original', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.savedTexts[editor.savedTexts.length - 1]).toBe('original');
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    localStorage.clear();
  });
});

// A-20 r2 (B): a split (Enter) not handed to the adapter when the note is left keeps only the line it created, never the
// line it cut; the record has no anchor of its own, so it is never placed by itself (SPLIT stays as before the fix).
describe('A-20 r2 a split still queued when the note is left', () => {
  it('keeps only the words of the new line, as a split record; the cut line is not recorded and stays as the server has it', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('alpha beta', { holdSave: () => hold });
    // A save on its way, so the split waits behind it.
    editor.input('alpha beta!', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus();
    editor.textarea().setSelectionRange(5, 5);
    fireEvent.keyDown(editor.textarea(), { key: 'Enter' });
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['alpha', ' beta!']);
    expect(editor.current().textHistory.unsentSplitGroups()).toHaveLength(1);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records).toEqual([expect.objectContaining({ source: 'split', initialText: '', text: ' beta!' })]);
    expect(records[0].unitId).not.toBe('tu-1');
    expect((records[0] as { writingRole?: string }).writingRole).toBeUndefined();
    // No anchor: placed nowhere by itself, whether the unit is missing, empty, or holds other text.
    expect(mergeTypedText('', records[0].initialText, records[0].text, records[0].text.length, { emptyMatches: false })).toBeNull();
    expect(mergeTypedText('other', records[0].initialText, records[0].text, records[0].text.length, { emptyMatches: false })).toBeNull();
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });
});

// A-20 r3: a kept record belongs only to a session that has ended (Main_Designer r3 on Reviewer M1-M5).
describe('A-20 r3 queued Enters: every line typed is kept (M1)', () => {
  const enterAt = (editor: ReturnType<typeof renderHistoryEditor>, unitIndex: number, caret: number) => {
    editor.focus(unitIndex);
    editor.textarea(unitIndex).setSelectionRange(caret, caret);
    fireEvent.keyDown(editor.textarea(unitIndex), { key: 'Enter' });
  };
  const values = (editor: ReturnType<typeof renderHistoryEditor>) => [...editor.container.querySelectorAll('textarea')].map((node) => node.value);

  it('LIST: k0, Enter, x, Enter, y while a save is on its way, then the page goes: x and y are both kept, never placed by themselves', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('k0', { holdSave: () => hold });
    editor.input('k0!', 2);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    enterAt(editor, 0, 3);
    editor.inputAt(1, 'x', 0);
    enterAt(editor, 1, 1);
    editor.inputAt(2, 'y', 0);
    expect(values(editor)).toEqual(['k0!', 'x', 'y']);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records.map((record) => record.text).sort()).toEqual(['x', 'y']);
    for (const record of records) {
      expect(record).toMatchObject({ source: 'split', initialText: '' });
      expect(mergeTypedText('', record.initialText, record.text, record.text.length, { emptyMatches: false })).toBeNull();
    }
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

  it('CLICKBACK: with the Enter still queued, typing back on the line it cut is kept from that line as the Enter left it', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('alpha beta', { holdSave: () => hold });
    editor.input('alpha beta!', 10);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    enterAt(editor, 0, 5);
    expect(values(editor)).toEqual(['alpha', ' beta!']);
    editor.inputAt(0, 'alphaZ', 5);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'split', initialText: '', text: ' beta!' }),
      expect.objectContaining({ source: 'edit', unitId: 'tu-1', initialText: 'alpha', text: 'alphaZ' }),
    ]));
    expect(records).toHaveLength(2);
    // Once the queued Enter has reached the server, the line it left is 'alpha' and the record lands there.
    expect(mergeTypedText('alpha', 'alpha', 'alphaZ', 6, { emptyMatches: false })?.text).toBe('alphaZ');
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });
});

describe('A-20 r3 one home per group (M3, M5)', () => {
  it('HANDOVER-one-home: a kept record of the open group goes the moment that group is handed to the adapter', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('original', { holdSave: () => hold });
    editor.input('original a', 8);
    // A departure kept it first (keepAndLeave), then the blur seals it and hands it over.
    act(() => editor.current().textHistory.keepOpenEdit());
    expect(readUnplacedWords('synthetic-note')).toEqual([expect.objectContaining({ initialText: 'original', text: 'original a' })]);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    // Its save is still on the way: the receipt is its only home now.
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

  it('a save refused before any receipt was written leaves the group unsent, so a departure keeps it', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('original', { saveRefused: () => true });
    editor.input('original a', 8);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    expect(editor.current().textHistory.unsentGroups().map((group) => group.after.textFlow.units[0].text)).toEqual(['original a']);
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([expect.objectContaining({ initialText: 'original', text: 'original a' })]);
    localStorage.clear();
  });
});

describe('A-20 r3 no frozen record while the session goes on (M2, M4)', () => {
  it('BFCACHE: back from the back-forward cache, what pagehide kept is taken back', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('original');
    editor.input('original a', 8);
    act(() => { window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true })); });
    expect(readUnplacedWords('synthetic-note')).toHaveLength(1);
    act(() => { window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })); });
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    localStorage.clear();
  });

  it('BACKIN-undo: a departure taken back keeps nothing, so words undone afterwards do not come back', async () => {
    localStorage.clear();
    const editor = renderHistoryEditor('original', { saveFails: () => true });
    editor.input('original a', 8);
    act(() => editor.current().textHistory.keepOpenEdit());
    expect(readUnplacedWords('synthetic-note')).toHaveLength(1);
    // The router held the person on the note: the departure did not happen.
    act(() => editor.current().textHistory.withdrawKeptEdit());
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    await act(async () => { fireEvent.blur(editor.textarea()); });
    await editor.idle();
    await editor.key('z');
    expect(editor.textarea().value).toBe('original');
    editor.unmount();
    expect(readUnplacedWords('synthetic-note')).toEqual([]);
    localStorage.clear();
  });
});

// A-20 r3d (N1): a group that removes units (Backspace joining two lines, a selection deleted across lines) changes which
// units there are, like a split. Its records are kept like a split's: empty start, never placed by themselves.
describe('A-20 r3d a group that removes units is kept, never placed by itself (N1)', () => {
  const twoLines = () => splitTextUnitForEnter(createTextBlockContentV1('abcd'), 'tu-1', 2, 2);

  it('MERGE-leave: Backspace joins "cd" onto "ab" while a save is on its way, Z typed, the page goes', async () => {
    localStorage.clear();
    let hold = true;
    const flow = twoLines();
    const editor = renderHistoryEditor('ab\ncd', { flow, holdSave: () => hold });
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['ab', 'cd']);
    editor.inputAt(0, 'ab!', 2);
    await act(async () => { fireEvent.blur(editor.textarea(0)); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus(1);
    editor.textarea(1).setSelectionRange(0, 0);
    fireEvent.keyDown(editor.textarea(1), { key: 'Backspace' });
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['ab!cd']);
    editor.inputAt(0, 'ab!cdZ', 5);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records.map((record) => record.text)).toEqual(['ab!cdZ']);
    for (const record of records) {
      expect(record).toMatchObject({ source: 'split', initialText: '' });
      // Never placed by itself, whatever the server holds for that unit when the note opens again.
      expect(mergeTypedText('ab!', record.initialText, record.text, record.text.length, { emptyMatches: false })).toBeNull();
      expect(mergeTypedText('ab', record.initialText, record.text, record.text.length, { emptyMatches: false })).toBeNull();
    }
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

});

// A-20 r3e (Reviewer P2): a unit made by Enter after a join can get the id of the line the join removed (the next id is
// the highest one present + 1). It is a new line all the same: its words are kept like a split's, never placed over the
// server's text of the removed line.
describe('A-20 r3e a unit created after a join never inherits a removed unit\'s identity (P2)', () => {
  it('Backspace joins "cd" onto "ab", Enter, Z typed, the page goes: Z is never placed over the server\'s "cd"', async () => {
    localStorage.clear();
    let hold = true;
    const flow = splitTextUnitForEnter(createTextBlockContentV1('abcd'), 'tu-1', 2, 2);
    const editor = renderHistoryEditor('ab\ncd', { flow, holdSave: () => hold });
    editor.inputAt(0, 'ab!', 2);
    await act(async () => { fireEvent.blur(editor.textarea(0)); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus(1);
    editor.textarea(1).setSelectionRange(0, 0);
    fireEvent.keyDown(editor.textarea(1), { key: 'Backspace' });
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['ab!cd']);
    editor.textarea(0).setSelectionRange(5, 5);
    fireEvent.keyDown(editor.textarea(0), { key: 'Enter' });
    const lines = [...editor.container.querySelectorAll('textarea')];
    expect(lines.map((node) => node.value)).toEqual(['ab!cd', '']);
    editor.inputAt(1, 'Z', 1);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    const withZ = records.filter((record) => record.text.includes('Z'));
    expect(withZ.length).toBeGreaterThan(0);
    for (const record of withZ) {
      // The server still has ['ab', 'cd'] (tu-1, tu-2). Whatever id the new line got, its words never replace "cd".
      expect(mergeTypedText('cd', record.initialText, record.text, record.text.length, { emptyMatches: false })).toBeNull();
    }
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });
});

// A-20b (Q2, Q3): words a structural group adds wait in a ledger like typing. Reviewer r3e Q2 (a multi-line paste: the
// first line's piece) and Q3 narrowed (a one-line paste in list form: same units, text changed).
describe('A-20b words of a structural group are kept at a departure (Q2, Q3)', () => {
  const paste = (node: HTMLTextAreaElement, text: string) => fireEvent.paste(node, { clipboardData: {
    getData: (type: string) => (type === 'text/plain' ? text : ''), files: [], items: [], types: ['text/plain'],
  } });

  it('Q2: "abc|def" + paste "X⏎Y" while the save before is on its way, page goes: X is kept, from "abc"', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('abcdef', { holdSave: () => hold });
    editor.inputAt(0, 'abcdef!', 6);
    await act(async () => { fireEvent.blur(editor.textarea(0)); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus(0);
    editor.textarea(0).setSelectionRange(3, 3);
    paste(editor.textarea(0), 'X\nY');
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['abcX', 'Y', 'def!']);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ initialText: 'abc', text: 'abcX' })]));
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

  // A-20b r2 (R3): '😀' and '😁' share their high surrogate; the start is 'abc', never 'abc' + half a character.
  it('R3: "abc|😀def" + paste "😁⏎Y": the record starts at "abc", not inside the emoji', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('abc😀def', { holdSave: () => hold });
    editor.inputAt(0, 'abc😀def!', 8);
    await act(async () => { fireEvent.blur(editor.textarea(0)); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus(0);
    editor.textarea(0).setSelectionRange(3, 3);
    paste(editor.textarea(0), '😁\nY');
    expect([...editor.container.querySelectorAll('textarea')].map((node) => node.value)).toEqual(['abc😁', 'Y', '😀def!']);
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ initialText: 'abc', text: 'abc😁' })]));
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });

  it('Q3: "- item" pasted at the end of a line while the save before is on its way, page goes: the words are kept', async () => {
    localStorage.clear();
    let hold = true;
    const editor = renderHistoryEditor('abc', { holdSave: () => hold });
    editor.inputAt(0, 'abc!', 3);
    await act(async () => { fireEvent.blur(editor.textarea(0)); });
    await waitFor(() => expect(editor.heldSaves).toHaveLength(1));
    editor.focus(0);
    editor.textarea(0).setSelectionRange(4, 4);
    paste(editor.textarea(0), '- item');
    const lines = [...editor.container.querySelectorAll('textarea')].map((node) => node.value);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toBe('abc!');
    editor.unmount();
    const records = readUnplacedWords('synthetic-note');
    expect(records).toEqual([expect.objectContaining({ initialText: 'abc!', text: lines[0] })]);
    hold = false;
    editor.heldSaves.splice(0).forEach((release) => release());
    localStorage.clear();
  });
});
