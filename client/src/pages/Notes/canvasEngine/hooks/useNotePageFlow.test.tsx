import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { PageFrameCollectionModel, PageFrameModel } from '../types';
import { useNotePageFlow } from './useNotePageFlow';
import { createDefaultNoteBindingSettings } from '../../../../../../shared/types/noteBinding';

type Input = Parameters<typeof useNotePageFlow>[0];
const collectionFor = (frame: PageFrameModel): PageFrameCollectionModel => ({
  pageFrames: [frame], primaryFrameId: frame.id, pageStacks: [createPageStackFromFrame(frame)],
});
function fixture(): Input {
  // Keep 200px of body capacity so the pending-save test still changes wall
  // geometry while retaining the same generated frame IDs.
  const frame = { ...createPrimaryPageFrame({ id: 'page' }), width: 320, height: 258,
    contentInset: { left: 10, right: 10, top: 48, bottom: 10 } };
  const blocks: NoteBlock[] = ['甲'.repeat(180), '后续块'].map((text, index) => ({
    id: `block-${index}`, placement_id: `placement-${index}`, block_type: 'paragraph', title: null,
    content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text) }, plain_text: text,
    metadata: {}, order_index: index, source_references: [], display_overrides_json: {},
  }));
  return {
    noteId: 'note', enabled: true, coordinateContract: 'v2', blocks,
    layouts: Object.fromEntries(blocks.map((block) => [block.id, {
      x: 0, y: 0, width: 300, height: 42, frame_id: frame.id, width_mode: 'auto',
      coordinate_space: 'page_frame_local', surface: 'formal_page',
    }])),
    pageFrames: [frame], collection: collectionFor(frame), typography: createDefaultDocumentTypographyProfile(),
    textDrafts: {}, flowDrafts: {}, saveCollection: vi.fn(async () => {}), persistLayout: vi.fn(async () => true),
  };
}

 describe('A1 useNotePageFlow persistence convergence', () => {
  it('recomputes full and folded header reservation when binding settings change without writing body coordinates', () => {
    const input = fixture();
    input.enabled = false;
    input.pageFrames = input.pageFrames.map((frame) => ({ ...frame, contentInset: { ...frame.contentInset, top: 0 } }));
    input.collection = collectionFor(input.pageFrames[0]);
    input.bindingSettings = createDefaultNoteBindingSettings();
    input.hiddenBlockIds = new Set(['block-0']);
    const before = structuredClone(input.layouts);
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: input });
    expect(result.current.fullPlan!.fragments[0].layout.y).toBe(48);
    expect(result.current.plan!.fragments[0].layout.y).toBe(48);
    const shifted = structuredClone(input.bindingSettings);
    shifted.sections[0].slots['header-center'].offsetY = 24;
    rerender({ ...input, bindingSettings: shifted });
    expect(result.current.fullPlan!.fragments[0].layout.y).toBe(72);
    expect(result.current.plan!.fragments[0].layout.y).toBe(72);
    rerender({ ...input, bindingSettings: { ...shifted, enabled: false } });
    expect(result.current.fullPlan!.fragments[0].layout.y).toBe(0);
    expect(result.current.plan!.fragments[0].layout.y).toBe(0);
    expect(input.layouts).toEqual(before);
    expect(input.saveCollection).not.toHaveBeenCalled();
    expect(input.persistLayout).not.toHaveBeenCalled();
  });

  it('does not repeat writes when equivalent parent arrays and profiles are recreated', async () => {
    const input = fixture();
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: input });
    await waitFor(() => expect(input.persistLayout).toHaveBeenCalledTimes(1));
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    const first = result.current.plan;
    await act(async () => {
      rerender({ ...input, blocks: [...input.blocks], layouts: { ...input.layouts }, pageFrames: [...input.pageFrames],
        typography: { ...input.typography }, collection: structuredClone(input.collection), textDrafts: {}, flowDrafts: {} });
    });
    expect(result.current.plan?.fragments).toEqual(first?.fragments);
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    expect(input.persistLayout).toHaveBeenCalledTimes(1);
  });

  it('persists new frames before first-fragment affiliation and settles after their acknowledgement', async () => {
    const input = fixture();
    let acknowledge!: () => void;
    input.saveCollection = vi.fn(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: input });
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    expect(input.persistLayout).not.toHaveBeenCalled();
    await act(async () => { acknowledge(); });
    await waitFor(() => expect(input.persistLayout).toHaveBeenCalledTimes(1));
    const plan = result.current.plan!;
    const persistedLayouts = { ...input.layouts };
    for (const update of plan.placementUpdates) persistedLayouts[update.blockId] = update.layout;
    await act(async () => rerender({ ...input, collection: plan.collection, pageFrames: plan.collection.pageFrames, layouts: persistedLayouts }));
    expect(result.current.plan?.appendedFrameIds).toEqual([]);
    expect(result.current.plan?.placementUpdates).toEqual([]);
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    expect(input.persistLayout).toHaveBeenCalledTimes(1);
  });

  it('retries the latest page geometry after walls change during a pending save with the same generated IDs', async () => {
    const input = fixture();
    let acknowledge!: () => void;
    const saves: PageFrameCollectionModel[] = [];
    input.saveCollection = vi.fn((value) => {
      saves.push(value);
      return saves.length === 1 ? new Promise<void>((resolve) => { acknowledge = resolve; }) : Promise.resolve();
    });
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: input });
    const generatedIds = result.current.plan!.appendedFrameIds;
    const changed = { ...input.pageFrames[0], contentInset: { ...input.pageFrames[0].contentInset, right: 30 } };
    await act(async () => rerender({ ...input, pageFrames: [changed], collection: collectionFor(changed) }));
    expect(result.current.plan!.appendedFrameIds).toEqual(generatedIds);
    await act(async () => { acknowledge(); });
    await waitFor(() => expect(input.saveCollection).toHaveBeenCalledTimes(2));
    expect(saves[1].pageFrames.every((frame) => frame.contentInset.right === 30)).toBe(true);
  });

  it('keeps read-only surfaces projected without saving and leaves Web as a single growing page', async () => {
    const input = fixture();
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: { ...input, enabled: false } });
    expect(result.current.plan?.fragments.length).toBeGreaterThan(1);
    expect(input.saveCollection).not.toHaveBeenCalled();
    const web = { ...input.pageFrames[0], templateId: 'screen_note' as const };
    await act(async () => rerender({ ...input, enabled: false, pageFrames: [web], collection: collectionFor(web) }));
    expect(result.current.plan).toBeUndefined();
    expect(result.current.layouts).toBe(input.layouts);
    expect(input.saveCollection).not.toHaveBeenCalled();
    expect(input.persistLayout).not.toHaveBeenCalled();
  });

  it('reflows collapsed content only in presentation and expands without additional page or affiliation writes', async () => {
    const input = fixture();
    const heading: NoteBlock = { ...input.blocks[1], id: 'chapter', placement_id: 'chapter-placement',
      content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1('Chapter', 'heading_1') }, plain_text: 'Chapter' };
    input.blocks = [heading, ...input.blocks];
    input.layouts = { ...input.layouts, chapter: { ...input.layouts['block-1'] } };
    const storedBefore = structuredClone({ blocks: input.blocks, layouts: input.layouts, collection: input.collection });
    const { result, rerender } = renderHook((props: Input) => useNotePageFlow(props), { initialProps: input });
    const complete = result.current.fullPlan!;
    await waitFor(() => expect(input.persistLayout).toHaveBeenCalledTimes(complete.placementUpdates.length));
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    const writes = vi.mocked(input.persistLayout).mock.calls.length;
    const expandedLayouts = result.current.fullLayouts;
    const fullBodyFragments = complete.fragments.filter((fragment) => fragment.blockId === 'block-0');
    expect(fullBodyFragments.length).toBeGreaterThan(1);
    const lastExpanded = complete.fragments.find((fragment) => fragment.blockId === 'block-1')!;
    expect(lastExpanded.frameId).not.toBe(input.pageFrames[0].id);

    await act(async () => rerender({ ...input, hiddenBlockIds: new Set(['block-0']) }));
    expect(result.current.fullPlan).toBe(complete);
    expect(result.current.fullLayouts).toBe(expandedLayouts);
    expect(result.current.fullPlan!.fragments.filter((fragment) => fragment.blockId === 'block-0')).toEqual(fullBodyFragments);
    expect(result.current.plan!.fragments.map((fragment) => fragment.blockId)).toEqual(['chapter', 'block-1']);
    expect(result.current.plan!.fragments.find((fragment) => fragment.blockId === 'block-1')!.frameId)
      .toBe(input.pageFrames[0].id);
    expect(result.current.plan!.collection.pageFrames).toEqual(complete.collection.pageFrames);
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    expect(input.persistLayout).toHaveBeenCalledTimes(writes);

    await act(async () => rerender({ ...input, hiddenBlockIds: new Set() }));
    expect(result.current.plan).toBe(complete);
    expect(result.current.layouts).toBe(expandedLayouts);
    expect(input.saveCollection).toHaveBeenCalledTimes(1);
    expect(input.persistLayout).toHaveBeenCalledTimes(writes);
    expect({ blocks: input.blocks, layouts: input.layouts, collection: input.collection }).toEqual(storedBefore);
  });

  it('persists the complete page plan even when mounted collapsed and retains hidden body fragments for full consumers', async () => {
    const input: Input = { ...fixture(), hiddenBlockIds: new Set(['block-0']) };
    const storedLayouts = structuredClone(input.layouts);
    const { result } = renderHook(() => useNotePageFlow(input));
    const full = result.current.fullPlan!;
    await waitFor(() => expect(input.persistLayout).toHaveBeenCalledTimes(full.placementUpdates.length));
    expect(input.saveCollection).toHaveBeenCalledExactlyOnceWith(full.collection);
    for (const update of full.placementUpdates) {
      expect(input.persistLayout).toHaveBeenCalledWith(input.blocks.find((block) => block.id === update.blockId), update.layout);
    }
    expect(result.current.plan!.fragments.map((fragment) => fragment.blockId)).toEqual(['block-1']);
    expect(result.current.plan!.fragments[0].frameId).toBe(input.pageFrames[0].id);
    expect(full.fragments.some((fragment) => fragment.blockId === 'block-0')).toBe(true);
    expect(result.current.fullLayouts['block-1'].frame_id).not.toBe(result.current.layouts['block-1'].frame_id);
    expect(input.layouts).toEqual(storedLayouts);
  });
});
