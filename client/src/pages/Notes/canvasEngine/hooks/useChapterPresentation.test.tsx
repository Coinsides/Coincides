import { useRef, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChapterPresentation } from './useChapterPresentation';
import { usePlacementHistory } from './usePlacementHistory';
import type { TextFlowHistoryHost } from './useTextFlowHistory';
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { DEFAULT_BLOCK_GAP } from '../runtimeLayout';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts } from '../notePageFlowService';
import type { PageFrameCollectionModel } from '../types';
import type { CoordinateContract } from '../placementContractService';

function block(id: string, role: TextUnitWritingRole = 'paragraph'): NoteBlock {
  const flow: TextBlockContentV1 = { textflow_version: 'TextBlockContentV1', units: [{
    id: 'tu-1', text: id, writing_role: role, indent_level: 0, order_index: 0, metadata: {}, status: 'active',
  }], inline_structures: [], metadata: {} };
  return { id, placement_id: `p-${id}`, block_type: 'paragraph', title: null,
    content_json: { text_flow: flow }, plain_text: id, metadata: {},
    order_index: 0, display_overrides_json: {}, source_references: [] };
}

function createInput() {
  return {
    noteId: 'note-a',
    blocks: [block('first', 'heading_1'), block('body'), block('nested', 'heading_2'),
      block('detail'), block('last', 'heading_1'), block('tail')],
    flowDrafts: {} as Record<string, TextBlockContentV1>,
    layouts: {} as Record<string, BlockBoxLayout>,
    collection: null as PageFrameCollectionModel | null,
    coordinateContract: 'v1' as CoordinateContract,
    coverFrameId: null as string | null,
    readOnly: false,
    write: vi.fn(async (_ids: readonly string[]) => true),
    saveLayouts: vi.fn(async (_layouts: Record<string, BlockBoxLayout>) => true),
    whenWritesIdle: vi.fn(async () => {}),
    beforeStructure: vi.fn(() => true),
  };
}

function useHarness(input: ReturnType<typeof createInput>) {
  const [orderedBlocks, setOrderedBlocks] = useState(input.blocks);
  const [layouts, setLayouts] = useState(input.layouts);
  const beforeHistoryBoundary = useRef<() => boolean>(() => true);
  const history = usePlacementHistory({
    noteId: input.noteId, target: null, applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(),
    beforeHistoryBoundary: () => beforeHistoryBoundary.current(),
  });
  const host = useRef<TextFlowHistoryHost | null>(history);
  host.current = history;
  const chapter = useChapterPresentation({
    ...input, layouts, blocks: orderedBlocks, orderedBlocks, history: host,
    getMoveContext: () => {
      const plan = input.coordinateContract === 'v2' && input.collection ? resolveDocumentPageFlowPlan({
        collection: input.collection, blocks: noteBlocksToPageFlow(orderedBlocks, layouts, {}, input.flowDrafts),
        coverFrameId: input.coverFrameId,
      }) : undefined;
      return { plan, collection: plan?.collection || input.collection,
        layouts: plan ? pageFlowFirstLayouts(plan, layouts) : layouts };
    },
    persistLayoutSnapshot: async (snapshot) => {
      const saved = await input.saveLayouts(snapshot);
      if (saved) setLayouts((current) => ({ ...current, ...snapshot }));
      return saved;
    },
    reorderBlocks: async (ids) => {
      const saved = await input.write(ids);
      if (saved) setOrderedBlocks((current) => ids.map((id) => current.find((entry) => entry.id === id)!));
      return saved;
    },
  });
  beforeHistoryBoundary.current = () => !chapter.isMoving;
  return { chapter, history, orderedBlocks, layouts };
}

function placedInput(manual = true) {
  const input = createInput();
  const frame = { ...createPrimaryPageFrame({ id: 'page-a' }), x: 100, y: 200, width: 600, height: 1600,
    contentInset: { left: 40, right: 30, top: 50, bottom: 30 } };
  input.coordinateContract = 'v2';
  input.collection = { pageFrames: [frame], primaryFrameId: frame.id,
    pageStacks: [createPageStackFromFrame(frame, { id: 'stack-a' })] };
  input.layouts = Object.fromEntries(input.blocks.map((entry, index) => [entry.id, {
    x: 20 + index * 4, y: 20 + index * 90, width: 160, height: 42,
    width_mode: manual ? 'manual' : 'auto', frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page',
    export_role: 'included', ai_visibility: 'visible',
  }]));
  return input;
}

async function runWithRender(action: () => Promise<boolean>) {
  let outcome: boolean | undefined;
  act(() => { void action().then((value) => { outcome = value; }); });
  await waitFor(() => expect(outcome).not.toBeUndefined());
  return outcome;
}

