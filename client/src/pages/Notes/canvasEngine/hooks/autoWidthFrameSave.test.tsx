import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCanvasLayoutsToBlocks, saveBlockCanvasPlacementForNote } from '../canvasObjectRepository';
import type { CanvasBlockLayoutRecord } from '../canvasPersistenceNormalizer';
import { createSurfaceModePolicy } from '../modePolicyService';
import { resolveScreenRect } from '../placementContractService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import type { PageFrameCollectionModel } from '../types';
import { useBlockPlacementInteractions } from './useBlockPlacementInteractions';
import { useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';

const transport = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: transport }));

// Entirely synthetic rows and in-memory transport; no server or database.
const collection: PageFrameCollectionModel = {
  primaryFrameId: 'auto-width-frame',
  pageFrames: [{
    id: 'auto-width-frame', role: 'primary_page_frame', exportable: true,
    x: 0, y: 0, width: 904, height: 1279,
    contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
  }],
};
const block: NoteBlock = {
  id: 'auto-width-block', placement_id: 'auto-width-placement', block_type: 'paragraph',
  title: null, content_json: {}, plain_text: 'Synthetic paragraph', metadata: {},
  order_index: 0, source_references: [], display_overrides_json: {}, canvas_layout: null,
};
const surfacePolicy = createSurfaceModePolicy('page');

function hydrate(layout: BlockBoxLayout) {
  return applyCanvasLayoutsToBlocks([block], [{
    block_id: block.id, placement_id: block.placement_id!, layout: { ...layout },
  }], { pageFrameCollection: collection, coordinateContract: 'v2' });
}

function pointer(type: 'pointermove' | 'pointerup', clientY: number) {
  const event = new Event(type);
  Object.defineProperties(event, {
    clientX: { value: 200 }, clientY: { value: clientY }, pointerId: { value: 1 },
  });
  window.dispatchEvent(event);
}

beforeEach(() => vi.resetAllMocks());

describe('v2 auto width frame remainder through drag and save', () => {
  it.each([
    { name: 'HQ x=88 auto row', x: 88, width: 672, width_mode: undefined },
    { name: 'x=0 auto row', x: 0, width: 760, width_mode: undefined },
    { name: 'manual width row', x: 88, width: 321.5, width_mode: 'manual' as const },
  ])('preserves $name and reloads without a geometry jump', async ({ x, width, width_mode }) => {
    const stored: BlockBoxLayout = {
      x, y: 120, width, height: 100, width_mode,
      surface: 'formal_page', coordinate_space: 'page_frame_local', frame_id: collection.primaryFrameId!,
    };
    transport.put.mockImplementation(async (url: string, payload: { block_id: string; layout: Record<string, unknown> }) => {
      expect(url).toBe(`/canvas-objects/by-note/auto-width-note/block-placements/${block.placement_id}`);
      return { data: { block_id: payload.block_id, placement_id: block.placement_id, layout: { ...payload.layout } } };
    });
    let save: Promise<CanvasBlockLayoutRecord> | undefined;
    const subject = renderHook(({ rows }) => {
      const [drafts, setDrafts] = useState<Record<string, BlockBoxLayout>>({});
      const movingBlockIdRef = useRef<string | null>(null);
      const suppressMeasuredReflowUntilRef = useRef(0);
      const resolved = useNoteCanvasResolvedLayoutModel({
        coordinateContract: 'v2', contentWidth: 760,
        documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
        layoutDrafts: drafts, sortedBlocks: rows, pageFrames: collection.pageFrames,
        surfaceMode: 'page', surfacePolicy,
      });
      const interactions = useBlockPlacementInteractions({
        noteId: 'auto-width-note', coordinateContract: 'v2', blockLayouts: resolved.blockLayouts,
        contentWidth: 760, estimateBlockHeightForText: () => 100,
        movingBlockIdRef, suppressMeasuredReflowUntilRef, orderedBlocks: rows,
        pageFrames: collection.pageFrames, pageOffsetX: 0,
        persistChangedBlockLayouts: (layouts) => {
          save = saveBlockCanvasPlacementForNote({
            noteId: 'auto-width-note', block, layout: layouts[block.id],
            pageFrameCollection: collection, coordinateContract: 'v2',
          });
        },
        pushLayoutHistory: vi.fn(), beginTemporaryLayoutMode: vi.fn(), clearTemporaryLayoutMode: vi.fn(),
        setInteractionState: vi.fn(), setLayoutDrafts: setDrafts,
        setSelectedBlockId: vi.fn(), setSnapGuide: vi.fn(), snapEnabled: false, surfacePolicy,
        viewportTransform: { x: 0, y: 0, width: 1200, height: 900, zoom: 1 },
      });
      return { ...resolved, ...interactions, clearDrafts: () => setDrafts({}) };
    }, { initialProps: { rows: hydrate(stored) } });

    const initial = subject.result.current.blockLayouts[block.id];
    act(() => subject.result.current.beginMoveBlock({
      clientX: 200, clientY: 200, pointerId: 1, preventDefault: vi.fn(), stopPropagation: vi.fn(),
    } as never, block, initial));
    act(() => pointer('pointermove', 220.25));
    const beforeSave = subject.result.current.blockLayouts[block.id];
    act(() => pointer('pointerup', 220.25));
    expect(save).toBeDefined();
    // Keep this first: before the fix this fails at the real retirement gate.
    await expect(save!).resolves.toMatchObject({ block_id: block.id });
    const saved = await save!;
    expect(initial).toMatchObject({ x, width, surface: 'formal_page' });
    expect(transport.put).toHaveBeenCalledTimes(1);
    expect(transport.put.mock.calls[0][1].layout).toMatchObject({
      x, y: 140.25, width, surface: 'formal_page', boundary_role: 'inside',
      coordinate_space: 'page_frame_local', frame_id: collection.primaryFrameId,
    });
    const reloaded = applyCanvasLayoutsToBlocks([block], [saved], {
      pageFrameCollection: collection, coordinateContract: 'v2',
    });
    subject.rerender({ rows: reloaded });
    act(() => subject.result.current.clearDrafts());
    const afterSave = subject.result.current.blockLayouts[block.id];
    // Exact projected pixels, including fractions; jsdom is not a browser layout engine.
    expect(resolveScreenRect(afterSave, collection.pageFrames[0], 'v2'))
      .toEqual(resolveScreenRect(beforeSave, collection.pageFrames[0], 'v2'));
    expect(afterSave.width_mode).toBe(width_mode);
  });
});
