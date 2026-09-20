import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPrimaryPageFrame } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { PageFrameCollectionModel, PageFrameModel } from '../types';
import { useNotePageFlow } from './useNotePageFlow';

type Input = Parameters<typeof useNotePageFlow>[0];
const collectionFor = (frame: PageFrameModel): PageFrameCollectionModel => ({
  pageFrames: [frame], primaryFrameId: frame.id, pageStacks: [createPageStackFromFrame(frame)],
});
function fixture(): Input {
  const frame = { ...createPrimaryPageFrame({ id: 'page' }), width: 320, height: 220,
    contentInset: { left: 10, right: 10, top: 10, bottom: 10 } };
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
});
