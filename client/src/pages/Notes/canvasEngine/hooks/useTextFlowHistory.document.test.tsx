import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { TextFlowEditMetadata } from '../textFlowEditSession';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type DocumentTextFlowEdit, type TextFlowHistoryHost } from './useTextFlowHistory';

const textOf = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');
const metadata = (flow: TextBlockContentV1, inputType = 'deleteContentForward'): TextFlowEditMetadata => ({
  unitId: flow.units[0].id, inputType, kind: inputType === 'insertText' ? 'typing' : 'structural', isComposing: false,
  beforeSelection: { unitId: flow.units[0].id, start: 1, end: 4 },
  afterSelection: { unitId: flow.units[0].id, start: 1, end: 1 },
});
const rejected = (): BlockSaveOutcome => ({
  status: 'rejected', block: null, recoveryReceipt: null, reconciliation: 'not_attempted',
  durableState: 'not_checked', reason: 'request_failed', staleEpoch: false,
});

function fixture(noteId: string) {
  const flows = ['alpha first', 'bravo last'].map((text) => createTextBlockContentV1(text));
  flows[0].units.push({ ...flows[0].units[0], id: 'tu-extra', text: 'second paragraph' });
  const blocks: NoteBlock[] = flows.map((flow, index) => ({
    id: `${noteId}-${index}`, block_type: 'paragraph', title: `Title ${index}`, plain_text: textOf(flow),
    content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: { retained: index },
    source_references: [], order_index: index, placement_id: `${noteId}-placement-${index}`, display_overrides_json: {}, canvas_layout: null,
  }));
  const originalRanges: BoardTextRangeV1[] = blocks.map((block) => ({
    id: `board-${block.id}`, note_id: noteId, board_id: 'board', block_id: block.id,
    text_flow_id: `textflow-${block.id}`, text_unit_id: 'tu-1', start_offset: 1, end_offset: 4,
    excerpt: block.plain_text!.slice(1, 4), status: 'active', pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated',
  }));
  const originalAnnotations: AnnotationTruthV1[] = blocks.map((block) => ({
    id: `annotation-${block.id}`, note_id: noteId, canvas_id: 'canvas', raw_label: 'retained label',
    ranges: [{ id: `span-${block.id}`, target_kind: 'text_span', block_id: block.id,
      text_flow_id: `textflow-${block.id}`, text_unit_id: 'tu-1', start_offset: 1, end_offset: 4, range_text_cache: block.plain_text!.slice(1, 4),
      metadata: { retained: 'annotation metadata' } }],
    parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
    created_by: 'human', status: 'active', created_at: 'created', updated_at: 'updated',
  }));
  const ranges = createBoardTextRangeEditSession(noteId, async (_note, updates) => updates);
  ranges.hydrate(originalRanges);
  return { blocks, flows, originalRanges, originalAnnotations, ranges,
    annotations: structuredClone(originalAnnotations), flowDrafts: {} as Record<string, TextBlockContentV1>, textDrafts: {} as Record<string, string> };
}

