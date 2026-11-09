import { act, renderHook, waitFor } from '@testing-library/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import { createTextBlockContentV1, getTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { splitTextUnitForEnter } from '../textUnitEditorService';
import { useAuthStore } from '@/stores/authStore';
import { forgetUnplacedWords, readUnplacedWords, rememberUnplacedWords, UNPLACED_WORDS_LIMIT } from '../structureTypingBuffer';
import { mergeTypedText, typedTextIsPlaced, useHeadingStructureController } from './useHeadingStructureController';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { useDocumentTextFlowSelection } from './useDocumentTextFlowSelection';
import type { DocumentFlowEdit, DocumentFlowSelection } from '../documentTextFlowSelection';

const template: TemplateOption = { template_id: 'text.paragraph', template_key: 'text.paragraph', template_version: '1.0.0',
  label: 'Text', description: 'Text', system_type: 'text', learning_role: 'note', legacy_block_type: 'paragraph',
  default_content: {}, origin: 'test', status: 'active', isRuntime: false };
const layout = { x: 0, y: 0, width: 400, height: 64, frame_id: 'page',
  coordinate_space: 'page_frame_local' as const, surface: 'formal_page' as const, width_mode: 'auto' as const };
const textOf = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');
type HistoryOptions = Parameters<typeof useTextFlowHistory>[0];

function textFlow(rows: Array<[string, string, TextUnitWritingRole?]>): TextBlockContentV1 {
  const flow = createTextBlockContentV1('');
  flow.units = rows.map(([id, text, role], index) => ({ ...flow.units[0], id, text,
    writing_role: role ?? 'paragraph', order_index: index }));
  return flow;
}

function block(id: string, flow: TextBlockContentV1, order: number): NoteBlock {
  return { id, block_type: 'paragraph', title: null, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow },
    plain_text: textOf(flow), metadata: {}, order_index: order, source_references: [], placement_id: `p-${id}`,
    display_overrides_json: {}, canvas_layout: layout, text_save_revision: 0 };
}

/** Fake only the existing persistence boundary. Splitting, unit movement,
 * snapshots, batching, history and the heading controller are all real hooks.
 */
type ControllerInput = Parameters<typeof useHeadingStructureController>[0];

function renderStructure(original: TextBlockContentV1, ending = textFlow([['end', 'End']]),
  extra: Partial<Pick<ControllerInput, 'whenWritesIdle' | 'watchdogMs' | 'editorWaitMs' | 'placeRetryMs'>> = {}) {
  const originalBlocks = [block('source', structuredClone(original), 0), block('ending', structuredClone(ending), 1)];
  const board = createBoardTextRangeEditSession('note', async (_note, updates) => updates);
  board.hydrate([]);
  const data = { blocks: structuredClone(originalBlocks), annotations: [] as AnnotationTruthV1[],
    flowDrafts: {} as Record<string, TextBlockContentV1>, textDrafts: {} as Record<string, string> };
  let update = () => {};
  let createdCount = 0;
  const documentOperations: DocumentFlowEdit[][] = [];
  let documentPending: Promise<boolean> | null = null;
  const create = vi.fn<NonNullable<HistoryOptions['createDraftBlock']>>(async (_template, _text, options) => {
    const id = `new-${++createdCount}`;
    const created = { ...block(id, getTextFlowContent(options?.contentJson ?? {})!, data.blocks.length),
      content_json: options!.contentJson!, canvas_layout: options?.layout ? { ...options.layout } : undefined };
    data.blocks = [...data.blocks, created]; update();
    return { block: created, clientCreateKey: options!.clientCreateKey!, placementPersisted: true, reused: false };
  });
  const savePlacement = vi.fn<NonNullable<HistoryOptions['saveDraftBlockPlacement']>>(async (target) => target);
  const discard = vi.fn<NonNullable<HistoryOptions['discardDraftBlock']>>(async () => true);
  const trash = vi.fn<NonNullable<HistoryOptions['trashBlock']>>(async (id) => {
    data.blocks = data.blocks.filter((entry) => entry.id !== id);
    delete data.flowDrafts[id]; delete data.textDrafts[id]; update(); return true;
  });
  const restore = vi.fn<NonNullable<HistoryOptions['restoreBlock']>>(async (target) => {
    data.blocks = [...data.blocks, target]; update(); return target;
  });
  const transfer = vi.fn<NonNullable<HistoryOptions['transferTextUnit']>>(async (input) => {
    const sourceBlock = { ...input.sourceBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.sourceTextFlow },
      plain_text: textOf(input.sourceTextFlow), ...input.sourcePayload, text_save_revision: input.sourceBaseRevision + 1 };
    const targetBlock = { ...input.targetBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.targetTextFlow },
      plain_text: textOf(input.targetTextFlow), ...input.targetPayload, text_save_revision: input.targetBaseRevision + 1 };
    data.blocks = data.blocks.map((entry) => entry.id === sourceBlock.id ? sourceBlock : entry.id === targetBlock.id ? targetBlock : entry);
    data.flowDrafts = { ...data.flowDrafts, [sourceBlock.id]: input.sourceTextFlow, [targetBlock.id]: input.targetTextFlow };
    data.textDrafts = { ...data.textDrafts, [sourceBlock.id]: sourceBlock.plain_text ?? '', [targetBlock.id]: targetBlock.plain_text ?? '' };
    update(); return { sourceBlock, targetBlock };
  });
  const save = vi.fn<HistoryOptions['saveBlock']>(async (target, text, options) => {
    const flow = options?.textFlow ?? getTextFlowContent(target.content_json)!;
    const saved = { ...target,
      content_json: options?.contentSnapshot?.contentJson ?? { ...target.content_json, [TEXT_FLOW_CONTENT_KEY]: flow },
      plain_text: options?.contentSnapshot?.plainText ?? text,
      text_save_revision: (options?.baseRevision ?? target.text_save_revision ?? 0) + 1 };
    data.blocks = data.blocks.map((entry) => entry.id === target.id ? saved : entry);
    update(); return { status: 'saved', block: saved, recoveryReceipt: null, reconciliation: 'response' };
  });
  const reorder = vi.fn(async (ids: readonly string[]) => {
    if (ids.length !== data.blocks.length || ids.some((id) => !data.blocks.some((entry) => entry.id === id))) return false;
    data.blocks = ids.map((id, order_index) => ({ ...data.blocks.find((entry) => entry.id === id)!, order_index }));
    update(); return true;
  });
  const focus = vi.fn();
  const failure = vi.fn();
  const subject = renderHook(() => {
    const [, force] = useState(0); update = () => force((value) => value + 1);
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({ noteId: 'note', generation: 1, blocks: data.blocks,
      annotationTruths: data.annotations, readAnnotationTruths: () => data.annotations,
      setAnnotationTruthsSnapshot: (annotations) => { data.annotations = annotations; update(); },
      blockTextFlowDrafts: data.flowDrafts,
      setBlockTextFlowDrafts: (value) => { data.flowDrafts = typeof value === 'function' ? value(data.flowDrafts) : value; update(); },
      setBlockTextDrafts: (value) => { data.textDrafts = typeof value === 'function' ? value(data.textDrafts) : value; update(); },
      captureBoardTextRanges: board.snapshot, restoreBoardTextRanges: board.restore, rebaseBoardTextRanges: board.rebase,
      saveBlock: save, saveAnnotationTruthsOutcome: async () => true, history: host,
      createDraftBlock: create, saveDraftBlockPlacement: savePlacement, discardDraftBlock: discard,
      trashBlock: trash, restoreBlock: restore, transferTextUnit: transfer,
    });
    const history = usePlacementHistory({ noteId: 'note', generation: 1, beforeHistoryBoundary: () => editing.boundary(),
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    const heading = useHeadingStructureController({ noteId: 'note', blocks: data.blocks,
      layouts: Object.fromEntries(data.blocks.map((entry) => [entry.id, layout])), readOnly: false,
      template, textHistory: editing, reorderBlocks: reorder, onFocusBlock: focus, onFailure: failure, editorWaitMs: 0,
      setBlockTextDrafts: (value) => { data.textDrafts = typeof value === 'function' ? value(data.textDrafts) : value; update(); },
      ...extra });
    const selection = useDocumentTextFlowSelection({ noteId: 'note', visibleBlocks: data.blocks,
      applyDocumentEdit: (changes) => {
        documentOperations.push(structuredClone(changes));
        documentPending = heading.onDocumentEdit(changes);
        return documentPending;
      } });
    useLayoutEffect(() => {
      for (const entry of data.blocks) {
        const flow = data.flowDrafts[entry.id] ?? getTextFlowContent(entry.content_json)!;
        selection.register(entry.id, { flow, editable: true, focus: vi.fn(),
          anchor: () => ({ unitId: flow.units[0].id, offset: 0 }) });
      }
    });
    return { editing, history, heading, selection };
  });
  const settle = async (operation: () => Promise<boolean>) => {
    let done: boolean | undefined;
    let pending!: Promise<boolean>;
    act(() => {
      pending = operation();
      void pending.then((value) => { done = value; });
    });
    // RAF receipts deliberately let React publish each confirmed transfer before
    // the next step. waitFor allows those renders, as in the live editor.
    await waitFor(() => expect(done).toBeDefined());
    return pending;
  };
  const run = (request: HeadingTextFlowStructureRequest, sourceId = 'source') => settle(() =>
    subject.result.current.heading.onHeadingStructure(data.blocks.find((entry) => entry.id === sourceId)!, request));
  const undo = () => settle(() => subject.result.current.history.undoRuntimeHistory());
  const redo = () => settle(() => subject.result.current.history.redoRuntimeHistory());
  const replaceDocument = async (range: DocumentFlowSelection, text: string) => {
    act(() => { expect(subject.result.current.selection.select(range.anchor, range.focus)).toBe(true); });
    return settle(() => {
      expect(subject.result.current.selection.replace(text, 'insertFromPaste')).toBe(true);
      if (!documentPending) throw new Error('Document selection did not reach the heading host');
      return documentPending;
    });
  };
  const flows = () => data.blocks.map((entry) => getTextFlowContent(entry.content_json)!);
  return { ...subject, data, originalBlocks, create, transfer, save, reorder, trash, restore, failure, focus,
    run, undo, redo, flows, replaceDocument, documentOperations };
}

// Each r2.2 case starts clean: a case that fails must not leave boxes or records behind for the next one.
const startClean = () => {
  document.querySelectorAll('textarea[data-structure-typing-buffer], [data-structure-typing-notice]').forEach((element) => element.remove());
  localStorage.clear();
};

const startCleanScreenOnly = () => {
  document.querySelectorAll('textarea[data-structure-typing-buffer], [data-structure-typing-notice]').forEach((element) => element.remove());
};

const typingBuffer = () => document.querySelector<HTMLTextAreaElement>('textarea[data-structure-typing-buffer]');
const typingNotice = () => document.querySelector<HTMLElement>('[data-structure-typing-notice]');
// Returns false when the window took the text, as a browser would for a default-prevented key.
function noteEditor() {
  const area = document.createElement('textarea');
  area.dataset.runtimeTextflowEditor = 'true';
  document.body.appendChild(area);
  const typeText = (data: string) => {
    const buffer = typingBuffer();
    if (!buffer || typingNotice()) return area.dispatchEvent(new InputEvent('beforeinput',
      { inputType: 'insertText', data, bubbles: true, cancelable: true }));
    buffer.setRangeText(data, buffer.selectionStart, buffer.selectionEnd, 'end');
    buffer.dispatchEvent(new Event('input', { bubbles: true }));
    return false;
  };
  return { area, typeText };
}

describe('words from the window applied to text that changed under it (item 4, condition c)', () => {
  it('words typed at the start of the line stay at its start', () => {
    expect(mergeTypedText('#Intro', 'Intro', 'Big Intro', 4)).toEqual({ text: '#Big Intro', caret: 5 });
  });
  it('words typed after the text stay after it, ahead of what was added behind', () => {
    expect(mergeTypedText('Intro more', 'Intro', 'Intro!', 6)).toEqual({ text: 'Intro! more', caret: 6 });
  });
  it('unchanged text takes the window as it is', () => {
    expect(mergeTypedText('Intro', 'Intro', 'Intro!', 6)).toEqual({ text: 'Intro!', caret: 6 });
  });
  it('round 2 #3a: an empty unit that has since filled gives no anchor, so the words are kept, not appended', () => {
    // Red before round 2: live.endsWith('') is always true and 'kept' went onto the end of 'other text'.
    expect(mergeTypedText('other text', '', 'kept', 4)).toBeNull();
    expect(mergeTypedText('# Sec', 'Sec', 'Sec!', 4)).toEqual({ text: '# Sec!', caret: 6 });
    expect(mergeTypedText('Sec more', 'Sec', 'XSec', 1)).toBeNull();
    expect(mergeTypedText('', '', 'kept', 4)).toEqual({ text: 'kept', caret: 4 });
  });
  it('round 2 #3a: kept words from an empty unit that has since filled stay kept on reopening', async () => {
    rememberUnplacedWords('note', { id: 'no-anchor', blockId: 'source', unitId: 'title', initialText: '', text: 'kept' });
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]));
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect((editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!).units.map((unit) => unit.text))
      .toEqual(['Intro', 'other text']);
    expect(typingBuffer()!.value).toBe('kept');
    expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['no-anchor']);
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });
  it('a place that cannot be found puts the words nowhere', () => {
    expect(mergeTypedText('zzz', 'abc def', 'abc X def', 6)).toBeNull();
  });
});