describe('A4 chapter presentation with the existing Note history', () => {
  it('submits a whole nested chapter in one reorder and replays one shared undo/redo entry', async () => {
    const input = createInput();
    const original = input.blocks.map((entry) => entry.id);
    const { result } = renderHook(() => useHarness(input));
    const chapterId = result.current.chapter.projection.roots[0]!.id;
    const moved = ['last', 'tail', 'first', 'body', 'nested', 'detail'];
    await act(async () => {
      expect(await result.current.chapter.moveChapter(chapterId, 'tail', 'after')).toBe(true);
    });
    expect(input.write).toHaveBeenCalledTimes(1);
    expect(input.write).toHaveBeenLastCalledWith(moved);
    expect(result.current.orderedBlocks.map((entry) => entry.id)).toEqual(moved);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(input.write).toHaveBeenCalledTimes(2);
    expect(input.write).toHaveBeenLastCalledWith(original);
    expect(result.current.orderedBlocks.map((entry) => entry.id)).toEqual(original);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(input.write).toHaveBeenCalledTimes(2);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(input.write).toHaveBeenCalledTimes(3);
    expect(result.current.orderedBlocks.map((entry) => entry.id)).toEqual(moved);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(false); });
    expect(input.write).toHaveBeenCalledTimes(3);
  });

  it('folds and numbers only presentation without reordering or adding undo entries', async () => {
    const input = createInput();
    const before = structuredClone(input.blocks);
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    act(() => { result.current.chapter.presentation.onToggleChapter(id); });
    expect(result.current.chapter.visibleBlocks.map((entry) => entry.id)).toEqual(['first', 'last', 'tail']);
    expect([...result.current.chapter.hiddenBlockIds]).toEqual(['body', 'nested', 'detail']);
    act(() => { result.current.chapter.presentation.onToggleNumbering(); });
    expect(result.current.chapter.presentation.numbered).toBe(false);
    expect(input.blocks).toEqual(before);
    expect(input.write).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    act(() => { result.current.chapter.presentation.onToggleChapter(id); });
    expect(result.current.chapter.visibleBlocks).toEqual(input.blocks);
    expect(input.beforeStructure).not.toHaveBeenCalled();
  });

  it('resets fold and numbering when a Note session changes and does not resurrect them on return', () => {
    const input = createInput();
    const { result, rerender } = renderHook((props) => useHarness(props), { initialProps: input });
    const id = result.current.chapter.projection.roots[0]!.id;
    act(() => { result.current.chapter.presentation.onToggleChapter(id); });
    act(() => { result.current.chapter.presentation.onToggleNumbering(); });
    rerender({ ...input, noteId: 'note-b' });
    expect(result.current.chapter.hiddenBlockIds.size).toBe(0);
    expect(result.current.chapter.presentation.numbered).toBe(true);
    rerender(input);
    expect(result.current.chapter.hiddenBlockIds.size).toBe(0);
    expect(result.current.chapter.presentation.numbered).toBe(true);
    expect(input.write).not.toHaveBeenCalled();
  });

  it('reveals the selected chapter and all collapsed ancestors without affecting another branch', () => {
    const input = createInput();
    const { result } = renderHook(() => useHarness(input));
    const [first, nested, last] = result.current.chapter.projection.chapters;
    act(() => {
      result.current.chapter.presentation.onToggleChapter(first!.id);
      result.current.chapter.presentation.onToggleChapter(nested!.id);
      result.current.chapter.presentation.onToggleChapter(last!.id);
    });
    expect(result.current.chapter.visibleBlocks.map((entry) => entry.id)).toEqual(['first', 'last']);
    act(() => { result.current.chapter.presentation.onRevealChapter(nested!.id); });
    expect(result.current.chapter.visibleBlocks.map((entry) => entry.id)).toEqual(['first', 'body', 'nested', 'detail', 'last']);
    expect([...result.current.chapter.presentation.collapsedChapterIds]).toEqual([last!.id]);
    expect(input.write).not.toHaveBeenCalled();
  });

  it('does not submit or create history when writing is unavailable or the structure boundary is not ready', async () => {
    const input = createInput();
    const { result, rerender } = renderHook((props) => useHarness(props), { initialProps: { ...input, readOnly: true } });
    const id = result.current.chapter.projection.roots[0]!.id;
    await act(async () => { expect(await result.current.chapter.moveChapter(id, 'tail', 'after')).toBe(false); });
    expect(input.beforeStructure).not.toHaveBeenCalled();
    input.beforeStructure.mockReturnValue(false);
    rerender(input);
    await act(async () => { expect(await result.current.chapter.moveChapter(id, 'tail', 'after')).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(input.write).not.toHaveBeenCalled();
  });

  it('keeps a cover heading out of the chapter projection and its collapse ranges', () => {
    const input = createInput();
    input.coverFrameId = 'cover';
    input.layouts.first = { x: 0, y: 0, width: 100, height: 42, frame_id: 'cover' };
    const { result } = renderHook(() => useHarness(input));
    expect(result.current.chapter.projection.chapters.map((entry) => entry.blockId)).toEqual(['nested', 'last']);
    act(() => { result.current.chapter.presentation.onToggleChapter(result.current.chapter.projection.chapters[0]!.id); });
    expect(result.current.chapter.visibleBlocks.map((entry) => entry.id)).toEqual(['first', 'body', 'nested', 'last', 'tail']);
    expect(input.write).not.toHaveBeenCalled();
  });

  it('moves manual chapter placements as a batch and restores geometry and order in one undo/redo', async () => {
    const input = placedInput();
    const original = structuredClone(input.layouts);
    const originalBlocks = structuredClone(input.blocks);
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    let completed: boolean | undefined;
    act(() => { void result.current.chapter.moveChapter(id, 'tail', 'after').then((value) => { completed = value; }); });
    await waitFor(() => expect(completed).toBe(true));
    const delta = { x: original.tail.x - original.first.x,
      y: original.tail.y + original.tail.height + DEFAULT_BLOCK_GAP - original.first.y };
    expect(input.saveLayouts).toHaveBeenCalledTimes(1);
    expect(Object.keys(input.saveLayouts.mock.calls[0]![0])).toEqual(['first', 'body', 'nested', 'detail']);
    for (const blockId of ['first', 'body', 'nested', 'detail']) {
      expect(result.current.layouts[blockId]).toMatchObject({ ...original[blockId],
        x: original[blockId]!.x + delta.x, y: original[blockId]!.y + delta.y });
    }
    expect(result.current.layouts.tail).toEqual(original.tail);
    expect(result.current.layouts.last).toEqual(original.last);
    expect(input.blocks).toEqual(originalBlocks);
    const movedLayouts = structuredClone(result.current.layouts);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(original);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(movedLayouts);
    expect(input.write).toHaveBeenCalledTimes(3);
    expect(input.saveLayouts).toHaveBeenCalledTimes(3);
  });

  it('reaffiliates an entire mixed chapter to the destination stack while A1 derives auto geometry', async () => {
    const input = placedInput(false);
    const sourceFrame = input.collection!.pageFrames[0]!;
    const targetFrame = { ...sourceFrame, id: 'page-b', x: 900, y: 500,
      contentInset: { left: 70, right: 35, top: 80, bottom: 50 } };
    input.collection!.pageFrames.push(targetFrame);
    input.collection!.pageStacks!.push(createPageStackFromFrame(targetFrame, { id: 'stack-b' }));
    input.layouts.last.frame_id = targetFrame.id;
    input.layouts.tail.frame_id = targetFrame.id;
    input.layouts.detail.width_mode = 'manual';
    const original = structuredClone(input.layouts);
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    expect(await runWithRender(() => result.current.chapter.moveChapter(id, 'tail', 'after'))).toBe(true);
    expect(input.saveLayouts).toHaveBeenCalledTimes(2);
    for (const blockId of ['first', 'body', 'nested', 'detail']) {
      expect(result.current.layouts[blockId]!.frame_id).toBe(targetFrame.id);
      expect(result.current.layouts[blockId]!.coordinate_space).toBe('page_frame_local');
      expect(result.current.layouts[blockId]!.width_mode).toBe(original[blockId]!.width_mode);
    }
    for (const blockId of ['first', 'body', 'nested']) {
      expect(result.current.layouts[blockId]).toMatchObject({
        x: original[blockId]!.x, y: original[blockId]!.y, width: original[blockId]!.width, height: original[blockId]!.height,
      });
    }
    expect(result.current.layouts.detail.y).not.toBe(original.detail.y);
    const projected = resolveDocumentPageFlowPlan({ collection: input.collection!,
      blocks: noteBlocksToPageFlow(result.current.orderedBlocks, result.current.layouts, {}, {}) });
    expect(projected.fragments.map((fragment) => fragment.blockId)).toEqual(['last', 'tail', 'first', 'body', 'nested']);
    expect(projected.fragments.every((fragment) => fragment.frameId === targetFrame.id)).toBe(true);
    const moved = structuredClone(result.current.layouts);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(original);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(moved);
    expect(input.saveLayouts).toHaveBeenCalledTimes(4);
    expect(input.write).toHaveBeenCalledTimes(3);
  });

  it('keeps manual residents aligned with their final A1 heading when moving later within the same stack', async () => {
    const input = placedInput(false);
    input.layouts.detail.width_mode = 'manual';
    const original = structuredClone(input.layouts);
    const beforePlan = resolveDocumentPageFlowPlan({ collection: input.collection!,
      blocks: noteBlocksToPageFlow(input.blocks, input.layouts, {}, {}) });
    const oldHeading = beforePlan.fragments.find((fragment) => fragment.blockId === 'first')!.layout;
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    expect(await runWithRender(() => result.current.chapter.moveChapter(id, 'tail', 'after'))).toBe(true);
    const afterPlan = resolveDocumentPageFlowPlan({ collection: input.collection!,
      blocks: noteBlocksToPageFlow(result.current.orderedBlocks, result.current.layouts, {}, {}) });
    const newHeading = afterPlan.fragments.find((fragment) => fragment.blockId === 'first')!.layout;
    expect(result.current.layouts.detail.y).toBe(original.detail.y + newHeading.y - oldHeading.y);
    expect(result.current.layouts.first).toEqual(original.first);
    expect(result.current.layouts.body).toEqual(original.body);
    expect(result.current.layouts.nested).toEqual(original.nested);
    expect(input.saveLayouts).toHaveBeenCalledTimes(1);
    expect(Object.keys(input.saveLayouts.mock.calls[0]![0])).toEqual(['detail']);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(original);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
  });

  it('waits for existing placement writes with A1 suspended before submitting the chapter batch', async () => {
    const input = placedInput();
    let drained!: () => void;
    input.whenWritesIdle.mockImplementationOnce(() => new Promise<void>((resolve) => { drained = resolve; }));
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    let completed: boolean | undefined;
    act(() => { void result.current.chapter.moveChapter(id, 'tail', 'after').then((value) => { completed = value; }); });
    await waitFor(() => expect(input.whenWritesIdle).toHaveBeenCalledTimes(1));
    expect(result.current.chapter.isMoving).toBe(true);
    expect(input.write).not.toHaveBeenCalled();
    expect(input.saveLayouts).not.toHaveBeenCalled();
    act(() => { drained(); });
    await waitFor(() => expect(completed).toBe(true));
    expect(result.current.chapter.isMoving).toBe(false);
    expect(input.saveLayouts).toHaveBeenCalledTimes(1);
    expect(input.write).toHaveBeenCalledTimes(1);
  });

  it('retains the existing undo recovery when reordering fails after placements were saved', async () => {
    const input = placedInput();
    input.write.mockResolvedValueOnce(false);
    const original = structuredClone(input.layouts);
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    await act(async () => { expect(await result.current.chapter.moveChapter(id, 'tail', 'after')).toBe(false); });
    expect(result.current.layouts).not.toEqual(original);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
    expect(result.current.chapter.isMoving).toBe(false);
    input.whenWritesIdle.mockRejectedValueOnce(new Error('Earlier placement attempt failed'));
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(original);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
    expect(input.saveLayouts).toHaveBeenCalledTimes(2);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('moves a manual chapter geometrically even when its order beside the target is unchanged', async () => {
    const input = placedInput();
    const original = structuredClone(input.layouts);
    const { result } = renderHook(() => useHarness(input));
    const id = result.current.chapter.projection.roots[0]!.id;
    expect(await runWithRender(() => result.current.chapter.moveChapter(id, 'last', 'before'))).toBe(true);
    expect(result.current.layouts.detail.y + result.current.layouts.detail.height + DEFAULT_BLOCK_GAP).toBe(original.last.y);
    expect(result.current.layouts.first.y - original.first.y).toBe(result.current.layouts.detail.y - original.detail.y);
    expect(result.current.orderedBlocks).toEqual(input.blocks);
    expect(input.write).not.toHaveBeenCalled();
    expect(input.saveLayouts).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.layouts).toEqual(original);
    expect(input.write).not.toHaveBeenCalled();
  });

  it('lets a new Note move while an old Note is still draining its earlier writes', async () => {
    const input = placedInput();
    let drained!: () => void;
    input.whenWritesIdle.mockImplementationOnce(() => new Promise<void>((resolve) => { drained = resolve; }));
    const { result, rerender } = renderHook((props) => useHarness(props), { initialProps: input });
    const id = result.current.chapter.projection.roots[0]!.id;
    let oldOutcome: boolean | undefined;
    act(() => { void result.current.chapter.moveChapter(id, 'tail', 'after').then((value) => { oldOutcome = value; }); });
    await waitFor(() => expect(input.whenWritesIdle).toHaveBeenCalledTimes(1));
    rerender({ ...input, noteId: 'note-b' });
    expect(result.current.chapter.isMoving).toBe(false);
    expect(await runWithRender(() => result.current.chapter.moveChapter(id, 'tail', 'after'))).toBe(true);
    act(() => { drained(); });
    await waitFor(() => expect(oldOutcome).toBe(false));
    expect(input.saveLayouts).toHaveBeenCalledTimes(1);
    expect(input.write).toHaveBeenCalledTimes(1);
    expect(result.current.chapter.isMoving).toBe(false);
  });
});