function renderDocumentHistory() {
  const fixtures = { A: fixture('A'), B: fixture('B') };
  const writes: { blockId: string; flow: TextBlockContentV1; ranges: BoardTextRangeV1[] }[] = [];
  const save = vi.fn(async (block: NoteBlock, _text: string, options?: { textFlow?: TextBlockContentV1; boardRangeSnapshot?: { ranges: BoardTextRangeV1[] } }): Promise<BlockSaveOutcome> => {
    writes.push({ blockId: block.id, flow: structuredClone(options!.textFlow!), ranges: structuredClone(options?.boardRangeSnapshot?.ranges ?? []) });
    return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
  });
  const saveAnnotations = vi.fn(async (_annotations: AnnotationTruthV1[]) => true);
  const onSaveFailure = vi.fn();
  const subject = renderHook(({ noteId, generation }: { noteId: keyof typeof fixtures; generation: number }) => {
    const [, update] = useState(0);
    const data = fixtures[noteId];
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({
      noteId, generation, blocks: data.blocks, annotationTruths: data.annotations, readAnnotationTruths: () => data.annotations,
      setAnnotationTruthsSnapshot: (next) => { data.annotations = next; update((value) => value + 1); },
      blockTextFlowDrafts: data.flowDrafts,
      setBlockTextFlowDrafts: (next) => { data.flowDrafts = typeof next === 'function' ? next(data.flowDrafts) : next; update((value) => value + 1); },
      setBlockTextDrafts: (next) => { data.textDrafts = typeof next === 'function' ? next(data.textDrafts) : next; update((value) => value + 1); },
      captureBoardTextRanges: data.ranges.snapshot, restoreBoardTextRanges: data.ranges.restore, rebaseBoardTextRanges: data.ranges.rebase,
      saveBlock: save, saveAnnotationTruthsOutcome: saveAnnotations, history: host, onSaveFailure,
    });
    const history = usePlacementHistory({ noteId, generation, beforeHistoryBoundary: () => editing.boundary(),
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    return { editing, history, data };
  }, { initialProps: { noteId: 'A' as keyof typeof fixtures, generation: 1 } });
  const changes = (replacement = ''): DocumentTextFlowEdit[] => fixtures.A.blocks.map((block, index) => {
    const previousTextFlow = fixtures.A.flowDrafts[block.id] ?? fixtures.A.flows[index];
    const nextTextFlow = structuredClone(previousTextFlow);
    if (index === 0) {
      nextTextFlow.units = [{ ...nextTextFlow.units[0], text: `${nextTextFlow.units[0].text.slice(0, 1)}${replacement}` }];
    } else nextTextFlow.units[0].text = nextTextFlow.units[0].text.slice(4);
    return { block, previousTextFlow, nextTextFlow, metadata: metadata(previousTextFlow, replacement ? 'insertText' : 'deleteContentForward') };
  });
  const apply = async (edits = changes()) => {
    let saved = false;
    await act(async () => { saved = await subject.result.current.editing.applyDocumentEdit(edits); });
    return saved;
  };
  return { ...subject, fixtures, writes, save, saveAnnotations, onSaveFailure, changes, apply };
}

describe('B6b document history (synthetic memory)', () => {
  it('smoke 2: deletes independently and restores every flow and touched range field with one undo', async () => {
    const editor = renderDocumentHistory();
    const { blocks, flows, originalRanges, originalAnnotations } = editor.fixtures.A;
    const changes = editor.changes();
    expect(await editor.apply(changes)).toBe(true);
    expect(editor.writes.map((write) => write.blockId)).toEqual(blocks.map((block) => block.id));
    expect(editor.result.current.data.blocks).toEqual(blocks);
    expect(editor.result.current.data.textDrafts).toEqual({ 'A-0': 'a', 'A-1': 'o last' });
    expect(editor.result.current.data.annotations).not.toEqual(originalAnnotations);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    blocks.forEach((block, index) => {
      expect(editor.result.current.data.flowDrafts[block.id]).toEqual(flows[index]);
      expect(editor.result.current.data.ranges.snapshot(block.id).ranges).toEqual([originalRanges[index]]);
      expect(editor.writes[2 + index].flow).toEqual(flows[index]);
      expect(editor.writes[2 + index].ranges).toEqual([originalRanges[index]]);
    });
    expect(editor.result.current.data.annotations).toEqual(originalAnnotations);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('smoke 3: replacement, undo and redo preserve the complete ordered multi-block snapshots', async () => {
    const editor = renderDocumentHistory();
    const changes = editor.changes('inserted\npaste');
    expect(await editor.apply(changes)).toBe(true);
    const afterAnnotations = structuredClone(editor.result.current.data.annotations);
    const afterRanges = editor.fixtures.A.blocks.map((block) => editor.result.current.data.ranges.snapshot(block.id).ranges);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    changes.forEach((change, index) => {
      expect(editor.result.current.data.flowDrafts[change.block.id]).toEqual(change.nextTextFlow);
      expect(editor.result.current.data.ranges.snapshot(change.block.id).ranges).toEqual(afterRanges[index]);
    });
    expect(editor.result.current.data.annotations).toEqual(afterAnnotations);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
  });

  it.each([0, 1])('smoke 5: failure at block %i retains one entry and retry saves only its unfinished blocks', async (failedIndex) => {
    const editor = renderDocumentHistory();
    const normalSave = editor.save.getMockImplementation()!;
    for (let index = 0; index < failedIndex; index++) editor.save.mockImplementationOnce(normalSave);
    editor.save.mockResolvedValueOnce(rejected());
    expect(await editor.apply()).toBe(false);
    expect(editor.save).toHaveBeenCalledTimes(failedIndex + 1);
    expect(editor.onSaveFailure).toHaveBeenCalled();
    expect(editor.result.current.editing.replaying).toBe(true);
    expect(editor.result.current.editing.recoveryBlockIds).toEqual(['A-0', 'A-1']);
    await expect(editor.result.current.editing.flush()).rejects.toThrow('could not be saved');
    const beforeRetry = editor.save.mock.calls.length;
    await act(async () => {
      const first = editor.fixtures.A.blocks[0];
      expect(await editor.result.current.editing.saveBlock(first, 'stale blur', { textFlow: editor.fixtures.A.flows[0] })).toMatchObject({ status: 'saved' });
    });
    expect(editor.save.mock.calls.slice(beforeRetry).map(([block]) => block.id)).toEqual(editor.fixtures.A.blocks.slice(failedIndex).map((block) => block.id));
    expect(editor.result.current.data.textDrafts).toEqual({ 'A-0': 'a', 'A-1': 'o last' });
    expect(editor.result.current.editing.recoveryBlockIds).toEqual([]);
    await expect(editor.result.current.editing.flush()).resolves.toBeUndefined();
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('retains failed undo/redo entries and retries their own side without repeating completed blocks', async () => {
    const editor = renderDocumentHistory();
    expect(await editor.apply()).toBe(true);
    const normalSave = editor.save.getMockImplementation()!;
    editor.save.mockImplementationOnce(normalSave).mockResolvedValueOnce(rejected());
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    const undoCalls = editor.save.mock.calls.length;
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.save.mock.calls.slice(undoCalls).map(([block]) => block.id)).toEqual(['A-1']);
    editor.save.mockImplementationOnce(normalSave).mockResolvedValueOnce(rejected());
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
    const redoCalls = editor.save.mock.calls.length;
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.save.mock.calls.slice(redoCalls).map(([block]) => block.id)).toEqual(['A-1']);
  });

  it('keeps the composite body and annotation save incomplete until it succeeds', async () => {
    const editor = renderDocumentHistory();
    editor.save.mockResolvedValueOnce(rejected());
    expect(await editor.apply()).toBe(false);
    expect(editor.save.mock.calls.map(([block]) => block.id)).toEqual(['A-0']);
    await act(async () => {
      expect(await editor.result.current.editing.saveBlock(editor.fixtures.A.blocks[1], 'stale')).toMatchObject({ status: 'saved' });
    });
    expect(editor.save.mock.calls.map(([block]) => block.id)).toEqual(['A-0', 'A-0', 'A-1']);
    expect(editor.saveAnnotations).not.toHaveBeenCalled();
    expect(editor.save.mock.calls[1][2]).toHaveProperty('annotationRanges', expect.any(Array));
  });

  it('serializes each save, guards pending edits, and seals earlier typing before the document entry', async () => {
    const editor = renderDocumentHistory();
    const block = editor.fixtures.A.blocks[0];
    const first = structuredClone(editor.fixtures.A.flows[0]);
    first.units[0].text += ' typed';
    await act(async () => { await editor.result.current.editing.applyEdit(block, first, { metadata: metadata(first, 'insertText') }); });
    let finish!: (outcome: BlockSaveOutcome) => void;
    editor.save.mockImplementationOnce(() => new Promise<BlockSaveOutcome>((resolve) => { finish = resolve; }));
    let applying!: Promise<boolean>;
    act(() => { applying = editor.result.current.editing.applyDocumentEdit(editor.changes()); });
    await waitFor(() => expect(editor.save).toHaveBeenCalledTimes(1));
    expect(editor.result.current.editing.isReplaying()).toBe(true);
    await act(async () => {
      expect(await editor.result.current.editing.applyDocumentEdit(editor.changes())).toBe(false);
      expect(await editor.result.current.editing.applyEdit(block, first)).toBeUndefined();
    });
    expect(editor.save).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' });
      expect(await applying).toBe(true);
    });
    expect(editor.save.mock.calls.map(([savedBlock]) => savedBlock.id)).toEqual(['A-0', 'A-0', 'A-1']);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.result.current.data.flowDrafts[block.id]).toEqual(first);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.result.current.data.flowDrafts[block.id]).toEqual(editor.fixtures.A.flows[0]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('resolves older typing failures before a document save and blocks later typing until recovery', async () => {
    const editor = renderDocumentHistory();
    const block = editor.fixtures.A.blocks[0];
    const typed = structuredClone(editor.fixtures.A.flows[0]);
    typed.units[0].text += ' typed';
    const normalSave = editor.save.getMockImplementation()!;
    editor.save.mockResolvedValueOnce(rejected());
    await act(async () => { await editor.result.current.editing.applyEdit(block, typed, { metadata: metadata(typed, 'insertText') }); });
    editor.save.mockImplementationOnce(normalSave).mockResolvedValueOnce(rejected());
    expect(await editor.apply()).toBe(false);
    expect(editor.save.mock.calls.map(([, , options]) => options?.textFlow && textOf(options.textFlow))).toEqual([
      textOf(typed), textOf(typed), 'a',
    ]);
    await act(async () => { expect(await editor.result.current.editing.applyEdit(block, typed)).toBeUndefined(); });
    expect(editor.result.current.data.textDrafts[block.id]).toBe('a');
    await act(async () => { expect(await editor.result.current.editing.saveBlock(block, 'old typing', { textFlow: typed })).toMatchObject({ status: 'saved' }); });
    await expect(editor.result.current.editing.flush()).resolves.toBeUndefined();
    const later = structuredClone(editor.result.current.data.flowDrafts[block.id]);
    later.units[0].text += ' later';
    await act(async () => {
      await editor.result.current.editing.applyEdit(block, later, { metadata: metadata(later, 'insertText') });
      editor.result.current.editing.boundary('blur');
      await editor.result.current.history.whenHistoryIdle();
    });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.result.current.data.flowDrafts[block.id].units[0].text).toBe('a');
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.result.current.data.flowDrafts[block.id]).toEqual(typed);
  });

  it.each(['note', 'generation'] as const)('fences a held multi-block completion after changing %s', async (boundary) => {
    const editor = renderDocumentHistory();
    let finish!: (outcome: BlockSaveOutcome) => void;
    editor.save.mockImplementationOnce(() => new Promise<BlockSaveOutcome>((resolve) => { finish = resolve; }));
    const old = editor.result.current;
    let applying!: Promise<boolean>;
    act(() => { applying = old.editing.applyDocumentEdit(editor.changes()); });
    await waitFor(() => expect(editor.save).toHaveBeenCalledTimes(1));
    editor.rerender({ noteId: boundary === 'note' ? 'B' : 'A', generation: boundary === 'generation' ? 2 : 1 });
    const before = structuredClone(editor.result.current.data.flowDrafts);
    await act(async () => {
      finish({ status: 'saved', block: editor.fixtures.A.blocks[0], recoveryReceipt: null, reconciliation: 'response' });
      expect(await applying).toBe(false);
      expect(await old.editing.applyDocumentEdit(editor.changes())).toBe(false);
      expect(await old.editing.saveBlock(editor.fixtures.A.blocks[0], 'stale')).toMatchObject({ status: 'rejected' });
      expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false);
    });
    expect(editor.save).toHaveBeenCalledTimes(1);
    expect(editor.result.current.data.flowDrafts).toEqual(before);
    expect(editor.result.current.editing.recoveryBlockIds).toEqual([]);
    await expect(editor.result.current.editing.flush()).resolves.toBeUndefined();
  });

  it('does not create a document entry during composition', async () => {
    const editor = renderDocumentHistory();
    act(() => { editor.result.current.editing.boundary('compositionStart'); });
    expect(await editor.apply()).toBe(false);
    expect(editor.save).not.toHaveBeenCalled();
    act(() => { editor.result.current.editing.boundary('compositionEnd'); });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });
});