describe('A4 heading isolation through the live TextFlow and Note history', () => {
  it('isolates a multiline cross-block selection paste and restores both blocks with one undo and redo', async () => {
    const original = textFlow([['title', 'Title', 'heading_2']]);
    original.inline_structures = [{ id: 'title-inline', parent_text_unit_id: 'title', semantic_kind: 'inline_code',
      anchor_text: 'Ti', anchor_range: { start: 0, end: 2 }, field_values: {}, metadata: {}, status: 'active' }];
    const ending = textFlow([['end', 'Body tail']]);
    ending.inline_structures = [{ id: 'tail-inline', parent_text_unit_id: 'end', semantic_kind: 'inline_code',
      anchor_text: 'tail', anchor_range: { start: 5, end: 9 }, field_values: {}, metadata: {}, status: 'active' }];
    const editor = renderStructure(original, ending);
    expect(await editor.replaceDocument({ anchor: { blockId: 'source', unitId: 'title', offset: 2 },
      focus: { blockId: 'ending', unitId: 'end', offset: 4 } }, 'A\nB')).toBe(true);
    expect(editor.documentOperations).toHaveLength(1);
    expect(editor.documentOperations[0].map((edit) => edit.block.id)).toEqual(['source', 'ending']);
    // Prove the real document selector initially produced the hard-line heading
    // which the heading host must normalize before its existing save actions.
    expect(editor.documentOperations[0][0].nextTextFlow.units[0]).toMatchObject({ text: 'TiA\nB', writing_role: 'heading_2' });
    expect(editor.flows().map((flow) => flow.units.map((unit) => [unit.text, unit.writing_role]))).toEqual([
      [['TiA', 'heading_2']], [['B', 'paragraph']], [[' tail', 'paragraph']],
    ]);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'new-1', 'ending']);
    expect(editor.flows()[0].inline_structures).toEqual(original.inline_structures);
    expect(editor.flows()[2].inline_structures[0]).toMatchObject({ id: 'tail-inline', anchor_range: { start: 1, end: 5 } });
    expect(editor.failure).not.toHaveBeenCalled();
    expect(editor.create).toHaveBeenCalledTimes(1);
    const after = structuredClone(editor.flows());
    expect(await editor.undo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'ending']);
    expect(editor.flows()).toEqual([original, ending]);
    expect(await editor.undo()).toBe(false);
    expect(await editor.redo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'new-1', 'ending']);
    expect(editor.flows()).toEqual(after);
    expect(editor.create).toHaveBeenCalledTimes(1);
    expect(await editor.redo()).toBe(false);
  });
  it('promotes a middle unit, preserves both body segments and inline anchors, and undoes/redoes the whole operation once', async () => {
    const original = textFlow([['before', 'Before'], ['middle', 'Heading'], ['after-one', 'After one'], ['after-two', 'After two']]);
    original.inline_structures = [
      { id: 'heading-inline', parent_text_unit_id: 'middle', semantic_kind: 'inline_formula', anchor_range: { start: 0, end: 4 },
        anchor_text: 'Head', field_values: { latex: 'x+1' }, metadata: { keep: true }, status: 'active' },
      { id: 'body-inline', parent_text_unit_id: 'after-two', semantic_kind: 'inline_link', anchor_range: { start: 0, end: 5 },
        anchor_text: 'After', field_values: { url: 'https://example.test' }, metadata: {}, status: 'active' },
    ];
    const editor = renderStructure(original);
    const next = structuredClone(original); next.units[1].writing_role = 'heading_2';
    expect(await editor.run({ previousTextFlow: original, nextTextFlow: next, headingUnitId: 'middle',
      focus: { unitId: 'middle', caret: 2 }, inputType: 'formatHeading' })).toBe(true);
    expect(editor.failure).not.toHaveBeenCalled();
    expect(editor.flows().map((flow) => flow.units.map((unit) => unit.text))).toEqual([
      ['Before'], ['Heading'], ['After one', 'After two'], ['End'],
    ]);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'new-1', 'new-2', 'ending']);
    expect(editor.data.blocks.every((entry) => entry.block_type === 'paragraph')).toBe(true);
    expect(editor.flows()[1].units[0].writing_role).toBe('heading_2');
    expect(editor.flows()[1].inline_structures).toEqual([original.inline_structures[0]]);
    expect(editor.flows()[2].inline_structures).toEqual([original.inline_structures[1]]);
    expect(editor.create).toHaveBeenCalledTimes(2);
    expect(editor.reorder).toHaveBeenCalledTimes(1);
    expect(editor.focus).toHaveBeenLastCalledWith('new-1');
    expect(await editor.undo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'ending']);
    expect(editor.flows()[0]).toEqual(original);
    expect(await editor.undo()).toBe(false);
    const redone = await editor.redo();
    expect(redone, JSON.stringify({ order: editor.data.blocks.map((entry) => entry.id),
      reorders: editor.reorder.mock.calls, restored: editor.restore.mock.calls.map(([entry]) => entry.id) })).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'new-1', 'new-2', 'ending']);
    expect(editor.flows().map((flow) => flow.units.map((unit) => unit.text))).toEqual([
      ['Before'], ['Heading'], ['After one', 'After two'], ['End'],
    ]);
    expect(editor.flows()[1].inline_structures).toEqual([original.inline_structures[0]]);
    expect(editor.flows()[2].inline_structures).toEqual([original.inline_structures[1]]);
    expect(editor.create).toHaveBeenCalledTimes(2);
    expect(await editor.redo()).toBe(false);
  });

  it('isolates several pasted heading units into single-heading blocks while keeping intervening body order', async () => {
    const original = textFlow([['original', 'Original']]);
    const next = textFlow([['first', 'First', 'heading_1'], ['body-a', 'Body A'], ['second', 'Second', 'heading_2'],
      ['body-b', 'Body B'], ['third', 'Third', 'heading_3'], ['body-c', 'Body C']]);
    const editor = renderStructure(original);
    expect(await editor.run({ previousTextFlow: original, nextTextFlow: next, headingUnitId: 'first',
      focus: { unitId: 'body-c', caret: 6 }, inputType: 'insertHeading' })).toBe(true);
    expect(editor.failure).not.toHaveBeenCalled();
    expect(editor.flows().map((flow) => flow.units.map((unit) => [unit.text, unit.writing_role]))).toEqual([
      [['First', 'heading_1']], [['Body A', 'paragraph']], [['Second', 'heading_2']],
      [['Body B', 'paragraph']], [['Third', 'heading_3']], [['Body C', 'paragraph']], [['End', 'paragraph']],
    ]);
    expect(editor.reorder).toHaveBeenCalledTimes(1);
    expect(await editor.undo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'ending']);
    expect(editor.flows()[0]).toEqual(original);
    expect(await editor.redo()).toBe(true);
    expect(editor.flows().map(textOf)).toEqual(['First', 'Body A', 'Second', 'Body B', 'Third', 'Body C', 'End']);
  });

  it('retains both earlier history batches after a later heading operation', async () => {
    const original = textFlow([['before', 'Before'], ['first', 'First title'], ['later', 'Later title'], ['tail', 'Tail']]);
    const editor = renderStructure(original);
    const first = structuredClone(original); first.units[1].writing_role = 'heading_1';
    expect(await editor.run({ previousTextFlow: original, nextTextFlow: first, headingUnitId: 'first',
      focus: { unitId: 'first', caret: 0 }, inputType: 'formatHeading' })).toBe(true);
    const firstOrder = editor.data.blocks.map((entry) => entry.id);
    const firstFlows = structuredClone(editor.flows());
    const laterBlock = editor.data.blocks.find((entry) => getTextFlowContent(entry.content_json)!.units.some((unit) => unit.id === 'later'))!;
    const previous = getTextFlowContent(laterBlock.content_json)!;
    const second = structuredClone(previous); second.units.find((unit) => unit.id === 'later')!.writing_role = 'heading_2';
    expect(await editor.run({ previousTextFlow: previous, nextTextFlow: second, headingUnitId: 'later',
      focus: { unitId: 'later', caret: 0 }, inputType: 'formatHeading' }, laterBlock.id)).toBe(true);
    const finalOrder = editor.data.blocks.map((entry) => entry.id);
    expect(editor.flows().map(textOf)).toEqual(['Before', 'First title', 'Later title', 'Tail', 'End']);
    expect(await editor.undo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(firstOrder);
    expect(editor.flows()).toEqual(firstFlows);
    expect(await editor.undo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(['source', 'ending']);
    expect(editor.flows()[0]).toEqual(original);
    expect(await editor.redo()).toBe(true);
    expect(await editor.redo()).toBe(true);
    expect(editor.data.blocks.map((entry) => entry.id)).toEqual(finalOrder);
    expect(editor.flows().map(textOf)).toEqual(['Before', 'First title', 'Later title', 'Tail', 'End']);
  });

  it('replays text and Enter typed while Enter after a heading is still committing', async () => {
    const original = textFlow([['title', 'Ports', 'heading_1']]);
    const next = splitTextUnitForEnter(original, 'title', 5, 5);
    const paragraph = next.units[1];
    const editor = renderStructure(original);
    const { area, typeText } = noteEditor();

    let pending!: Promise<boolean>;
    act(() => {
      pending = editor.result.current.heading.onHeadingStructure(editor.data.blocks.find((entry) => entry.id === 'source')!, {
        previousTextFlow: original, nextTextFlow: next, headingUnitId: 'title',
        focus: { unitId: paragraph.id, caret: 0 }, inputType: 'insertParagraphAfterHeading' });
    });
    expect(typeText('Body')).toBe(false);
    expect(typeText('\n')).toBe(false);
    expect(typeText('Next')).toBe(false);
    await waitFor(async () => expect(await pending).toBe(true));

    await waitFor(() => {
      const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'));
      expect(created).toBeTruthy();
      expect(editor.data.flowDrafts[created!.id]?.units.map((unit) => unit.text)).toEqual(['Body', 'Next']);
      expect(editor.data.textDrafts[created!.id]).toBe('Body\nNext');
    });
    // Typing after the commit is ordinary input again.
    expect(typeText('later')).toBe(true);
    area.remove();
  });
});

