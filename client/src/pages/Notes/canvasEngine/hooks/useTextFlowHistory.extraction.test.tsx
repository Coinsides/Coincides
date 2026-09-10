import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import type { TemplateOption } from '@/services/templateOptions';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { extractTextUnit } from '../textUnitExtractionService';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';

const template: TemplateOption = { template_id: 'text.paragraph', template_key: 'text.paragraph', template_version: '1.0.0',
  label: 'Text', description: 'Text', system_type: 'text', learning_role: 'note', legacy_block_type: 'paragraph',
  default_content: {}, origin: 'test', status: 'active', isRuntime: false };
const layout = { x: 273, y: 418, width: 420, height: 64 };
const textOf = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');

function renderExtraction(role: 'todo_item' | 'bullet_item' = 'todo_item') {
  const flow = createTextBlockContentV1('alpha');
  flow.units.push({ ...flow.units[0], id: 'move', text: 'keep every field', writing_role: role, order_index: 1,
    indent_level: 2, metadata: { checked: true, nested: { keep: 'value' } } });
  flow.units.push({ ...flow.units[0], id: 'last', text: 'omega', order_index: 2 });
  flow.inline_structures.push({ id: 'inline', parent_text_unit_id: 'move', semantic_kind: 'inline_link',
    anchor_range: { start: 1, end: 4 }, anchor_text: 'eep', field_values: { url: 'https://example.test' },
    metadata: { original: true }, status: 'active' });
  const originalBlock: NoteBlock = { id: 'source', block_type: 'paragraph', title: 'retained',
    content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: textOf(flow), metadata: { keep: true },
    order_index: 0, source_references: [], placement_id: 'placement-source', display_overrides_json: {}, text_save_revision: 0 };
  const originalAnnotation: AnnotationTruthV1 = { id: 'ann', note_id: 'note', canvas_id: 'canvas', raw_label: 'keep label',
    ranges: [{ id: 'range', target_kind: 'text_span', block_id: 'source', text_flow_id: 'textflow-source', text_unit_id: 'move',
      start_offset: 1, end_offset: 4, range_text_cache: 'eep', metadata: { keep: true } }],
    parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
    created_by: 'human', status: 'active', created_at: 'created', updated_at: 'updated' };
  const originalBoard: BoardTextRangeV1 = { id: 'board-range', note_id: 'note', board_id: 'board', block_id: 'source',
    text_flow_id: 'textflow-source', text_unit_id: 'move', start_offset: 1, end_offset: 4, excerpt: 'eep',
    status: 'active', pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated' };
  const board = createBoardTextRangeEditSession('note', async (_note, updates) => updates);
  board.hydrate([originalBoard]);
  const data = { blocks: [structuredClone(originalBlock)], annotations: [structuredClone(originalAnnotation)],
    flowDrafts: {} as Record<string, TextBlockContentV1>, textDrafts: {} as Record<string, string> };
  let update = () => {};
  const create = vi.fn(async (_template: TemplateOption, _text: string, options: { contentJson?: Record<string, unknown>; layout?: typeof layout; clientCreateKey: string }) => {
    const created: NoteBlock = { ...originalBlock, id: 'created', title: null, order_index: 1,
      content_json: options.contentJson!, plain_text: '', canvas_layout: options.layout };
    data.blocks.push(created); update(); return { block: created, clientCreateKey: options.clientCreateKey, placementPersisted: true, reused: false };
  });
  const savePlacement = vi.fn(async (block: NoteBlock) => { const placed = { ...block, canvas_layout: layout };
    data.blocks = [...data.blocks.filter((candidate) => candidate.id !== block.id), placed]; update(); return placed; });
  const discard = vi.fn(async () => true);
  const trash = vi.fn(async (id: string) => {
    data.blocks = data.blocks.filter((block) => block.id !== id);
    delete data.flowDrafts[id]; delete data.textDrafts[id]; update(); return true;
  });
  const restore = vi.fn(async (block: NoteBlock) => { data.blocks.push(block); update(); return block; });
  type Transfer = NonNullable<Parameters<typeof useTextFlowHistory>[0]['transferTextUnit']>;
  const transfer = vi.fn<Transfer>(async (input) => {
    const sourceBlock = { ...input.sourceBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.sourceTextFlow },
      plain_text: textOf(input.sourceTextFlow), ...input.sourcePayload, text_save_revision: input.sourceBaseRevision + 1 };
    const targetBlock = { ...input.targetBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.targetTextFlow },
      plain_text: textOf(input.targetTextFlow), ...input.targetPayload, text_save_revision: input.targetBaseRevision + 1 };
    data.blocks = data.blocks.map((block) => block.id === sourceBlock.id ? sourceBlock : block.id === targetBlock.id ? targetBlock : block);
    data.flowDrafts = { ...data.flowDrafts, [sourceBlock.id]: input.sourceTextFlow, [targetBlock.id]: input.targetTextFlow };
    data.textDrafts = { ...data.textDrafts, [sourceBlock.id]: sourceBlock.plain_text ?? '', [targetBlock.id]: targetBlock.plain_text ?? '' };
    data.annotations = data.annotations.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) =>
      range.block_id === sourceBlock.id && range.text_unit_id === input.textUnitId
        ? { ...range, block_id: targetBlock.id, text_flow_id: `textflow-${targetBlock.id}` } : range) }));
    board.acceptUnitTransfer({ ...input, sourceBlockId: sourceBlock.id, targetBlockId: targetBlock.id,
      confirmedRanges: board.snapshot(sourceBlock.id).ranges.map((range) => ({ ...range,
        block_id: targetBlock.id, text_flow_id: `textflow-${targetBlock.id}` })) });
    update(); return { sourceBlock, targetBlock };
  });
  const subject = renderHook(({ generation }) => {
    const [, force] = useState(0); update = () => force((value) => value + 1);
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({ noteId: 'note', generation, blocks: data.blocks,
      annotationTruths: data.annotations, readAnnotationTruths: () => data.annotations,
      setAnnotationTruthsSnapshot: (annotations) => { data.annotations = annotations; update(); },
      blockTextFlowDrafts: data.flowDrafts,
      setBlockTextFlowDrafts: (value) => { data.flowDrafts = typeof value === 'function' ? value(data.flowDrafts) : value; update(); },
      setBlockTextDrafts: (value) => { data.textDrafts = typeof value === 'function' ? value(data.textDrafts) : value; update(); },
      captureBoardTextRanges: board.snapshot, restoreBoardTextRanges: board.restore, rebaseBoardTextRanges: board.rebase,
      saveBlock: async (block) => ({ status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' }),
      saveAnnotationTruthsOutcome: async () => true, history: host,
      createDraftBlock: create, saveDraftBlockPlacement: savePlacement, discardDraftBlock: discard,
      trashBlock: trash, restoreBlock: restore, transferTextUnit: transfer,
    });
    const history = usePlacementHistory({ noteId: 'note', generation, beforeHistoryBoundary: () => editing.boundary(),
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    return { editing, history };
  }, { initialProps: { generation: 1 } });
  const extract = async () => { let saved = false;
    await act(async () => { saved = await subject.result.current.editing.extractUnit(originalBlock, 'move', template, layout); });
    return saved;
  };
  return { ...subject, extract, flow, originalBlock, originalAnnotation, originalBoard, data, board, create, savePlacement, discard, trash, restore, transfer };
}

describe('B10 extraction through the B6b document history entry', () => {
  it.each(['todo_item', 'bullet_item'] as const)('keeps %s and every unit/inline/anchor field through extraction, one undo and redo', async (role) => {
    const editor = renderExtraction(role);
    expect(await editor.extract()).toBe(true);
    expect(editor.create).toHaveBeenCalledTimes(1);
    expect(editor.create.mock.calls[0][2]?.layout).toEqual(layout);
    expect(editor.data.flowDrafts.created).toEqual(extractTextUnit(editor.flow, 'move')!.extracted);
    expect(editor.data.flowDrafts.source).toEqual(extractTextUnit(editor.flow, 'move')!.remaining);
    expect(editor.data.annotations[0]).toEqual({ ...editor.originalAnnotation, ranges: [{ ...editor.originalAnnotation.ranges[0],
      block_id: 'created', text_flow_id: 'textflow-created' }] });
    expect(editor.board.snapshot('created').ranges).toEqual([{ ...editor.originalBoard, block_id: 'created', text_flow_id: 'textflow-created' }]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks.map((block) => block.id)).toEqual(['source']);
    expect(editor.data.flowDrafts.source).toEqual(editor.flow);
    expect(editor.data.blocks[0].content_json).toEqual(editor.originalBlock.content_json);
    expect(editor.data.blocks[0].plain_text).toEqual(editor.originalBlock.plain_text);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    expect(editor.board.snapshot('source').ranges).toEqual([editor.originalBoard]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.create).toHaveBeenCalledTimes(1);
    expect(editor.restore).toHaveBeenCalledTimes(1);
    expect(editor.data.flowDrafts.created).toEqual(extractTextUnit(editor.flow, 'move')!.extracted);
    expect(editor.data.blocks.find((block) => block.id === 'created')?.canvas_layout).toEqual(layout);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
  });

  it('a failed creation leaves the original complete and the same entry can retry', async () => {
    const editor = renderExtraction();
    editor.create.mockResolvedValueOnce(null!);
    expect(await editor.extract()).toBe(false);
    expect(editor.data.blocks).toEqual([editor.originalBlock]);
    expect(editor.transfer).not.toHaveBeenCalled();
    await expect(editor.result.current.editing.flush()).rejects.toThrow('could not be saved');
    await act(async () => { expect((await editor.result.current.editing.saveBlock(editor.originalBlock, 'ignored')).status).toBe('saved'); });
    expect(editor.create).toHaveBeenCalledTimes(2);
    expect(editor.create.mock.calls[0][2].clientCreateKey).toBe(editor.create.mock.calls[1][2].clientCreateKey);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts.source).toEqual(editor.flow);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('a failed placement blocks the move and retries the existing destination placement', async () => {
    const editor = renderExtraction();
    const create = editor.create.getMockImplementation()!;
    editor.create.mockImplementationOnce(async (...args) => ({ ...await create(...args), placementPersisted: false }));
    expect(await editor.extract()).toBe(false);
    expect(editor.transfer).not.toHaveBeenCalled();
    expect(editor.data.blocks[0]).toEqual(editor.originalBlock);
    await act(async () => { expect((await editor.result.current.editing.saveBlock(editor.originalBlock, 'ignored')).status).toBe('saved'); });
    expect(editor.create).toHaveBeenCalledTimes(1);
    expect(editor.savePlacement).toHaveBeenCalledTimes(1);
    expect(editor.transfer).toHaveBeenCalledTimes(1);
  });

  it('an unavailable atomic transfer preserves the source and undo cannot trash an unresolved destination', async () => {
    const editor = renderExtraction();
    const transfer = editor.transfer.getMockImplementation()!;
    editor.transfer.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await editor.extract()).toBe(false);
    expect(editor.data.blocks[0]).toEqual(editor.originalBlock);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(editor.trash).not.toHaveBeenCalled();
    editor.transfer.mockImplementation(transfer);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts.source).toEqual(editor.flow);
    expect(editor.data.blocks.map((block) => block.id)).toEqual(['source']);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
  });

  it('undo trash failure retries only the lifecycle after the inverse transfer succeeded', async () => {
    const editor = renderExtraction();
    expect(await editor.extract()).toBe(true);
    editor.trash.mockResolvedValueOnce(false);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    const count = editor.transfer.mock.calls.length;
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.transfer).toHaveBeenCalledTimes(count);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
  });

  it('composition prevents creation and transfer', async () => {
    const editor = renderExtraction();
    act(() => { editor.result.current.editing.boundary('compositionStart'); });
    expect(await editor.extract()).toBe(false);
    expect(editor.create).not.toHaveBeenCalled();
    expect(editor.transfer).not.toHaveBeenCalled();
  });
});
