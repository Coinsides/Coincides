import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { moveTextUnitBetweenFlows } from '../textUnitMoveService';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';

const textOf = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');
const rejected = (): BlockSaveOutcome => ({ status: 'rejected', block: null, recoveryReceipt: null,
  reconciliation: 'not_attempted', durableState: 'not_checked', reason: 'request_failed', staleEpoch: false });

function renderMove(options: { single?: boolean; duplicateId?: boolean; ordinary?: boolean } = {}) {
  const sourceFlow = createTextBlockContentV1('source lead');
  if (!options.ordinary) sourceFlow.units[0].id = 'source-lead';
  const movedUnitId = options.ordinary ? sourceFlow.units[0].id : 'move';
  const movedUnit = { ...sourceFlow.units[0], id: movedUnitId, text: 'keep every field', writing_role: 'todo_item' as const,
    order_index: options.ordinary ? 0 : 1, indent_level: 2, metadata: { checked: true, nested: { keep: 'value' } } };
  sourceFlow.units = options.single || options.ordinary ? [movedUnit] : [...sourceFlow.units, movedUnit];
  sourceFlow.inline_structures.push({ id: 'inline', parent_text_unit_id: movedUnitId, semantic_kind: 'inline_link',
    anchor_range: { start: 1, end: 4 }, anchor_text: 'eep', field_values: { url: 'https://example.test' },
    metadata: { original: true }, status: 'active' });
  const targetFlow = createTextBlockContentV1('target first');
  if (!options.ordinary) {
    targetFlow.units[0].id = options.duplicateId ? 'move' : 'target-first';
    targetFlow.units.push({ ...targetFlow.units[0], id: 'target-last', text: 'target last', order_index: 1 });
  } else {
    targetFlow.inline_structures.push({ ...sourceFlow.inline_structures[0], parent_text_unit_id: 'tu-1',
      anchor_text: 'arg', field_values: { url: 'https://target.example.test' }, metadata: { target: true } });
  }
  const targetAnchorUnitId = options.ordinary ? 'tu-1' : 'target-last';
  const originalBlocks: NoteBlock[] = [sourceFlow, targetFlow].map((flow, index) => ({
    id: index ? 'target' : 'source', block_type: 'paragraph', title: `title-${index}`,
    content_json: { [TEXT_FLOW_CONTENT_KEY]: flow, retained: { value: index } }, plain_text: textOf(flow),
    metadata: { keep: index }, order_index: index, source_references: [], placement_id: `placement-${index}`,
    display_overrides_json: { nested: { index } }, text_save_revision: 0,
  }));
  const originalAnnotation: AnnotationTruthV1 = { id: 'ann', note_id: 'note', canvas_id: 'canvas', raw_label: 'keep label',
    ranges: [{ id: 'range', target_kind: 'text_span', block_id: 'source', text_flow_id: 'textflow-source', text_unit_id: movedUnitId,
      start_offset: 1, end_offset: 4, range_text_cache: 'eep', metadata: { keep: true } },
    { id: 'inline-range', target_kind: 'inline_structure', block_id: 'source', text_flow_id: 'textflow-source',
      inline_structure_id: 'inline', metadata: { untouched: 'inline anchor' } },
    { id: 'target-range', target_kind: 'text_span', block_id: 'target', text_flow_id: 'textflow-target', text_unit_id: targetAnchorUnitId,
      start_offset: 0, end_offset: 6, range_text_cache: 'target', metadata: { keep: 'target anchor' } }],
    parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
    created_by: 'human', status: 'active', created_at: 'created', updated_at: 'updated' };
  if (options.ordinary) originalAnnotation.ranges.push({ id: 'target-inline-range', target_kind: 'inline_structure',
    block_id: 'target', text_flow_id: 'textflow-target', inline_structure_id: 'inline', metadata: { keep: 'target inline' } });
  const originalRanges: BoardTextRangeV1[] = ['source', 'target'].map((blockId) => ({
    id: `board-${blockId}`, note_id: 'note', board_id: 'board', block_id: blockId, text_flow_id: `textflow-${blockId}`,
    text_unit_id: blockId === 'source' ? movedUnitId : targetAnchorUnitId, start_offset: 1, end_offset: 4, excerpt: blockId === 'target' && options.ordinary ? 'arg' : 'eep',
    status: 'active', pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated',
  }));
  const board = createBoardTextRangeEditSession('note', async (_note, updates) => updates);
  board.hydrate(originalRanges);
  const data = { blocks: structuredClone(originalBlocks), annotations: [structuredClone(originalAnnotation)],
    flowDrafts: {} as Record<string, TextBlockContentV1>, textDrafts: {} as Record<string, string> };
  let update = () => {};
  type Transfer = NonNullable<Parameters<typeof useTextFlowHistory>[0]['transferTextUnit']>;
  const transfer = vi.fn<Transfer>(async (input) => {
    const movedId = input.idMapping?.unit_id ?? input.textUnitId;
    const previousFlow = (data.blocks.find((block) => block.id === input.sourceBlock.id)!.content_json![TEXT_FLOW_CONTENT_KEY]) as TextBlockContentV1;
    const movedInlineIds = new Set(previousFlow.inline_structures.filter((inline) => inline.parent_text_unit_id === input.textUnitId)
      .map((inline) => inline.id));
    const sourceBlock = { ...input.sourceBlock, ...input.sourcePayload, text_save_revision: input.sourceBaseRevision + 1 };
    const targetBlock = { ...input.targetBlock, ...input.targetPayload, text_save_revision: input.targetBaseRevision + 1 };
    data.blocks = data.blocks.map((block) => block.id === sourceBlock.id ? sourceBlock : block.id === targetBlock.id ? targetBlock : block);
    data.flowDrafts = { ...data.flowDrafts, [sourceBlock.id]: input.sourceTextFlow, [targetBlock.id]: input.targetTextFlow };
    data.textDrafts = { ...data.textDrafts, [sourceBlock.id]: sourceBlock.plain_text ?? '', [targetBlock.id]: targetBlock.plain_text ?? '' };
    data.annotations = data.annotations.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) =>
      range.block_id === sourceBlock.id && (range.text_unit_id === input.textUnitId || movedInlineIds.has(range.inline_structure_id ?? ''))
        ? { ...range, block_id: targetBlock.id, text_flow_id: `textflow-${targetBlock.id}`,
          ...(range.text_unit_id ? { text_unit_id: movedId } : {}),
          ...(range.inline_structure_id ? { inline_structure_id: input.idMapping?.inline_ids[range.inline_structure_id] ?? range.inline_structure_id } : {}),
        } : range) }));
    board.acceptUnitTransfer({ ...input, sourceBlockId: sourceBlock.id, targetBlockId: targetBlock.id,
      confirmedRanges: board.snapshot(sourceBlock.id).ranges.filter((range) => range.text_unit_id === input.textUnitId)
        .map((range) => ({ ...range, block_id: targetBlock.id, text_flow_id: `textflow-${targetBlock.id}`, text_unit_id: movedId })) });
    update(); return { sourceBlock, targetBlock };
  });
  const save = vi.fn<Parameters<typeof useTextFlowHistory>[0]['saveBlock']>(async (block, text, saveOptions) => {
    const saved = { ...block, content_json: { ...block.content_json, [TEXT_FLOW_CONTENT_KEY]: saveOptions!.textFlow! },
      plain_text: text, text_save_revision: (saveOptions?.baseRevision ?? 0) + 1 };
    data.blocks = data.blocks.map((candidate) => candidate.id === saved.id ? saved : candidate);
    update(); return { status: 'saved', block: saved, recoveryReceipt: null, reconciliation: 'response' };
  });
  const onSaveFailure = vi.fn();
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
      saveBlock: save, saveAnnotationTruthsOutcome: async () => true, history: host, transferTextUnit: transfer, onSaveFailure,
    });
    const history = usePlacementHistory({ noteId: 'note', generation, beforeHistoryBoundary: () => editing.boundary(),
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    return { editing, history };
  }, { initialProps: { generation: 1 } });
  const move = async (edge: 'before' | 'after' = 'before', targetUnitId = 'target-last') => {
    let saved = false;
    await act(async () => { saved = await subject.result.current.editing.moveUnit(originalBlocks[0], 'move', originalBlocks[1], targetUnitId, edge); });
    return saved;
  };
  return { ...subject, move, sourceFlow, targetFlow, originalBlocks, originalAnnotation, originalRanges, board, data, save, transfer, onSaveFailure };
}