// F9 / A-17: three invariants of the structure commit.
describe('heading structure commits always release the note and keep both draft halves equal', () => {
  // "# Sec" typed into a standalone empty block: one heading unit, no new block.
  const emptyBlockHeading = () => {
    const original = textFlow([['empty', '']]);
    const next = textFlow([['empty', 'Sec', 'heading_1']]);
    return { original, request: { previousTextFlow: original, nextTextFlow: next, headingUnitId: 'empty',
      focus: { unitId: 'empty', caret: 3 }, inputType: 'insertHeading' } as HeadingTextFlowStructureRequest };
  };

  it('publishes the text half with the flow when "# " converts an empty block, so the editor and chapter tree agree', async () => {
    const { original, request } = emptyBlockHeading();
    const editor = renderStructure(original);
    expect(await editor.run(request)).toBe(true);
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => [unit.writing_role, unit.text])).toEqual([['heading_1', 'Sec']]);
    // The chapter tree is built from the flow; the editor renders the text half.
    expect(editor.data.textDrafts.source).toBe('Sec');
    expect(editor.result.current.heading.isBusy()).toBe(false);
  });

  it('never saves a moved unit back when a frame fires before React commits the transfer', async () => {
    const original = textFlow([['before', 'aaa'], ['middle', 'bbb'], ['after', 'ccc']]);
    const editor = renderStructure(original);
    const next = structuredClone(original); next.units[1].writing_role = 'heading_1';
    const frames = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 0; });
    try {
      expect(await editor.run({ previousTextFlow: original, nextTextFlow: next, headingUnitId: 'middle',
        focus: { unitId: 'middle', caret: 0 }, inputType: 'insertHeading' })).toBe(true);
    } finally {
      frames.mockRestore();
    }
    expect(editor.transfer.mock.calls.map(([input]) => input.sourceTextFlow.units.map((unit) => unit.text))).toEqual([
      ['aaa', 'ccc'], ['aaa'],
    ]);
    expect(editor.flows().map((flow) => flow.units.map((unit) => unit.text))).toEqual([['aaa'], ['bbb'], ['ccc'], ['End']]);
  });

  it('a commit wait does not hang when the note unmounts mid-structure', async () => {
    const original = textFlow([['before', 'aaa'], ['middle', 'bbb'], ['after', 'ccc']]);
    const editor = renderStructure(original);
    const next = structuredClone(original); next.units[1].writing_role = 'heading_1';
    let pending!: Promise<boolean>;
    act(() => {
      pending = editor.result.current.heading.onHeadingStructure(editor.data.blocks[0], { previousTextFlow: original,
        nextTextFlow: next, headingUnitId: 'middle', focus: { unitId: 'middle', caret: 0 }, inputType: 'insertHeading' });
    });
    editor.unmount();
    await expect(pending).resolves.toBeTypeOf('boolean');
  });

  it('completes, releases busy and replays queued keys even when animation frames never arrive', async () => {
    const { original, request } = emptyBlockHeading();
    const editor = renderStructure(original);
    const { area, typeText } = noteEditor();
    const frames = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    try {
      let pending!: Promise<boolean>;
      act(() => { pending = editor.result.current.heading.onHeadingStructure(editor.data.blocks[0], request); });
      expect(editor.result.current.heading.isBusy()).toBe(true);
      expect(typeText(' more')).toBe(false);
      expect(await pending).toBe(true);
      await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
      await waitFor(() => expect(editor.data.textDrafts.source).toBe('Sec more'));
      expect(editor.data.flowDrafts.source.units.map((unit) => unit.text)).toEqual(['Sec more']);
      expect(typeText('later')).toBe(true);
    } finally {
      frames.mockRestore();
      area.remove();
    }
  });

  const splitHeading = (editor: ReturnType<typeof renderStructure>) => {
    let pending!: Promise<boolean>;
    act(() => {
      pending = editor.result.current.heading.onHeadingStructure(editor.data.blocks[0], {
        previousTextFlow: editor.flows()[0], nextTextFlow: textFlow([['body', 'Intro'], ['title', 'Sec', 'heading_1']]),
        headingUnitId: 'title', focus: { unitId: 'title', caret: 3 }, inputType: 'insertHeading' });
    });
    return pending;
  };
  const halvesAgree = (editor: ReturnType<typeof renderStructure>) => {
    for (const entry of editor.data.blocks) {
      const live = editor.data.flowDrafts[entry.id] ?? getTextFlowContent(entry.content_json)!;
      const shown = editor.data.textDrafts[entry.id];
      if (shown !== undefined) expect(shown).toBe(textOf({ ...live, units: live.units.filter((unit) => unit.status !== 'deleted') }));
    }
  };

  it('releases busy on a failed structure step and replays queued keys into the block that holds the caret', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    // The split is saved, but placing it in order fails.
    editor.reorder.mockResolvedValueOnce(false);
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    expect(typeText('!')).toBe(false);
    expect(await pending).toBe(false);
    expect(editor.failure).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    await waitFor(() => expect(editor.data.textDrafts[created.id]).toBe('Sec!'));
    halvesAgree(editor);
    expect(typeText('later')).toBe(true);
    area.remove();
  });

  it('releases busy and stops capturing keys when the split itself cannot be saved', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    editor.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    expect(typeText('!')).toBe(false);
    expect(await pending).toBe(false);
    expect(editor.failure).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    halvesAgree(editor);
    // A failed save holds the note until Retry or Undo. The words stay on screen and
    // say they are not in the note, and typing elsewhere is ordinary input again.
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(typingBuffer()!.value).toBe('Sec!');
    expect(typeText('later')).toBe(true);
    typingNotice()!.querySelector('button')!.click();
    expect(typingBuffer()).toBeNull();
    area.remove();
  });

  it('shows what is typed in the window on the unit, and hands off with the caret where it was left', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    const buffer = typingBuffer()!;
    expect(document.activeElement).toBe(buffer);
    expect(buffer.value).toBe('Sec');
    typeText('Xabc');
    expect(buffer.value).toBe('SecXabc');
    // Backspace and an arrow key, as the browser applies them natively.
    buffer.setRangeText('', 6, 7, 'end');
    buffer.setSelectionRange(4, 4);
    typeText('-');
    expect(await pending).toBe(true);
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    await waitFor(() => expect(editor.data.textDrafts[created.id]).toBe('SecX-ab'));
    await waitFor(() => expect(typingBuffer()).toBeNull());
    area.remove();
  });

  it('keeps the buffer until the target editor exists and is writable, so the next key has somewhere to go', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]), undefined, { editorWaitMs: 5000 });
    const pending = splitHeading(editor);
    expect(await pending).toBe(true);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    await new Promise((resolve) => setTimeout(resolve, 150));
    const buffer = typingBuffer()!;
    // No editor yet: the key made now must not be lost.
    expect(buffer).toBeTruthy();
    const target = document.createElement('textarea');
    target.dataset.runtimeTextflowEditor = 'true';
    target.dataset.blockId = created.id;
    target.dataset.textUnitId = 'title';
    target.getBoundingClientRect = () => ({ width: 100 }) as DOMRect;
    target.readOnly = true;
    document.body.appendChild(target);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(typingBuffer()).toBe(buffer);
    target.readOnly = false;
    await waitFor(() => expect(typingBuffer()).toBeNull());
    expect(document.activeElement).toBe(target);
    target.remove();
  });

  it('does not pull focus back from another field someone clicked into during the window', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const other = document.createElement('input');
    document.body.appendChild(other);
    const pending = splitHeading(editor);
    other.focus();
    expect(await pending).toBe(true);
    await waitFor(() => expect(typingBuffer()).toBeNull());
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it('an editor taking focus during the window does not take the keys', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area } = noteEditor();
    const pending = splitHeading(editor);
    const buffer = typingBuffer()!;
    area.focus();
    expect(document.activeElement).toBe(buffer);
    expect(await pending).toBe(true);
    area.remove();
  });

  it('counts everything typed in the window as one undo step, leaving the heading', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('a'); typeText('b'); typeText('c');
    expect(await pending).toBe(true);
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    await waitFor(() => expect(editor.data.textDrafts[created.id]).toBe('Secabc'));
    await waitFor(() => expect(typingBuffer()).toBeNull());
    // Ordinary typing afterwards is its own step, not folded into the window's.
    const live = editor.data.flowDrafts[created.id];
    const typed = { ...live, units: live.units.map((unit) => ({ ...unit, text: 'Secabcd' })) };
    await act(async () => { await editor.result.current.editing.applyEdit(editor.data.blocks.find((entry) => entry.id === created.id)!, typed,
      { previousTextFlow: live, metadata: { unitId: live.units[0].id, inputType: 'insertText', kind: 'typing', isComposing: false,
        beforeSelection: { unitId: live.units[0].id, start: 6, end: 6 }, afterSelection: { unitId: live.units[0].id, start: 7, end: 7 } } }); });
    expect(await editor.undo()).toBe(true);
    expect(editor.data.flowDrafts[created.id].units[0].text).toBe('Secabc');
    expect(await editor.undo()).toBe(true);
    await waitFor(() => expect(editor.data.textDrafts[created.id]).toBe('Sec'));
    expect(editor.data.flowDrafts[created.id].units[0].writing_role).toBe('heading_1');
    area.remove();
  });

  it('waits for a composition to end, however late, before placing its text', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area } = noteEditor();
    const pending = splitHeading(editor);
    const buffer = typingBuffer()!;
    buffer.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    expect(await pending).toBe(true);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(typingBuffer()).toBe(buffer);
    buffer.value = 'Sec现值';
    buffer.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '现值' }));
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    await waitFor(() => expect(editor.data.textDrafts[created.id]).toBe('Sec现值'));
    expect(typingBuffer()).toBeNull();
    area.remove();
  });

  it('body typed after Enter in a heading takes its own block rather than sharing the heading block', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('\nBody');
    expect(await pending).toBe(true);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    await waitFor(() => expect(editor.flows().map((flow) => flow.units.map((unit) => unit.text)))
      .toEqual([['Intro'], ['Sec'], ['Body'], ['End']]));
    await waitFor(() => expect(typingBuffer()).toBeNull());
    area.remove();
  });

  it('failure injection: the words survive leaving the note mid-window and stay on screen', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('kept');
    editor.unmount();
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(typingBuffer()!.value).toBe('Seckept');
    typingNotice()!.querySelector('button')!.click();
    expect(typingBuffer()).toBeNull();
    area.remove();
  });

  it('failure injection: words left behind go into the note when it is opened again', async () => {
    const original = textFlow([['body', 'Intro'], ['title', 'Sec']]);
    const editor = renderStructure(original);
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('kept');
    editor.unmount();
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(readUnplacedWords('note').map((words) => words.text)).toEqual(['Seckept']);
    const back = renderStructure(original);
    await waitFor(() => expect(typingNotice()).toBeNull());
    await waitFor(() => expect(typingBuffer()).toBeNull());
    expect(back.data.flowDrafts.source?.units.map((unit) => unit.text).join('|')).toContain('kept');
    expect(readUnplacedWords('note')).toEqual([]);
    back.unmount();
    area.remove();
  });

  it('opening one note leaves the words waiting for another note alone', async () => {
    rememberUnplacedWords('other-note', { id: 'theirs', blockId: 'b', unitId: 'u', initialText: '', text: 'theirs' });
    const editor = renderStructure(textFlow([['body', 'Intro']]));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(readUnplacedWords('other-note').map((words) => words.text)).toEqual(['theirs']);
    forgetUnplacedWords('other-note', 'theirs');
    editor.unmount();
  });

  it('another account signing in neither sees left-behind words nor gets them written into its note', async () => {
    const original = textFlow([['body', 'Intro'], ['title', 'Sec']]);
    const owner = { id: 'owner' } as NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
    useAuthStore.setState({ user: owner });
    try {
      const editor = renderStructure(original);
      const { area, typeText } = noteEditor();
      void splitHeading(editor);
      typeText('secret');
      editor.unmount();
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      useAuthStore.setState({ user: { ...owner, id: 'someone-else' } });
      expect(typingNotice()).toBeNull();
      expect(typingBuffer()).toBeNull();
      expect(readUnplacedWords('note')).toEqual([]);
      const theirs = renderStructure(original);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      expect(typingBuffer()).toBeNull();
      expect(theirs.data.flowDrafts.source).toBeUndefined();
      expect(theirs.save).not.toHaveBeenCalled();
      theirs.unmount();
      // Still there for its owner.
      useAuthStore.setState({ user: owner });
      const ownerWords = readUnplacedWords('note');
      expect(ownerWords.map((words) => words.text)).toEqual(['Secsecret']);
      forgetUnplacedWords('note', ownerWords[0].id);
      area.remove();
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('failure injection: closing the notice is the only thing that discards left-behind words', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('kept');
    editor.unmount();
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    typingNotice()!.querySelector('button')!.click();
    expect(readUnplacedWords('note')).toEqual([]);
    area.remove();
  });

  it('opening a note with nothing waiting writes nothing', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro']]));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(typingBuffer()).toBeNull();
    expect(editor.save).not.toHaveBeenCalled();
    editor.unmount();
  });

  it('failure injection: nothing typed leaves nothing behind when the note is left mid-window', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    void splitHeading(editor);
    editor.unmount();
    await waitFor(() => expect(typingBuffer()).toBeNull());
    expect(typingNotice()).toBeNull();
  });

  it('failure injection: words held by a failed save go into the note once it is released', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    editor.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('!');
    expect(await pending).toBe(false);
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(await editor.undo()).toBe(true);
    // r2.3c: the focus is still in the box the person was typing in; the words wait until it leaves (G1).
    typingBuffer()!.blur();
    await waitFor(() => expect(typingBuffer()).toBeNull(), { timeout: 3000 });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text).join('|')).toContain('!');
    area.remove();
  });

  it('kept words keep retrying through refusals and land once the note is released', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]), undefined, { placeRetryMs: 40 });
    editor.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('!');
    expect(await pending).toBe(false);
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    // Several retries are refused while the failed save holds the note.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
    expect(typingNotice()).toBeTruthy();
    expect(await editor.undo()).toBe(true);
    // r2.3c: the focus is still in the box the person was typing in; the words wait until it leaves (G1).
    typingBuffer()!.blur();
    await waitFor(() => expect(typingBuffer()).toBeNull(), { timeout: 3000 });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text).join('|')).toContain('!');
    expect(readUnplacedWords('note')).toEqual([]);
    area.remove();
  });

  it('H: a page going away stores what is in the window at once, with no cleanup or timer needed', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]), undefined, { editorWaitMs: 60_000 });
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('kept');
    window.dispatchEvent(new Event('pagehide'));
    // Read in the same task: an unloading page runs nothing after this.
    expect(readUnplacedWords('note').map((words) => [words.blockId, words.unitId, words.text])).toEqual([['source', 'title', 'Seckept']]);
    editor.unmount();
    document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
    localStorage.clear();
    area.remove();
  });

  it('round 2 #3, condition a by anchor: "od" typed after "body" is not taken for already in "body"', async () => {
    // Red before round 2: 'body'.includes('od') judged the words landed, deleted the record, and wrote nothing.
    rememberUnplacedWords('note', { id: 'od', blockId: 'source', unitId: 'title', initialText: 'body', text: 'bodyod' });
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'body']]));
    await waitFor(() => expect(typingBuffer()).toBeNull());
    expect((editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!).units.map((unit) => unit.text))
      .toEqual(['Intro', 'bodyod']);
    expect(readUnplacedWords('note')).toEqual([]);
    editor.unmount();
  });

  it('round 2 #3, the anchored check: in place counts, a lookalike elsewhere does not', () => {
    expect(typedTextIsPlaced('bodyod', 'bodyod', 'body', 'bodyod')).toBe(true);
    expect(typedTextIsPlaced('body', 'body', 'body', 'bodyod')).toBe(false);
    expect(typedTextIsPlaced('od body', 'od body', 'body', 'bodyod')).toBe(false);
    expect(typedTextIsPlaced('Big Intro', 'Big Intro', 'Intro', 'Big Intro')).toBe(true);
    expect(typedTextIsPlaced('Intro', 'Intro', 'Intro', 'Big Intro')).toBe(false);
    // Enter in the window: the second line lives in the unit after.
    expect(typedTextIsPlaced('Sec\nmore', 'Sec', 'Sec', 'Sec\nmore')).toBe(true);
    expect(typedTextIsPlaced('Sec\nother', 'Sec', 'Sec', 'Sec\nmore')).toBe(false);
  });

  it('round 2 #2: kept words reopened by a later mount are one box for one record, and closing it removes only that record', async () => {
    // A unit that is not in the note: the words cannot land and stay kept.
    rememberUnplacedWords('note', { id: 'kept-a', blockId: 'gone', unitId: 'u', initialText: 'x', text: 'xa' });
    rememberUnplacedWords('note', { id: 'kept-b', blockId: 'gone', unitId: 'v', initialText: 'y', text: 'yb' });
    const boxes = (id: string) => document.querySelectorAll(`textarea[data-structure-typing-entry="${id}"]`).length;
    const shown = () => document.querySelectorAll('textarea[data-structure-typing-buffer]').length;
    const first = renderStructure(textFlow([['body', 'Intro']]));
    await waitFor(() => expect(shown()).toBe(2));
    // Leaving for another page and coming back mounts the note again; the boxes from before are still on screen.
    first.unmount();
    const second = renderStructure(textFlow([['body', 'Intro']]));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    // Red before round 2: the reopened box carried a fresh id, the old one was not found, and two showed.
    expect(shown()).toBe(2);
    expect(boxes('kept-a')).toBe(1);
    expect(boxes('kept-b')).toBe(1);
    const notice = [...document.querySelectorAll<HTMLElement>('[data-structure-typing-notice]')]
      .find((element) => element.dataset.structureTypingEntry === 'kept-a')!;
    notice.querySelector('button')!.click();
    expect(boxes('kept-a')).toBe(0);
    expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['kept-b']);
    document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
    expect(readUnplacedWords('note')).toEqual([]);
    second.unmount();
  });

  it('round 2 #4: the notice sits on the box itself, over no line of the note, and says Discard deletes the words', async () => {
    // Red before round 2: the notice sat 28px above the box, over the line there, and took its clicks.
    const rect = { top: 300, bottom: 330, left: 100, right: 500, width: 400, height: 30, x: 100, y: 300 };
    const original = HTMLTextAreaElement.prototype.getBoundingClientRect;
    HTMLTextAreaElement.prototype.getBoundingClientRect = function () {
      return this.dataset.structureTypingBuffer ? { ...rect, toJSON: () => rect } as DOMRect : original.call(this);
    };
    // On its unit (r2.3: a box with no unit to sit on docks beside the text instead, tested apart).
    const unit = document.createElement('textarea');
    Object.assign(unit.dataset, { runtimeTextflowEditor: 'true', blockId: 'source', textUnitId: 'title' });
    unit.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
    document.body.appendChild(unit);
    try {
      startClean();
      rememberUnplacedWords('note', { id: 'kept-c', blockId: 'source', unitId: 'title', initialText: '', text: 'xc' });
      const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      const notice = typingNotice()!;
      // Inside the box's own rectangle: nothing above, below or beside it is covered.
      const top = parseFloat(notice.style.top);
      const left = parseFloat(notice.style.left);
      expect(top).toBeGreaterThanOrEqual(rect.top);
      expect(top + 16).toBeLessThanOrEqual(rect.bottom);
      expect(left).toBeGreaterThanOrEqual(rect.left);
      expect(left).toBeLessThan(rect.right);
      // The box keeps that width free, so its own words are not under the notice either.
      expect(parseFloat(typingBuffer()!.style.paddingRight)).toBeGreaterThanOrEqual(rect.right - left);
      expect(notice.style.pointerEvents).toBe('none');
      const discard = notice.querySelector('button')!;
      expect(discard.textContent).toBe('Discard');
      expect(discard.style.pointerEvents).toBe('auto');
      expect(notice.title).toMatch(/Discard deletes them/);
      discard.click();
      expect(readUnplacedWords('note')).toEqual([]);
      editor.unmount();
    } finally {
      HTMLTextAreaElement.prototype.getBoundingClientRect = original;
      unit.remove();
    }
  });

  it('round 2 #3b (H-L): words landed from the window stay stored while the save that carries them has not been confirmed', async () => {
    // Tester's H-L in jsdom: the structure ends, the words land as an ordinary edit, the save carrying them never
    // reaches the server, the page goes away. Red before round 2: the record was deleted as the words landed, the
    // page-hide store only keeps an open window, and the words were nowhere.
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('kept');
    expect(await pending).toBe(true);
    const confirmed = editor.save.mock.calls.length;
    editor.save.mockImplementation(() => new Promise(() => {}));
    await waitFor(() => expect(typingBuffer()).toBeNull());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    // The landing's save went out and never answered.
    expect(editor.save.mock.calls.length).toBeGreaterThan(confirmed);
    window.dispatchEvent(new Event('pagehide'));
    const stored = readUnplacedWords('note');
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toContain('kept');
    // Anchored on the unit as it was just before the words landed, in the block that held it then.
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    expect([stored[0].blockId, stored[0].unitId, stored[0].initialText, stored[0].text]).toEqual([created.id, 'title', 'Sec', 'Seckept']);
    editor.unmount();
    localStorage.clear();
    area.remove();
  });

  it('round 2 #3b: once the save carrying the landed words is confirmed, their record is gone', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('kept');
    expect(await pending).toBe(true);
    await waitFor(() => expect(typingBuffer()).toBeNull());
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]));
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    expect(editor.data.textDrafts[created.id]).toBe('Seckept');
    editor.unmount();
    area.remove();
  });

  it('r2.1 #4: the kept box follows its unit when the layout moves after it was placed, and covers no line', async () => {
    // Red in r2: the box was placed once in viewport coordinates and never again. A banner pushed the note down, the
    // box stayed, and it sat over the line above; a click there went into the box.
    const unitAt = { top: 300 };
    const lineAbove = () => ({ top: unitAt.top - 32, bottom: unitAt.top - 4 });
    const rectOf = (top: number, height: number) => ({ top, bottom: top + height, left: 100, right: 500, width: 400, height,
      x: 100, y: top, toJSON: () => ({}) }) as DOMRect;
    const editor = (unitId: string, rect: () => DOMRect) => {
      const area = document.createElement('textarea');
      area.dataset.runtimeTextflowEditor = 'true';
      area.dataset.blockId = 'source';
      area.dataset.textUnitId = unitId;
      area.getBoundingClientRect = rect;
      document.body.appendChild(area);
      return area;
    };
    // The unit the kept words belong to, and the line above it.
    const above = editor('body', () => rectOf(lineAbove().top, 28));
    const unit = editor('title', () => rectOf(unitAt.top, 28));
    const boxTop = () => parseFloat(typingBuffer()!.style.top);
    // jsdom lays nothing out: the box reports the rectangle its own style places it at, as a browser would.
    const original = HTMLTextAreaElement.prototype.getBoundingClientRect;
    HTMLTextAreaElement.prototype.getBoundingClientRect = function () {
      if (!this.dataset.structureTypingBuffer) return original.call(this);
      return rectOf(parseFloat(this.style.top) || 0, 28);
    };
    // No anchor ('' then, 'other text' now): kept, on its unit.
    rememberUnplacedWords('note', { id: 'follow', blockId: 'source', unitId: 'title', initialText: '', text: 'kept' });
    const view = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]));
    try {
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await waitFor(() => expect(boxTop()).toBe(300));
      const stored = JSON.stringify(readUnplacedWords('note'));
      const savesBefore = view.save.mock.calls.length;
      // A banner above the note pushes everything down by 96px; nothing scrolls or resizes.
      unitAt.top = 396;
      await waitFor(() => expect(boxTop()).toBe(396));
      expect(boxTop()).toBeGreaterThanOrEqual(lineAbove().bottom);
      expect(parseFloat(typingNotice()!.style.top)).toBe(398);
      // The notice is inside the box: its top within the box's first line, its left between the box's sides.
      expect(parseFloat(typingNotice()!.style.left)).toBeGreaterThanOrEqual(100);
      expect(parseFloat(typingNotice()!.style.left)).toBeLessThan(500);
      // The banner goes and the page scrolls: the unit moves up past where the box was first placed.
      unitAt.top = 60;
      window.dispatchEvent(new Event('scroll'));
      expect(boxTop()).toBe(60);
      expect(boxTop()).toBeGreaterThanOrEqual(lineAbove().bottom);
      expect(parseFloat(typingNotice()!.style.top)).toBe(62);
      // Still reserving room for the notice after re-placing.
      expect(parseFloat(typingBuffer()!.style.paddingRight)).toBeGreaterThan(200);
      // Following the layout moves only the box: the kept words, their record and the note are untouched.
      expect(typingBuffer()!.value).toBe('kept');
      expect(JSON.stringify(readUnplacedWords('note'))).toBe(stored);
      expect(view.save.mock.calls.length).toBe(savesBefore);
      typingNotice()!.querySelector('button')!.click();
    } finally {
      HTMLTextAreaElement.prototype.getBoundingClientRect = original;
      view.unmount();
      above.remove();
      unit.remove();
    }
  });

  it('r2.2 #1: a kept entry whose words cannot land asks again without touching anything: no undo boundary, no save', async () => {
    startClean();
    // Red in r2.1: every retry called history.boundary() before finding it had nothing to place, which sealed what the
    // person was typing elsewhere and sent a save on every tick.
    rememberUnplacedWords('note', { id: 'stuck', blockId: 'source', unitId: 'title', initialText: '', text: 'kept' });
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
    // Typing in another block: an open typing group, not sealed.
    const ending = editor.data.blocks.find((entry) => entry.id === 'ending')!;
    const before = getTextFlowContent(ending.content_json)!;
    const typed = { ...before, units: before.units.map((unit) => ({ ...unit, text: `${unit.text} more` })) };
    await act(async () => { await editor.result.current.editing.applyEdit(ending, typed, { previousTextFlow: before, metadata: {
      unitId: 'end', inputType: 'insertText', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: 'end', start: 3, end: 3 }, afterSelection: { unitId: 'end', start: 8, end: 8 } } }); });
    const saves = editor.save.mock.calls.length;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
    expect(editor.save.mock.calls.length).toBe(saves);
    expect(typingNotice()).toBeTruthy();
    // The person's own boundary seals it: exactly one save.
    act(() => { editor.result.current.editing.boundary(); });
    await waitFor(() => expect(editor.save.mock.calls.length).toBe(saves + 1));
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });

  it.each([
    ['S-b1', [['w', 'warmup'], ['t', 'Title'], ['b', 'Body text']], 't', 'Title', 'Title\nBody', ['warmup', 'Title', 'Body', 'Body text'], 'landed'],
    ['S-b2', [['s', 'See the Note'], ['i', 'Intro']], 'i', 'Intro', 'Note\nIntro', ['See the Note', 'Note', 'Intro'], 'landed'],
    ['S-a1', [['i', 'My great Intro']], 'i', 'Intro', 'My Intro', ['My great Intro'], 'kept'],
    ['control', [['t', 'Title'], ['o', 'Other']], 't', 'Title', 'Title\nBody', ['Title', 'Body', 'Other'], 'landed'],
  ] as const)('r2.2 #2 (%s): kept words count as already in the note only when the whole typed text closes on a line edge', async (_name, rows, unitId, initialText, text, expected, outcome) => {
    startClean();
    // Red in r2.1: S-b1 and S-b2 matched a lookalike that ran past a line edge and deleted the record (words lost);
    // S-a1 was written again in front of 'Intro' ('My great My Intro').
    rememberUnplacedWords('note', { id: 'shape', blockId: 'source', unitId, initialText, text });
    const editor = renderStructure(textFlow(rows.map(([id, value]) => [id, value] as [string, string])));
    if (outcome === 'landed') await waitFor(() => expect(readUnplacedWords('note')).toEqual([]));
    else await waitFor(() => expect(typingNotice()).toBeTruthy());
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.filter((unit) => unit.status !== 'deleted').map((unit) => unit.text)).toEqual(expected);
    if (outcome === 'kept') {
      expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['shape']);
      typingNotice()!.querySelector('button')!.click();
    }
    editor.unmount();
  });

  it('r2.2 #3: a structure given up while it waited for a batch that never settles does not make the next one wait too', async () => {
    startClean();
    // Red in r2.1: the slot still named the stuck batch, so every later structure waited out a whole watchdog.
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]), undefined, { watchdogMs: 300 });
    editor.reorder.mockImplementationOnce(() => new Promise(() => {}));
    const { area } = noteEditor();
    void splitHeading(editor);
    await waitFor(() => expect(editor.failure).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const roleChange = () => {
      const ending = editor.data.blocks.find((entry) => entry.id === 'ending')!;
      const flow = getTextFlowContent(ending.content_json)!;
      return editor.result.current.heading.onHeadingStructure(ending, { previousTextFlow: flow,
        nextTextFlow: { ...flow, units: flow.units.map((unit) => ({ ...unit, writing_role: 'heading_1' as const })) },
        headingUnitId: 'end', focus: { unitId: 'end', caret: 3 }, inputType: 'insertHeading' });
    };
    // The second structure waits for the stuck batch and is given up by its own watchdog.
    act(() => { void roleChange(); });
    await waitFor(() => expect(editor.failure).toHaveBeenCalledTimes(2), { timeout: 2000 });
    await waitFor(() => expect(editor.result.current.heading.isBusy()).toBe(false));
    document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
    // The third is refused by the history at once instead of waiting another watchdog.
    const started = Date.now();
    act(() => { void roleChange(); });
    await waitFor(() => expect(editor.failure).toHaveBeenCalledTimes(3), { timeout: 2000 });
    expect(Date.now() - started).toBeLessThan(250);
    document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
    document.querySelectorAll('textarea[data-structure-typing-buffer]').forEach((element) => element.remove());
    editor.unmount();
    area.remove();
  });

  it('r2.2 #5 (Y1): kept words from an empty unit do not land in a new empty unit that reused its id', async () => {
    startClean();
    // Red in r2.1: '' === '' took the new line as the words' place, and 'kept' went into the line typed after Enter.
    rememberUnplacedWords('note', { id: 'y1', blockId: 'source', unitId: 'tu-2', initialText: '', text: 'kept\nbody' });
    const editor = renderStructure(textFlow([['tu-1', 'warmup']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    // Enter at the end of 'warmup' makes a new empty unit, numbered tu-2 again; then 'next' is typed into it.
    const edit = async (rows: Array<[string, string]>, unitId: string, caret: number) => {
      const block = editor.data.blocks.find((entry) => entry.id === 'source')!;
      const previous = editor.data.flowDrafts.source ?? getTextFlowContent(block.content_json)!;
      const next = { ...previous, units: rows.map(([id, value], index) => ({ ...previous.units[0], id, text: value, order_index: index })) };
      await act(async () => { await editor.result.current.editing.applyEdit(block, next, { previousTextFlow: previous, metadata: {
        unitId, inputType: 'insertText', kind: 'typing', isComposing: false,
        beforeSelection: { unitId, start: 0, end: 0 }, afterSelection: { unitId, start: caret, end: caret } } }); });
    };
    await edit([['tu-1', 'warmup'], ['tu-2', '']], 'tu-2', 0);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    await edit([['tu-1', 'warmup'], ['tu-2', 'next']], 'tu-2', 4);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text)).toEqual(['warmup', 'next']);
    expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['y1']);
    expect(typingNotice()).toBeTruthy();
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });

  it('r2.2 #6 (i): kept words whose unit a structure moves to a new block go with it, in storage and on screen', async () => {
    startClean();
    // Red in r2.1: the record kept naming the old block, the box looked for the unit there and never found it again.
    const rectOf = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width,
      bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    const original = HTMLTextAreaElement.prototype.getBoundingClientRect;
    HTMLTextAreaElement.prototype.getBoundingClientRect = function () {
      if (!this.dataset.structureTypingBuffer) return original.call(this);
      return rectOf(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, parseFloat(this.style.width) || 0, 28);
    };
    const editors: HTMLTextAreaElement[] = [];
    const editorAt = (blockId: string, unitId: string, top: number) => {
      const area = document.createElement('textarea');
      Object.assign(area.dataset, { runtimeTextflowEditor: 'true', blockId, textUnitId: unitId });
      area.getBoundingClientRect = () => rectOf(100, top, 400, 28);
      document.body.appendChild(area);
      editors.push(area);
      return area;
    };
    try {
      editorAt('source', 'body', 300);
      const title = editorAt('source', 'title', 340);
      // No anchor ('' then, '# Sec' now): kept, on its unit.
      rememberUnplacedWords('note', { id: 'move', blockId: 'source', unitId: 'title', initialText: '', text: 'kept' });
      const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      const box = document.querySelector<HTMLTextAreaElement>('textarea[data-structure-typing-entry="move"]')!;
      await waitFor(() => expect(parseFloat(box.style.top)).toBe(340));
      // The heading is isolated: its unit goes to a block of its own, shown lower down.
      expect(await splitHeading(editor)).toBe(true);
      const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
      title.remove();
      editorAt(created.id, 'title', 420);
      expect(readUnplacedWords('note').find((words) => words.id === 'move')?.blockId).toBe(created.id);
      await waitFor(() => expect(parseFloat(box.style.top)).toBe(420));
      expect(box.value).toBe('kept');
      typingNotice()!.querySelector('button')!.click();
      editor.unmount();
    } finally {
      HTMLTextAreaElement.prototype.getBoundingClientRect = original;
      editors.forEach((area) => area.remove());
    }
  });

  it('r2.2 #6 (ii): when its unit is nowhere on screen, a kept box leaves every line uncovered and stays reachable', async () => {
    startClean();
    // Red in r2.1: the box stayed where it was last put, over the line that moved into its place, and took its keys.
    const rectOf = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width,
      bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    const original = HTMLTextAreaElement.prototype.getBoundingClientRect;
    HTMLTextAreaElement.prototype.getBoundingClientRect = function () {
      if (!this.dataset.structureTypingBuffer) return original.call(this);
      return rectOf(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, parseFloat(this.style.width) || 0, 28);
    };
    const editors: HTMLTextAreaElement[] = [];
    const editorAt = (blockId: string, unitId: string, top: number) => {
      const area = document.createElement('textarea');
      Object.assign(area.dataset, { runtimeTextflowEditor: 'true', blockId, textUnitId: unitId });
      area.getBoundingClientRect = () => rectOf(100, top, 400, 28);
      document.body.appendChild(area);
      editors.push(area);
      return area;
    };
    try {
      editorAt('source', 'body', 300);
      const title = editorAt('source', 'title', 340);
      rememberUnplacedWords('note', { id: 'lost', blockId: 'source', unitId: 'title', initialText: '', text: 'kept' });
      const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      const box = document.querySelector<HTMLTextAreaElement>('textarea[data-structure-typing-entry="lost"]')!;
      await waitFor(() => expect(parseFloat(box.style.top)).toBe(340));
      // Its unit is gone from the screen, and the line below moves up into its place.
      title.remove();
      editorAt('source', 'below', 340);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
      const boxRect = box.getBoundingClientRect();
      for (const area of editors.filter((element) => element.isConnected)) {
        const rect = area.getBoundingClientRect();
        const overlap = boxRect.left < rect.right && rect.left < boxRect.right && boxRect.top < rect.bottom && rect.top < boxRect.bottom;
        expect(overlap, `box over the editor of ${area.dataset.textUnitId}`).toBe(false);
      }
      // Still on screen with its words, saying so; Discard still works.
      expect(box.isConnected).toBe(true);
      expect(box.style.display).not.toBe('none');
      expect(box.value).toBe('kept');
      expect(typingNotice()).toBeTruthy();
      typingNotice()!.querySelector('button')!.click();
      expect(readUnplacedWords('note')).toEqual([]);
      editor.unmount();
    } finally {
      HTMLTextAreaElement.prototype.getBoundingClientRect = original;
      editors.forEach((area) => area.remove());
    }
  });

  it('r2.3 (b): kept heading words still naming the old block do not land in a new empty paragraph that reused the id', async () => {
    startClean();
    // Red before r2.2: '' === '' took the new paragraph for the heading's unit. The record still names the old block,
    // as it would if the page went between the structure moving the unit and the record being rewritten.
    rememberUnplacedWords('note', { id: 'y1b', blockId: 'source', unitId: 'tu-2', initialText: '', text: 'kept\nbody',
      writingRole: 'heading_1' } as Parameters<typeof rememberUnplacedWords>[1]);
    const editor = renderStructure(textFlow([['tu-1', 'warmup'], ['tu-2', '']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text)).toEqual(['warmup', '']);
    expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['y1b']);
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });

  it('r2.3 (c): words kept when a heading block could not be made go back into that empty heading on reopening', async () => {
    startClean();
    // Recovery guard. Landed in r2; red in r2.2, where kept words from an empty unit never landed on their own; landed
    // again in r2.3, because the empty unit found by block and id is still the heading the words were typed in.
    const original = textFlow([['body', 'Intro'], ['title', '']]);
    const first = renderStructure(original);
    first.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    const { area, typeText } = noteEditor();
    let pending!: Promise<boolean>;
    act(() => {
      pending = first.result.current.heading.onHeadingStructure(first.data.blocks[0], { previousTextFlow: first.flows()[0],
        nextTextFlow: textFlow([['body', 'Intro'], ['title', '', 'heading_1']]), headingUnitId: 'title',
        focus: { unitId: 'title', caret: 0 }, inputType: 'insertHeading' });
    });
    typeText('kept');
    expect(await pending).toBe(false);
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    const stored = readUnplacedWords('note');
    expect(stored.map((words) => [words.unitId, words.initialText, words.text])).toEqual([['title', '', 'kept']]);
    // What the server holds: the role change was saved, the new block never made.
    const server = getTextFlowContent(first.data.blocks.find((entry) => entry.id === 'source')!.content_json)!;
    expect(server.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Intro', 'paragraph'], ['', 'heading_1']]);
    // The page goes and the note is opened again.
    first.unmount();
    document.querySelectorAll('textarea[data-structure-typing-buffer], [data-structure-typing-notice]').forEach((element) => element.remove());
    const back = renderStructure(server);
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
    // Landed in the heading; the heading may then move to a block of its own, so the whole note is read.
    const noteText = () => back.data.blocks.map((entry) => (back.data.flowDrafts[entry.id] ?? getTextFlowContent(entry.content_json)!)
      .units.filter((unit) => unit.status !== 'deleted').map((unit) => unit.text).join('|')).join(' / ');
    await waitFor(() => expect(noteText()).toContain('kept'));
    expect(noteText().match(/kept/g)).toHaveLength(1);
    back.unmount();
    area.remove();
  });

  describe('r2.3 kept boxes beside the text (items 7-10)', () => {
    // Layout model. A box's width includes its padding unless its own style says border-box; in the app every element
    // is border-box (global.css), so this content-box arithmetic is the model's, not the browser's. A box is as tall as its height style;
    // its content is one 35px line per line of text. A notice is 180 x 18 where it is put.
    const rectOf = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width,
      bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    let originals: { area: typeof HTMLTextAreaElement.prototype.getBoundingClientRect; div: typeof HTMLDivElement.prototype.getBoundingClientRect;
      scroll: PropertyDescriptor | undefined; width: number };
    const editors: HTMLTextAreaElement[] = [];
    const editorAt = (blockId: string, unitId: string, left: number, top: number, width: number, height: number) => {
      const area = document.createElement('textarea');
      Object.assign(area.dataset, { runtimeTextflowEditor: 'true', blockId, textUnitId: unitId });
      area.getBoundingClientRect = () => rectOf(left, top, width, height);
      document.body.appendChild(area);
      editors.push(area);
      return area;
    };
    const boxOf = (id: string) => document.querySelector<HTMLTextAreaElement>(`textarea[data-structure-typing-entry="${id}"]`)!;
    const noticeOf = (id: string) => document.querySelector<HTMLElement>(`[data-structure-typing-notice][data-structure-typing-entry="${id}"]`)!;
    const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
    beforeEach(() => {
      startClean();
      originals = { area: HTMLTextAreaElement.prototype.getBoundingClientRect, div: HTMLDivElement.prototype.getBoundingClientRect,
        scroll: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight'), width: window.innerWidth };
      HTMLTextAreaElement.prototype.getBoundingClientRect = function () {
        if (!this.dataset.structureTypingBuffer) return originals.area.call(this);
        if (this.style.display === 'none') return rectOf(0, 0, 0, 0);
        const padding = this.style.boxSizing === 'border-box' ? 0
          : (parseFloat(this.style.paddingLeft) || 0) + (parseFloat(this.style.paddingRight) || 0);
        return rectOf(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0,
          (parseFloat(this.style.width) || 0) + padding, parseFloat(this.style.height) || 0);
      };
      HTMLDivElement.prototype.getBoundingClientRect = function () {
        if (!this.dataset.structureTypingNotice || !this.style.left) return originals.div.call(this);
        return rectOf(parseFloat(this.style.left), parseFloat(this.style.top) || 0, 180, 18);
      };
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true,
        get(this: HTMLTextAreaElement) { return this.dataset.structureTypingBuffer ? this.value.split('\n').length * 35 : 0; } });
    });
    afterEach(() => {
      document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => { if (button.textContent === 'Discard') button.click(); });
      HTMLTextAreaElement.prototype.getBoundingClientRect = originals.area;
      HTMLDivElement.prototype.getBoundingClientRect = originals.div;
      if (originals.scroll) Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originals.scroll);
      else delete (HTMLTextAreaElement.prototype as { scrollHeight?: number }).scrollHeight;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originals.width });
      editors.splice(0).forEach((area) => area.remove());
      startClean();
    });

    it('(a) on a 35px unit, two lines of kept words stay 35px tall (scrolling inside) and cover nothing below', async () => {
      // Red in r2.2: the box grew to 70px over 'below', then docked away from its unit.
      editorAt('source', 'title', 100, 300, 400, 35);
      const below = editorAt('source', 'below', 100, 335, 400, 35);
      rememberUnplacedWords('note', { id: 'tall', blockId: 'source', unitId: 'title', initialText: '', text: 'kept\nbody' });
      const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'other text']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await settle();
      const box = boxOf('tall');
      expect(parseFloat(box.style.top)).toBe(300);
      expect(parseFloat(box.style.height)).toBeLessThanOrEqual(35);
      expect(overlap(box.getBoundingClientRect(), below.getBoundingClientRect())).toBe(false);
      expect(box.value).toBe('kept\nbody');
      editor.unmount();
    });

    it('(b) with no unit and no margin wide enough either side, the box folds to a strip that covers no line', async () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
      editorAt('source', 'body', 50, 300, 900, 35);
      editorAt('source', 'other', 50, 340, 900, 35);
      rememberUnplacedWords('note', { id: 'fold', blockId: 'gone', unitId: 'u', initialText: 'x', text: 'xc' });
      const editor = renderStructure(textFlow([['body', 'Intro']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await settle();
      expect(boxOf('fold').style.display).toBe('none');
      const strip = noticeOf('fold').getBoundingClientRect();
      for (const area of editors) expect(overlap(strip, area.getBoundingClientRect())).toBe(false);
      // The words are one click away, and Discard is still there.
      const [discard, show] = [...noticeOf('fold').querySelectorAll('button')];
      expect(discard.textContent).toBe('Discard');
      expect(show.hidden).toBe(false);
      show.click();
      expect(boxOf('fold').style.display).not.toBe('none');
      expect(boxOf('fold').value).toBe('xc');
      editor.unmount();
    });

    it('(c) two kept boxes with no unit never overlap, and each Discard removes only its own words', async () => {
      // Red in r2.2: both docked at the same place; the Discard found for one removed the other.
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
      editorAt('source', 'body', 100, 300, 400, 35);
      rememberUnplacedWords('note', { id: 'one', blockId: 'gone', unitId: 'u', initialText: 'x', text: 'x one' });
      rememberUnplacedWords('note', { id: 'two', blockId: 'gone', unitId: 'v', initialText: 'y', text: 'y two' });
      const editor = renderStructure(textFlow([['body', 'Intro']]));
      await waitFor(() => expect(document.querySelectorAll('[data-structure-typing-notice]')).toHaveLength(2));
      await settle();
      const [a, b] = [boxOf('one').getBoundingClientRect(), boxOf('two').getBoundingClientRect()];
      expect(overlap(a, b)).toBe(false);
      expect(overlap(noticeOf('one').getBoundingClientRect(), noticeOf('two').getBoundingClientRect())).toBe(false);
      for (const box of [a, b]) for (const area of editors) expect(overlap(box, area.getBoundingClientRect())).toBe(false);
      noticeOf('one').querySelector('button')!.click();
      expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['two']);
      expect(boxOf('two').value).toBe('y two');
      editor.unmount();
    });

    it('(d) with no unit and room on the left only, the box docks wholly left of the text column', async () => {
      // Docked wholly outside the column. (r2.3 claimed content-box padding pushed the r2.2 box into the column; the app
      // sets border-box on everything, so that was this file's layout model, not the browser: retracted in r2.3b.)
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
      editorAt('source', 'body', 400, 300, 590, 35);
      rememberUnplacedWords('note', { id: 'left', blockId: 'gone', unitId: 'u', initialText: 'x', text: 'xc' });
      const editor = renderStructure(textFlow([['body', 'Intro']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await settle();
      const box = boxOf('left').getBoundingClientRect();
      expect(boxOf('left').style.display).not.toBe('none');
      expect(box.right).toBeLessThanOrEqual(400);
      expect(box.left).toBeGreaterThanOrEqual(0);
      const notice = noticeOf('left').getBoundingClientRect();
      expect(notice.left).toBeGreaterThanOrEqual(box.left);
      expect(notice.top).toBeGreaterThanOrEqual(box.top);
      editor.unmount();
    });
  });

  it('r2.3b F1: a record with no role does not take one from the empty unit that now has its id', async () => {
    startClean();
    // Red in r2.3: the role was filled in from the unit in front of it, then compared with that same unit, so an
    // older record with no role always matched and its words landed in whatever empty unit now had the id.
    rememberUnplacedWords('note', { id: 'f1', blockId: 'source', unitId: 'tu-2', initialText: '', text: 'kept' });
    const editor = renderStructure(textFlow([['tu-1', 'warmup'], ['tu-2', '']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text)).toEqual(['warmup', '']);
    expect(readUnplacedWords('note').map((words) => words.id)).toEqual(['f1']);
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });

  it('r2.3b F2: kept while their unit was not there, words take no role from a paragraph that later reuses the id', async () => {
    startClean();
    // Red in r2.3: with no role yet, each keystroke in the box stored the words again, reading the role from the new
    // empty paragraph with the same id; the next retry then matched it and the words landed there.
    rememberUnplacedWords('note', { id: 'f2', blockId: 'source', unitId: 'tu-2', initialText: '', text: 'kept' });
    const editor = renderStructure(textFlow([['tu-1', 'warmup']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    // Enter at the end of 'warmup': a new empty paragraph, numbered tu-2.
    const block = editor.data.blocks.find((entry) => entry.id === 'source')!;
    const previous = editor.data.flowDrafts.source ?? getTextFlowContent(block.content_json)!;
    const next = { ...previous, units: [previous.units[0], { ...previous.units[0], id: 'tu-2', text: '', order_index: 1 }] };
    await act(async () => { await editor.result.current.editing.applyEdit(block, next, { previousTextFlow: previous, metadata: {
      unitId: 'tu-2', inputType: 'insertParagraph', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: 'tu-1', start: 6, end: 6 }, afterSelection: { unitId: 'tu-2', start: 0, end: 0 } } }); });
    // A key typed in the box stores the words again.
    const box = typingBuffer()!;
    box.setRangeText('!', box.value.length, box.value.length, 'end');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
    const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(flow.units.map((unit) => unit.text)).toEqual(['warmup', '']);
    expect(readUnplacedWords('note').map((words) => [words.id, words.text])).toEqual([['f2', 'kept!']]);
    expect((readUnplacedWords('note')[0] as { writingRole?: string }).writingRole).toBeUndefined();
    typingNotice()!.querySelector('button')!.click();
    editor.unmount();
  });

  it('r2.3b ②: kept words landing on their own only go back in: no structure, no window, focus and caret left alone', async () => {
    startClean();
    // Red in r2.3: the landing asked for the heading's structure, which opened a window that took the focus (and held
    // the note busy) while the person was writing somewhere else.
    const elsewhere = document.createElement('textarea');
    elsewhere.value = 'writing here';
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    elsewhere.setSelectionRange(4, 7);
    rememberUnplacedWords('note', { id: 'bg', blockId: 'source', unitId: 'title', initialText: '', text: 'kept\nbody',
      writingRole: 'heading_1' } as Parameters<typeof rememberUnplacedWords>[1]);
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '', 'heading_1']]));
    let busySeen = false;
    const watch = setInterval(() => { if (editor.result.current.heading.isBusy()) busySeen = true; }, 2);
    try {
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
      // The words are back where they were typed, the heading still sharing its block with the line after it.
      const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
      expect(flow.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Intro', 'paragraph'], ['kept', 'heading_1'], ['body', 'paragraph']]);
      // Nothing else happened: no structure, no window, no busy spell, focus and caret where the person left them.
      expect(editor.create).not.toHaveBeenCalled();
      expect(editor.transfer).not.toHaveBeenCalled();
      expect(busySeen).toBe(false);
      expect(typingBuffer()).toBeNull();
      expect(document.activeElement).toBe(elsewhere);
      expect([elsewhere.selectionStart, elsewhere.selectionEnd]).toEqual([4, 7]);
    } finally {
      clearInterval(watch);
      editor.unmount();
      elsewhere.remove();
    }
  });

  it('r2.3b ③④: the box has no transition to trail behind its unit, and its notice says the words go back on their own', async () => {
    startClean();
    // Red in r2.3: the page-wide textarea transition applied to the box (the check read it halfway), and the notice
    // asked people to copy words that later go back by themselves, which put them in the note twice.
    rememberUnplacedWords('note', { id: 'copy', blockId: 'gone', unitId: 'u', initialText: 'x', text: 'xc' });
    const editor = renderStructure(textFlow([['body', 'Intro']]));
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(typingBuffer()!.style.transition).toBe('none');
    const notice = typingNotice()!;
    // r2.3c (G4): copying is offered for when they do not go back, not as the first thing to do.
    expect(notice.title).not.toMatch(/^.*Copy them before/);
    expect(notice.title).toMatch(/may go back on their own/);
    expect(notice.title).toMatch(/copy them or discard them/i);
    expect(notice.title).toMatch(/Discard deletes them/);
    notice.querySelector('button')!.click();
    editor.unmount();
  });

  it('r2.3c TWO2: two kept records landing in one block on reopening both stay; the second does not write over the first', async () => {
    startClean();
    // Red in r2.3b: the reopened note placed every record in one go inside an effect, where the edit of the first could
    // not reach the note before the second read it; the second was merged onto the text from before the first and
    // saved, and 'one' / 'aaa' were gone (Tester TWO2-0).
    rememberUnplacedWords('note', { id: 'one', blockId: 'source', unitId: 'h', initialText: '', text: 'one\naaa',
      writingRole: 'heading_1' } as Parameters<typeof rememberUnplacedWords>[1]);
    rememberUnplacedWords('note', { id: 'two', blockId: 'source', unitId: 'p', initialText: '', text: 'two\nbbb',
      writingRole: 'paragraph' } as Parameters<typeof rememberUnplacedWords>[1]);
    const editor = renderStructure(textFlow([['w', 'warmup'], ['p', ''], ['h', '', 'heading_1']]));
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
    const shown = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    const saved = getTextFlowContent(editor.data.blocks.find((entry) => entry.id === 'source')!.content_json)!;
    for (const flow of [shown, saved]) {
      const text = flow.units.filter((unit) => unit.status !== 'deleted').map((unit) => unit.text).join('|');
      for (const word of ['warmup', 'one', 'aaa', 'two', 'bbb']) expect(text.split('|').filter((line) => line === word), `${word} in ${text}`).toHaveLength(1);
    }
    expect(shown.units.find((unit) => unit.text === 'one')?.writing_role).toBe('heading_1');
    editor.unmount();
  });

  describe('A-20b r2 (乙): only a window\'s line break is Enter', () => {
    const landedTexts = (editor: ReturnType<typeof renderStructure>) => {
      const flow = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
      return flow.units.filter((unit) => unit.status !== 'deleted').map((unit) => unit.text);
    };
    const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); }); };

    // Red on r1 (Tester SHIFTENTER-close): Shift+Enter at the end of 'abc' kept by the text history came back as
    // ['abc', '', 'q'], the soft line break landed as a new empty line.
    it('an edit record "abc⏎" lands as one line, its line break kept inside it', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'edit-1', blockId: 'source', unitId: 'a', initialText: 'abc', text: 'abc\n',
        writingRole: 'paragraph', source: 'edit' } as Parameters<typeof rememberUnplacedWords>[1]);
      const editor = renderStructure(textFlow([['a', 'abc'], ['q', 'q']]));
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await settle();
      expect(landedTexts(editor)).toEqual(['abc\n', 'q']);
      editor.unmount();
    });

    // Red on r1: the same record shape already existed in r3e and split into ['abc', 'd'].
    it('an edit record "abc⏎d" lands as one line', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'edit-2', blockId: 'source', unitId: 'a', initialText: 'abc', text: 'abc\nd',
        writingRole: 'paragraph', source: 'edit' } as Parameters<typeof rememberUnplacedWords>[1]);
      const editor = renderStructure(textFlow([['a', 'abc'], ['q', 'q']]));
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await settle();
      expect(landedTexts(editor)).toEqual(['abc\nd', 'q']);
      editor.unmount();
    });

    // Red on r1: reopening rewrote the record without its source (storedWords), so the next opening split it.
    it('an edit record that cannot land on one opening keeps its source, and lands as one line on the next', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'edit-3', blockId: 'source', unitId: 'a', initialText: 'abc', text: 'abc\nd',
        writingRole: 'paragraph', source: 'edit' } as Parameters<typeof rememberUnplacedWords>[1]);
      // 'zzz' gives the words no anchor: they are kept (and stored again by the box).
      const held = renderStructure(textFlow([['a', 'zzz'], ['q', 'q']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await settle();
      expect(readUnplacedWords('note')).toEqual([expect.objectContaining({ id: 'edit-3', text: 'abc\nd', source: 'edit' })]);
      held.unmount();
      startCleanScreenOnly();
      const editor = renderStructure(textFlow([['a', 'abc'], ['q', 'q']]));
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await settle();
      expect(landedTexts(editor)).toEqual(['abc\nd', 'q']);
      editor.unmount();
    });

    // Green on r1 and r2: a window's Enter, and a record with no source (older format, a window's too), still split.
    it('a window record "abc⏎d" still splits into two lines', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'win-1', blockId: 'source', unitId: 'a', initialText: 'abc', text: 'abc\nd',
        writingRole: 'paragraph', source: 'window' } as Parameters<typeof rememberUnplacedWords>[1]);
      const editor = renderStructure(textFlow([['a', 'abc'], ['q', 'q']]));
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await settle();
      expect(landedTexts(editor)).toEqual(['abc', 'd', 'q']);
      editor.unmount();
    });

    it('a record with no source "abc⏎d" still splits into two lines', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'old-1', blockId: 'source', unitId: 'a', initialText: 'abc', text: 'abc\nd',
        writingRole: 'paragraph' } as Parameters<typeof rememberUnplacedWords>[1]);
      const editor = renderStructure(textFlow([['a', 'abc'], ['q', 'q']]));
      await waitFor(() => expect(readUnplacedWords('note')).toEqual([]), { timeout: 3000 });
      await settle();
      expect(landedTexts(editor)).toEqual(['abc', 'd', 'q']);
      editor.unmount();
    });

    // Green on r1 and r2: a split record with no line break (empty start, no role) has no anchor and stays in the box,
    // the note untouched, as before.
    it('a split record without a line break behaves as on r1: kept, nothing written', async () => {
      startClean();
      rememberUnplacedWords('note', { id: 'split-1', blockId: 'source', unitId: 'n', initialText: '', text: 'xyz',
        source: 'split' } as Parameters<typeof rememberUnplacedWords>[1]);
      const editor = renderStructure(textFlow([['a', 'abc'], ['n', '']]));
      await waitFor(() => expect(typingNotice()).toBeTruthy());
      await settle();
      expect(landedTexts(editor)).toEqual(['abc', '']);
      expect(readUnplacedWords('note')).toEqual([expect.objectContaining({ id: 'split-1', text: 'xyz' })]);
      expect(editor.save).not.toHaveBeenCalled();
      typingNotice()!.querySelector('button')!.click();
      editor.unmount();
    });
  });

  it('r2.3c G1: kept words do not land while the person is typing in their box; they land once the focus leaves', async () => {
    startClean();
    // Red in r2.3b: a retry landed the words while the person was in the box, and their next keys went nowhere.
    rememberUnplacedWords('note', { id: 'g1', blockId: 'source', unitId: 'title', initialText: '', text: 'kept',
      writingRole: 'heading_1' } as Parameters<typeof rememberUnplacedWords>[1]);
    // The unit is not there yet: the words are kept.
    const editor = renderStructure(textFlow([['body', 'Intro']]), undefined, { placeRetryMs: 40 });
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    const box = typingBuffer()!;
    box.focus();
    expect(document.activeElement).toBe(box);
    // Now the empty heading they belong to is there.
    const block = editor.data.blocks.find((entry) => entry.id === 'source')!;
    const previous = editor.data.flowDrafts.source ?? getTextFlowContent(block.content_json)!;
    const next = { ...previous, units: [previous.units[0], { ...previous.units[0], id: 'title', text: '', writing_role: 'heading_1' as const, order_index: 1 }] };
    await act(async () => { await editor.result.current.editing.applyEdit(block, next, { previousTextFlow: previous, metadata: {
      unitId: 'title', inputType: 'insertParagraph', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: 'body', start: 5, end: 5 }, afterSelection: { unitId: 'title', start: 0, end: 0 } } }); });
    // Several retries go by while the focus is in the box: nothing lands, the box and its words stay.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(typingBuffer()).toBe(box);
    expect(box.value).toBe('kept');
    const during = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(during.units.map((unit) => unit.text)).toEqual(['Intro', '']);
    // The focus leaves: the next ask lands them.
    box.blur();
    await waitFor(() => expect(typingBuffer()).toBeNull(), { timeout: 3000 });
    const after = editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!;
    expect(after.units.map((unit) => unit.text)).toEqual(['Intro', 'kept']);
    expect(readUnplacedWords('note')).toEqual([]);
    editor.unmount();
  });

  it('r2.3c G2: the role kept with the words is the unit role at the moment they are kept, and later typing does not change it', async () => {
    startClean();
    // Guard for the moment the role is settled (retainWords): kept on a failed create, the words carry the heading
    // role their unit had then, and the box rewriting its record on every key does not read it again.
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    editor.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    const { area, typeText } = noteEditor();
    const pending = splitHeading(editor);
    typeText('!');
    expect(await pending).toBe(false);
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    const role = () => (readUnplacedWords('note')[0] as { writingRole?: string }).writingRole;
    expect(role()).toBe('heading_1');
    // The heading is undone to a paragraph; then a key in the box stores the words again.
    expect(await editor.undo()).toBe(true);
    const box = typingBuffer()!;
    box.setRangeText('?', box.value.length, box.value.length, 'end');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(role()).toBe('heading_1');
    typingNotice()!.querySelector('button')!.click();
    area.remove();
  });

  it('condition a: words that landed before the page went away are not written twice', async () => {
    rememberUnplacedWords('note', { id: 'landed', blockId: 'source', unitId: 'title', initialText: 'Sec', text: 'Seckept' });
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', 'Seckept']]));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    expect(typingBuffer()).toBeNull();
    expect(editor.save).not.toHaveBeenCalled();
    expect(readUnplacedWords('note')).toEqual([]);
    editor.unmount();
  });

  it('condition b: leaving is released within the watchdog when writes never settle, and the words are kept', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]), undefined,
      { whenWritesIdle: () => new Promise<void>(() => {}), watchdogMs: 300 });
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('kept');
    const started = Date.now();
    let released = false;
    void editor.result.current.heading.whenTypingSettled().then(() => { released = true; });
    await waitFor(() => expect(released).toBe(true), { timeout: 2000 });
    expect(Date.now() - started).toBeLessThan(1500);
    // In the note or kept on screen and stored: never nowhere.
    await waitFor(() => {
      const inNote = Object.values(editor.data.textDrafts).some((text) => text.includes('kept'));
      const kept = readUnplacedWords('note').some((words) => words.text.includes('kept'));
      expect(inNote || kept).toBe(true);
    });
    editor.unmount();
    document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
    localStorage.clear();
    area.remove();
  });

  it('past the limit the notice asks for attention, and no kept words are dropped', async () => {
    for (let index = 0; index < UNPLACED_WORDS_LIMIT; index += 1) {
      rememberUnplacedWords('note', { id: `old-${index}`, blockId: 'gone', unitId: 'gone', initialText: '', text: `old ${index}` });
    }
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    editor.create.mockImplementationOnce(async () => { throw new Error('synthetic create failure'); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    const pending = splitHeading(editor);
    const window = document.activeElement as HTMLTextAreaElement;
    expect(window.dataset.structureTypingBuffer).toBe('true');
    window.setRangeText('!', window.value.length, window.value.length, 'end');
    window.dispatchEvent(new Event('input', { bubbles: true }));
    expect(await pending).toBe(false);
    await waitFor(() => expect(readUnplacedWords('note')).toHaveLength(UNPLACED_WORDS_LIMIT + 1));
    const notices = [...document.querySelectorAll<HTMLElement>('[data-structure-typing-notice]')];
    expect(notices).toHaveLength(UNPLACED_WORDS_LIMIT + 1);
    expect(notices.some((notice) => notice.textContent?.includes('Many kept words'))).toBe(true);
    editor.unmount();
    notices.forEach((notice) => notice.querySelector('button')!.click());
    expect(readUnplacedWords('note')).toEqual([]);
  });

  it('leaving waits for typed words to be placed', async () => {
    const editor = renderStructure(textFlow([['body', 'Intro'], ['title', '# Sec']]));
    const { area, typeText } = noteEditor();
    void splitHeading(editor);
    typeText('x');
    let settled = false;
    void editor.result.current.heading.whenTypingSettled().then(() => { settled = true; });
    expect(settled).toBe(false);
    await waitFor(() => expect(settled).toBe(true));
    const created = editor.data.blocks.find((entry) => entry.id.startsWith('new-'))!;
    expect(editor.data.textDrafts[created.id]).toBe('Secx');
    area.remove();
  });

  it('a structure whose writes never settle is abandoned by the watchdog: busy released, failure shown, keys kept', async () => {
    const { original, request } = emptyBlockHeading();
    const editor = renderStructure(original, undefined, { whenWritesIdle: () => new Promise<void>(() => {}), watchdogMs: 200 });
    const { area, typeText } = noteEditor();
    act(() => { void editor.result.current.heading.onHeadingStructure(editor.data.blocks[0], request); });
    expect(editor.result.current.heading.isBusy()).toBe(true);
    expect(typeText('kept')).toBe(false);
    await waitFor(() => expect(editor.result.current.heading.busy).toBe(false));
    expect(editor.failure).toHaveBeenCalledTimes(1);
    // The role edit never ran, so the unit is still empty and nothing in it anchors 'Seckept'. Round 2 (3a): the
    // words are kept on screen and stored, not put into the unit with 'Sec' silently dropped.
    await waitFor(() => expect(typingNotice()).toBeTruthy());
    expect(typingBuffer()!.value).toBe('Seckept');
    expect((editor.data.flowDrafts.source ?? getTextFlowContent(editor.data.blocks[0].content_json)!).units.map((unit) => unit.text)).toEqual(['']);
    expect(readUnplacedWords('note').map((words) => words.text)).toEqual(['Seckept']);
    expect(typeText('later')).toBe(true);
    typingNotice()!.querySelector('button')!.click();
    area.remove();
  });
});
