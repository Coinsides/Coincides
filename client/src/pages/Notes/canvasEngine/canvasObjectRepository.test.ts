import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyCanvasLayoutsToBlocks,
  saveBlockCanvasPlacementForNote,
  savePageFrameCollectionForNote,
} from './canvasObjectRepository';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameCollectionModel } from './types';

const transport = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: transport }));

const bareId = '96aea1d0-b2ae-4917-b59e-b2f24354dc8b';
const prefixedId = `canvas-placement:${bareId}`;
const collection: PageFrameCollectionModel = {
  primaryFrameId: 'source-page-3',
  pageFrames: [{
    id: 'source-page-3', role: 'primary_page_frame', exportable: true,
    x: 80, y: 2796, width: 904, height: 1278,
    contentInset: { top: 0, right: 72, bottom: 96, left: 72 },
  }],
};
const layout: BlockBoxLayout = {
  x: 0, y: 24, width: 760, height: 100, surface: 'formal_page',
  coordinate_space: 'page_frame_local', frame_id: 'source-page-3',
};
const options = { pageFrameCollection: collection, coordinateContract: 'v2' as const };
function block(placementId: string | undefined = bareId): NoteBlock {
  return {
    id: 'source-block', placement_id: placementId, order_index: 0,
    block_type: 'paragraph', title: null, content_json: {}, plain_text: 'Original page 3',
    metadata: {}, source_references: [], display_overrides_json: {}, canvas_layout: null,
  };
}

beforeEach(() => vi.resetAllMocks());

describe('canvas placement hydration read matching', () => {
  it.each([
    [bareId, bareId], [bareId, prefixedId],
    [prefixedId, bareId], [prefixedId, prefixedId],
  ])('hydrates block ID %s from layout ID %s without rewriting either identity', (blockId, layoutId) => {
    const rows = [block(blockId)];
    const records = [{ block_id: rows[0].id, placement_id: layoutId, layout: { ...layout } }];
    const before = JSON.stringify({ rows, records });
    const [hydrated] = applyCanvasLayoutsToBlocks(rows, records, options);
    expect(hydrated.canvas_layout).toMatchObject(layout);
    expect(hydrated.placement_id).toBe(blockId);
    expect(JSON.stringify({ rows, records })).toBe(before);
    expect(transport.put).not.toHaveBeenCalled();
  });

  it.each([
    'canvas-placement:96aea1d0-b2ae-4917-b59e-b2f24354dc8c',
    `other-placement:${bareId}`,
    `unrelated:canvas-placement:${bareId}`,
  ])('does not match unrelated ID %s even for the same block', (placementId) => {
    const row = block();
    expect(applyCanvasLayoutsToBlocks([row], [{
      block_id: row.id, placement_id: placementId, layout: { ...layout },
    }], options)[0]).toBe(row);
  });

  it('keeps separate placements of the same block on their own layouts', () => {
    const otherId = '785e6476-3206-4ca9-8176-256698340fa3';
    const rows = [block(), block(otherId)];
    const hydrated = applyCanvasLayoutsToBlocks(rows, [
      { block_id: rows[0].id, placement_id: prefixedId, layout: { ...layout } },
      { block_id: rows[0].id, placement_id: otherId, layout: { ...layout, y: 200 } },
    ], options);
    expect(hydrated.map(row => row.canvas_layout?.y)).toEqual([24, 200]);
    expect(hydrated.map(row => row.placement_id)).toEqual([bareId, otherId]);
  });

  it('preserves block-ID fallback only when the block has no placement ID', () => {
    const row = block();
    row.placement_id = '';
    expect(applyCanvasLayoutsToBlocks([row], [{
      block_id: row.id, placement_id: prefixedId, layout: { ...layout },
    }], options)[0].canvas_layout).toMatchObject(layout);
    const rows = [row];
    expect(applyCanvasLayoutsToBlocks(rows, [], options)).toBe(rows);
  });

  it.each([[bareId, prefixedId], [prefixedId, bareId]])(
    'preserves original block ID %s in save URL and wall layout_updates after reading %s',
    async (blockId, layoutId) => {
      const record = { block_id: 'source-block', placement_id: layoutId, layout: { ...layout } };
      const [hydrated] = applyCanvasLayoutsToBlocks([block(blockId)], [record], options);
      expect(hydrated.canvas_layout).toMatchObject(layout);
      transport.put.mockResolvedValueOnce({ data: record });
      const saved = await saveBlockCanvasPlacementForNote({
        noteId: 'synthetic-note', block: hydrated, layout, ...options,
      });
      expect(transport.put.mock.calls[0][0]).toBe(
        `/canvas-objects/by-note/synthetic-note/block-placements/${blockId}`,
      );
      expect(saved.placement_id).toBe(layoutId);
      transport.put.mockResolvedValueOnce({ data: collection });
      await savePageFrameCollectionForNote({
        noteId: 'synthetic-note', collection, coordinateContract: 'v2',
        layoutUpdates: [{ block: hydrated, layout }],
        objectLayoutUpdates: [{ objectId: 'object', placementId: prefixedId, layout: { ...layout } }],
      });
      expect(transport.put.mock.calls[1][1]).toMatchObject({
        layout_updates: [{ block_id: hydrated.id, placement_id: blockId }],
        object_layout_updates: [{ object_id: 'object', placement_id: prefixedId }],
      });
    },
  );
});
