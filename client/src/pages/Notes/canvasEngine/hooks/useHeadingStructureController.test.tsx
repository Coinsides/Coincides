import { act, renderHook, waitFor } from '@testing-library/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import { createTextBlockContentV1, getTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { useHeadingStructureController } from './useHeadingStructureController';
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
function renderStructure(original: TextBlockContentV1, ending = textFlow([['end', 'End']])) {
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
      template, textHistory: editing, reorderBlocks: reorder, onFocusBlock: focus, onFailure: failure });
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
});