describe('C3 existing-block migration through the shared document history (synthetic memory)', () => {
  it.each(['before', 'after'] as const)('moves at the %s edge and restores both complete payloads and anchor fields with one undo/redo', async (edge) => {
    const editor = renderMove();
    expect(await editor.move(edge)).toBe(true);
    const moved = moveTextUnitBetweenFlows(editor.sourceFlow, 'move', editor.targetFlow, 'target-last', edge)!;
    expect(editor.data.flowDrafts).toEqual({ source: moved.source, target: moved.target });
    expect(editor.data.flowDrafts.target.units.map((unit) => unit.id)).toEqual(edge === 'before'
      ? ['target-first', 'move', 'target-last'] : ['target-first', 'target-last', 'move']);
    expect(editor.data.flowDrafts.target.units.find((unit) => unit.id === 'move')).toEqual({ ...editor.sourceFlow.units[1], order_index: edge === 'before' ? 1 : 2 });
    expect(editor.data.flowDrafts.target.inline_structures).toEqual(editor.sourceFlow.inline_structures);
    expect(editor.data.annotations).toEqual([{ ...editor.originalAnnotation, ranges: editor.originalAnnotation.ranges.map((range) =>
      range.block_id === 'source' ? { ...range, block_id: 'target', text_flow_id: 'textflow-target' } : range) }]);
    expect(editor.board.snapshot('target').ranges).toEqual(expect.arrayContaining([
      editor.originalRanges[1], { ...editor.originalRanges[0], block_id: 'target', text_flow_id: 'textflow-target' },
    ]));
    const after = structuredClone(editor.data);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks).toEqual(editor.originalBlocks.map((block) => ({ ...block, text_save_revision: 2 })));
    expect(editor.data.flowDrafts).toEqual({ source: editor.sourceFlow, target: editor.targetFlow });
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    expect(editor.board.snapshot('source').ranges).toEqual([editor.originalRanges[0]]);
    expect(editor.board.snapshot('target').ranges).toEqual([editor.originalRanges[1]]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks).toEqual(after.blocks.map((block) => ({ ...block, text_save_revision: 3 })));
    expect(editor.data.flowDrafts).toEqual(after.flowDrafts);
    expect(editor.data.annotations).toEqual(after.annotations);
    expect(editor.save).not.toHaveBeenCalled();
    expect(editor.transfer.mock.calls.map(([input]) => [input.sourceBaseRevision, input.targetBaseRevision])).toEqual([[0, 0], [1, 1], [2, 2]]);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
  });

  it('keeps the empty source block after migrating its last unit and replays without block lifecycle APIs', async () => {
    const editor = renderMove({ single: true });
    expect(await editor.move()).toBe(true);
    expect(editor.data.blocks.map((block) => block.id)).toEqual(['source', 'target']);
    expect(editor.data.flowDrafts.source.units).toEqual([]);
    expect(editor.data.flowDrafts.source.inline_structures).toEqual([]);
    expect(editor.data.blocks[0].plain_text).toBe('');
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks).toEqual(editor.originalBlocks.map((block) => ({ ...block, text_save_revision: 2 })));
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts.source.units).toEqual([]);
  });

  it('migrates back into an existing empty source using its rendered placeholder row', async () => {
    const editor = renderMove({ single: true });
    expect(await editor.move()).toBe(true);
    const afterFirstMove = structuredClone(editor.data);
    await act(async () => {
      expect(await editor.result.current.editing.moveUnit(editor.originalBlocks[1], 'move', editor.originalBlocks[0], 'placeholder', 'before')).toBe(true);
    });
    expect(editor.data.flowDrafts.source.units.map((unit) => unit.id)).toEqual(['move']);
    expect(editor.data.flowDrafts.target.units.map((unit) => unit.id)).toEqual(['target-first', 'target-last']);
    expect(editor.data.flowDrafts.target.inline_structures).toEqual([]);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    expect(editor.data.blocks.map((block) => block.id)).toEqual(['source', 'target']);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts).toEqual(afterFirstMove.flowDrafts);
    expect(editor.data.annotations).toEqual(afterFirstMove.annotations);
  });

  it('retains both original blocks after failure and retries the frozen pair through either recovery block', async () => {
    const editor = renderMove();
    editor.transfer.mockResolvedValueOnce(null);
    expect(await editor.move()).toBe(false);
    expect(editor.data.blocks).toEqual(editor.originalBlocks);
    expect(editor.result.current.editing.recoveryBlockIds).toEqual(['source', 'target']);
    await expect(editor.result.current.editing.flush()).rejects.toThrow('could not be saved');
    await act(async () => { expect((await editor.result.current.editing.saveBlock(editor.originalBlocks[1], 'stale')).status).toBe('saved'); });
    expect(editor.transfer.mock.calls[1][0]).toEqual(editor.transfer.mock.calls[0][0]);
    expect(editor.save).not.toHaveBeenCalled();
    await expect(editor.result.current.editing.flush()).resolves.toBeUndefined();
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks).toEqual(editor.originalBlocks.map((block) => ({ ...block, text_save_revision: 2 })));
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('resolves an unconfirmed forward transfer before attempting inverse writes, retaining both revisions', async () => {
    const editor = renderMove();
    editor.transfer.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await editor.move()).toBe(false);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(editor.transfer.mock.calls.map(([input]) => input.sourceBlock.id)).toEqual(['source', 'source']);
    expect(editor.data.blocks).toEqual(editor.originalBlocks);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.transfer.mock.calls.map(([input]) => input.sourceBlock.id)).toEqual(['source', 'source', 'source', 'target']);
    expect(editor.transfer.mock.calls.map(([input]) => [input.sourceBaseRevision, input.targetBaseRevision])).toEqual([[0, 0], [0, 0], [0, 0], [1, 1]]);
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
  });

  it('retries failed inverse and replay operations without creating another history entry', async () => {
    const editor = renderMove();
    expect(await editor.move()).toBe(true);
    editor.transfer.mockResolvedValueOnce(null);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    editor.transfer.mockResolvedValueOnce(null);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.transfer.mock.calls.map(([input]) => [input.sourceBaseRevision, input.targetBaseRevision])).toEqual([[0, 0], [1, 1], [1, 1], [2, 2], [2, 2]]);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
  });

  it('seals typing in both blocks and preserves the complete typed snapshots across migration undo', async () => {
    const editor = renderMove();
    const flows = [editor.sourceFlow, editor.targetFlow].map((flow) => {
      const typed = structuredClone(flow); typed.units[0].text += ' typed'; return typed;
    });
    // The first typing write fails; migrating must retire that dependency using
    // its full snapshot while the target's sealed write stays ahead of transfer.
    editor.save.mockResolvedValueOnce(rejected());
    for (let index = 0; index < 2; index++) await act(async () => {
      await editor.result.current.editing.applyEdit(editor.originalBlocks[index], flows[index], { metadata: {
        unitId: flows[index].units[0].id, inputType: 'insertText', kind: 'typing', isComposing: false,
        beforeSelection: { unitId: flows[index].units[0].id, start: 0, end: 0 },
        afterSelection: { unitId: flows[index].units[0].id, start: 1, end: 1 },
      } });
    });
    expect(await editor.move()).toBe(true);
    expect(editor.save.mock.calls.map(([block]) => block.id)).toEqual(['source', 'target', 'source']);
    expect(editor.transfer.mock.calls[0][0]).toMatchObject({ sourceBaseRevision: 1, targetBaseRevision: 1 });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts).toEqual({ source: flows[0], target: flows[1] });
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts.target).toEqual(editor.targetFlow);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.flowDrafts.source).toEqual(editor.sourceFlow);
  });

  it('rejects composition, same-block, missing and non-text targets before reserving history or writing', async () => {
    const editor = renderMove();
    act(() => { editor.result.current.editing.boundary('compositionStart'); });
    expect(await editor.move()).toBe(false);
    act(() => { editor.result.current.editing.boundary('compositionEnd'); });
    await act(async () => {
      const [source, target] = editor.originalBlocks;
      expect(await editor.result.current.editing.moveUnit(source, 'move', source, 'source-lead', 'before')).toBe(false);
      expect(await editor.result.current.editing.moveUnit(source, 'move', { ...target, id: 'other-note' }, 'target-last', 'before')).toBe(false);
    });
    for (const blockType of ['formula', 'item_ref']) {
      editor.data.blocks[1] = { ...editor.data.blocks[1], block_type: blockType };
      editor.rerender({ generation: 1 });
      expect(await editor.move()).toBe(false);
    }
    expect(editor.transfer).not.toHaveBeenCalled();
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it.each([0, 1])('remaps ordinary first rows in direction %s and restores every original address in one undo, then replays the same map', async (sourceIndex) => {
    const editor = renderMove({ ordinary: true });
    const targetIndex = 1 - sourceIndex;
    const source = editor.originalBlocks[sourceIndex];
    const target = editor.originalBlocks[targetIndex];
    const sourceFlow = [editor.sourceFlow, editor.targetFlow][sourceIndex];
    const targetFlow = [editor.sourceFlow, editor.targetFlow][targetIndex];
    expect([sourceFlow.units[0].id, targetFlow.units[0].id]).toEqual(['tu-1', 'tu-1']);
    expect([sourceFlow.inline_structures[0].id, targetFlow.inline_structures[0].id]).toEqual(['inline', 'inline']);
    await act(async () => {
      expect(await editor.result.current.editing.moveUnit(source, 'tu-1', target, 'tu-1', 'before')).toBe(true);
    });
    const forward = editor.transfer.mock.calls[0][0];
    const mapping = forward.idMapping!;
    expect(mapping.unit_id).not.toBe('tu-1');
    expect(mapping.inline_ids.inline).toEqual(expect.any(String));
    expect(mapping.inline_ids.inline).not.toBe('inline');
    expect(editor.data.flowDrafts[source.id]).toEqual({ ...sourceFlow, units: [], inline_structures: [] });
    expect(editor.data.flowDrafts[target.id]).toEqual({ ...targetFlow,
      units: [{ ...sourceFlow.units[0], id: mapping.unit_id }, { ...targetFlow.units[0], order_index: 1 }],
      inline_structures: [...targetFlow.inline_structures, { ...sourceFlow.inline_structures[0],
        id: mapping.inline_ids.inline, parent_text_unit_id: mapping.unit_id }],
    });
    expect(editor.data.annotations).toEqual([{ ...editor.originalAnnotation, ranges: editor.originalAnnotation.ranges.map((range) =>
      range.block_id === source.id ? { ...range, block_id: target.id, text_flow_id: `textflow-${target.id}`,
        ...(range.text_unit_id ? { text_unit_id: mapping.unit_id } : {}),
        ...(range.inline_structure_id ? { inline_structure_id: mapping.inline_ids.inline } : {}),
      } : range) }]);
    expect(editor.board.snapshot(source.id).ranges).toEqual([]);
    expect(editor.board.snapshot(target.id).ranges).toEqual(expect.arrayContaining([
      editor.originalRanges[targetIndex], { ...editor.originalRanges[sourceIndex], block_id: target.id,
        text_flow_id: `textflow-${target.id}`, text_unit_id: mapping.unit_id },
    ]));
    const after = structuredClone(editor.data);
    const afterBoard = editor.board.snapshot(target.id);
    const sourceEditor = document.createElement('textarea');
    const targetEditor = document.createElement('textarea');
    for (const [element, owner, unitId] of [[sourceEditor, source.id, 'tu-1'], [targetEditor, target.id, mapping.unit_id]] as const) {
      element.dataset.runtimeTextflowEditor = 'true'; element.dataset.blockId = owner; element.dataset.textUnitId = unitId;
      document.body.append(element);
    }
    try {
      await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
      expect(editor.transfer.mock.calls[1][0]).toMatchObject({ sourceBlock: { id: target.id }, targetBlock: { id: source.id },
        textUnitId: mapping.unit_id, idMapping: { unit_id: 'tu-1', inline_ids: { [mapping.inline_ids.inline]: 'inline' } },
        sourceBaseRevision: 1, targetBaseRevision: 1 });
      expect(editor.data.blocks).toEqual(editor.originalBlocks.map((block) => ({ ...block, text_save_revision: 2 })));
      expect(editor.data.flowDrafts).toEqual({ source: editor.sourceFlow, target: editor.targetFlow });
      expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
      expect(editor.board.snapshot('source').ranges).toEqual([editor.originalRanges[0]]);
      expect(editor.board.snapshot('target').ranges).toEqual([editor.originalRanges[1]]);
      expect(document.activeElement).toBe(sourceEditor);
      await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
      await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
      expect(editor.transfer.mock.calls[2][0]).toEqual({ ...forward,
        sourceBlock: { ...forward.sourceBlock, text_save_revision: 2 }, targetBlock: { ...forward.targetBlock, text_save_revision: 2 },
        sourceBaseRevision: 2, targetBaseRevision: 2 });
      expect(editor.data.blocks).toEqual(after.blocks.map((block) => ({ ...block, text_save_revision: 3 })));
      expect(editor.data.flowDrafts).toEqual(after.flowDrafts);
      expect(editor.data.annotations).toEqual(after.annotations);
      expect(editor.board.snapshot(target.id)).toEqual(afterBoard);
      expect(document.activeElement).toBe(targetEditor);
      await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
    } finally { sourceEditor.remove(); targetEditor.remove(); }
    expect(editor.save).not.toHaveBeenCalled();
  });

  it('exchanges ordinary first rows in one session, then undoes and redoes both moves with all anchors', async () => {
    const editor = renderMove({ ordinary: true });
    const snapshot = () => ({ data: structuredClone(editor.data),
      board: [editor.board.snapshot('source'), editor.board.snapshot('target')] });
    const expectSnapshot = (expected: ReturnType<typeof snapshot>, revision: number) => {
      expect(editor.data.blocks).toEqual(expected.data.blocks.map((block) => ({ ...block, text_save_revision: revision })));
      expect(editor.data.flowDrafts).toEqual(expected.data.flowDrafts);
      expect(editor.data.annotations).toEqual(expected.data.annotations);
      expect([editor.board.snapshot('source'), editor.board.snapshot('target')]).toEqual(expected.board);
    };
    await act(async () => {
      expect(await editor.result.current.editing.moveUnit(editor.originalBlocks[0], 'tu-1', editor.originalBlocks[1], 'tu-1', 'after')).toBe(true);
    });
    const first = snapshot();
    const firstMapping = editor.transfer.mock.calls[0][0].idMapping!;
    expect(editor.data.flowDrafts.target.units.map((unit) => unit.id)).toEqual(['tu-1', firstMapping.unit_id]);
    await act(async () => {
      expect(await editor.result.current.editing.moveUnit(editor.originalBlocks[1], 'tu-1', editor.originalBlocks[0], 'placeholder', 'before')).toBe(true);
    });
    const second = snapshot();
    expect(editor.transfer.mock.calls[1][0].idMapping).toEqual({ unit_id: 'tu-1', inline_ids: {} });
    expect(editor.data.flowDrafts.source.units).toEqual(editor.targetFlow.units);
    expect(editor.data.flowDrafts.source.inline_structures).toEqual(editor.targetFlow.inline_structures);
    // Extracting the other row preserves the remaining unit's stored order field (B10).
    expect(editor.data.flowDrafts.target.units).toEqual([{ ...editor.sourceFlow.units[0], id: firstMapping.unit_id, order_index: 1 }]);
    expect(editor.board.snapshot('source').ranges).toEqual([{ ...editor.originalRanges[1], block_id: 'source', text_flow_id: 'textflow-source' }]);
    expect(editor.board.snapshot('target').ranges).toEqual([{ ...editor.originalRanges[0], block_id: 'target',
      text_flow_id: 'textflow-target', text_unit_id: firstMapping.unit_id }]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expectSnapshot(first, 3);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.data.blocks).toEqual(editor.originalBlocks.map((block) => ({ ...block, text_save_revision: 4 })));
    expect(editor.data.flowDrafts).toEqual({ source: editor.sourceFlow, target: editor.targetFlow });
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    expect(editor.board.snapshot('source').ranges).toEqual([editor.originalRanges[0]]);
    expect(editor.board.snapshot('target').ranges).toEqual([editor.originalRanges[1]]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expectSnapshot(first, 5);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expectSnapshot(second, 6);
    expect(editor.transfer.mock.calls.map(([input]) => input.idMapping)).toEqual([
      firstMapping, { unit_id: 'tu-1', inline_ids: {} }, { unit_id: 'tu-1', inline_ids: {} },
      { unit_id: 'tu-1', inline_ids: { [firstMapping.inline_ids.inline]: 'inline' } },
      firstMapping, { unit_id: 'tu-1', inline_ids: {} },
    ]);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
    expect(editor.save).not.toHaveBeenCalled();
  });

  it('keeps the frozen collision mapping through an unconfirmed forward retry, inverse and failed replay retry', async () => {
    const editor = renderMove({ ordinary: true });
    editor.transfer.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await act(async () => {
      expect(await editor.result.current.editing.moveUnit(editor.originalBlocks[0], 'tu-1', editor.originalBlocks[1], 'tu-1', 'before')).toBe(false);
    });
    const frozen = structuredClone(editor.transfer.mock.calls[0][0]);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(editor.transfer.mock.calls[1][0]).toEqual(frozen);
    await act(async () => { expect(await editor.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(editor.transfer.mock.calls[2][0]).toEqual(frozen);
    const inverse = editor.transfer.mock.calls[3][0];
    expect(inverse.textUnitId).toBe(frozen.idMapping!.unit_id);
    expect(inverse.idMapping).toEqual({ unit_id: 'tu-1', inline_ids: { [frozen.idMapping!.inline_ids.inline]: 'inline' } });
    expect(editor.data.annotations).toEqual([editor.originalAnnotation]);
    editor.transfer.mockResolvedValueOnce(null);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(editor.transfer.mock.calls[4][0]).toEqual({ ...frozen,
      sourceBlock: { ...frozen.sourceBlock, text_save_revision: 2 }, targetBlock: { ...frozen.targetBlock, text_save_revision: 2 },
      sourceBaseRevision: 2, targetBaseRevision: 2 });
    expect(editor.transfer.mock.calls[5][0]).toEqual(editor.transfer.mock.calls[4][0]);
    await act(async () => { expect(await editor.result.current.history.redoRuntimeHistory()).toBe(false); });
  });
});
