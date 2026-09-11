import { describe, expect, it } from 'vitest';
import { createPageFrameCollectionSeed, insertPageFrameAfter } from './pageFrameCollectionService';
import { appendPageFrameToStack } from './pageStackCollectionService';
import { buildPageFrameWallEdit, movePageFrameWall, projectWallPlacements } from './pageFrameWallService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';
import type { CanvasObject, CanvasPlacement, PageFrameCollectionModel, PageFrameModel } from './types';

const frame: PageFrameModel = {
  id: 'wall-frame', role: 'primary_page_frame', exportable: true,
  x: 120, y: 240, width: 904, height: 1279, pageSize: 'A4',
  contentInset: { left: 72, right: 72, top: 96, bottom: 88 },
};
const collection: PageFrameCollectionModel = { primaryFrameId: frame.id, pageFrames: [frame] };
const box: BlockBoxLayout = {
  x: 360, y: 20.25, width: 400, height: 100, width_mode: 'manual',
  coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page',
};
function row(id: string, layout: Partial<BlockBoxLayout> = {}): NoteBlock {
  return { id, placement_id: `placement:${id}`, block_type: 'paragraph', title: null,
    content_json: {}, plain_text: 'Synthetic wall test', metadata: {}, order_index: 0,
    source_references: [], display_overrides_json: {}, canvas_layout: { ...box, ...layout } };
}
function object(id: string, kind: CanvasObject['kind']): CanvasObject {
  return { objectId: id, canvasId: 'wall-canvas', kind, backing: 'none', objectClass: 'pure', status: 'active' };
}
function placement(id: string): CanvasPlacement {
  return { objectId: id, placementId: `placement:${id}`, canvasId: 'wall-canvas', frameId: frame.id,
    surface: 'formal_page', boundaryRole: 'inside', x: frame.x + 72 + 450, y: frame.y + 96 + 30,
    width: 300, height: 100, rotation: 0, zIndex: 0, sourceCoordinateSpace: 'page_frame_local' };
}

describe('D1 note wall constraints and local clamp batches', () => {
  it.each(['left', 'right'] as const)('clamps %s independently to [24,240] and the narrowest frame span to 320', (side) => {
    const second = { ...frame, id: 'narrow-frame', width: 500, contentInset: { ...frame.contentInset, top: 30, bottom: 40 } };
    const mixed = { ...collection, pageFrames: [frame, second] };
    const before = JSON.stringify(mixed);
    const lower = movePageFrameWall(mixed, frame.id, side, -5000);
    const upper = movePageFrameWall(mixed, frame.id, side, 5000);
    expect(lower.pageFrames.map((item) => item.contentInset[side])).toEqual([24, 24]);
    expect(upper.pageFrames.map((item) => item.contentInset[side])).toEqual([108, 108]);
    const regular = movePageFrameWall(collection, frame.id, side, 5000);
    expect(regular.pageFrames[0].contentInset[side]).toBe(240);
    for (const result of [lower, upper, regular]) {
      for (const item of result.pageFrames) {
        expect(item.contentInset.left).toBeGreaterThanOrEqual(24);
        expect(item.contentInset.left).toBeLessThanOrEqual(240);
        expect(item.contentInset.right).toBeGreaterThanOrEqual(24);
        expect(item.contentInset.right).toBeLessThanOrEqual(240);
        expect(item.width - item.contentInset.left - item.contentInset.right).toBeGreaterThanOrEqual(320);
      }
    }
    expect(upper.pageFrames.map((item) => [item.contentInset.top, item.contentInset.bottom])).toEqual([[96, 88], [30, 40]]);
    expect(JSON.stringify(mixed)).toBe(before);
  });

  it('batches only violating manual blocks and images, preserving auto, ink, world and block projections', () => {
    const after = movePageFrameWall(collection, frame.id, 'right', 160);
    const blocks = [row('manual'), row('wide', { x: 0, width: 700 }), row('fit', { x: 20, width: 100 }),
      row('auto', { x: 0, width: 760, width_mode: undefined }), row('world', { coordinate_space: 'canvas_world' }),
      row('tray', { surface: 'tray' })];
    const objects = [object('image', 'image'), object('ink', 'freehand'), object('projection', 'paragraph_block_projection'), object('world-image', 'image')];
    const placements = objects.map((item) => placement(item.objectId));
    placements[3] = { ...placements[3], sourceCoordinateSpace: 'canvas_world' };
    const beforeBytes = JSON.stringify({ collection, blocks, objects, placements });
    const edit = buildPageFrameWallEdit({ before: collection, after, blocks, objects, placements, coordinateContract: 'v2' });
    expect(edit.after.layoutUpdates.map((item) => [item.block.id, item.layout.x, item.layout.width])).toEqual([
      ['manual', 200, 400], ['wide', 0, 600],
    ]);
    expect(edit.before.layoutUpdates.map((item) => [item.block.id, item.layout.x, item.layout.width])).toEqual([
      ['manual', 360, 400], ['wide', 0, 700],
    ]);
    expect(edit.after.objectLayoutUpdates.map((item) => [item.objectId, item.layout.x, item.layout.width])).toEqual([['image', 300, 300]]);
    expect(edit.before.objectLayoutUpdates[0].layout).toMatchObject({ x: 450, y: 30, width: 300 });
    expect(JSON.stringify({ collection, blocks, objects, placements })).toBe(beforeBytes);
  });

  it('keeps an existing workspace crossing row outside the editable paper clamp batch', () => {
    const crossing = row('crossing-manual', { x: 700, width: 100, surface: 'canvas_workspace', boundary_role: 'crossing' });
    const edit = buildPageFrameWallEdit({ before: collection, after: movePageFrameWall(collection, frame.id, 'right', 160),
      blocks: [crossing], objects: [], placements: [], coordinateContract: 'v2' });
    expect(edit.after.layoutUpdates).toEqual([]);
    expect(edit.before.layoutUpdates).toEqual([]);
    expect(crossing.canvas_layout).toMatchObject({ x: 700, width: 100, surface: 'canvas_workspace', boundary_role: 'crossing' });
  });

  it('uses the active manual draft and leaves v1 placement batches empty', () => {
    const after = movePageFrameWall(collection, frame.id, 'right', 160);
    const blocks = [row('manual', { x: 20, width: 100 })];
    const input = { before: collection, after, blocks, layoutDrafts: { manual: { ...box, x: 350, width: 410 } }, objects: [], placements: [] };
    const edit = buildPageFrameWallEdit({ ...input, coordinateContract: 'v2' });
    expect(edit.after.layoutUpdates[0].layout).toMatchObject({ x: 190, width: 410 });
    expect(edit.before.layoutUpdates[0].layout).toMatchObject({ x: 350, width: 410 });
    expect(buildPageFrameWallEdit({ ...input, coordinateContract: 'v1' }).after).toMatchObject({ layoutUpdates: [], objectLayoutUpdates: [] });
  });

  it('moves the left content origin without rewriting coordinates or adding clamp updates', () => {
    const after = movePageFrameWall(collection, frame.id, 'left', -48);
    const blocks = [row('manual')];
    const objects = [object('image', 'image'), object('ink', 'freehand')];
    const placements = objects.map((item) => placement(item.objectId));
    const before = JSON.stringify({ blocks, placements });
    const edit = buildPageFrameWallEdit({ before: collection, after, blocks, objects, placements, coordinateContract: 'v2' });
    expect(edit.after).toMatchObject({ layoutUpdates: [], objectLayoutUpdates: [] });
    const projected = projectWallPlacements(placements, objects, collection, after, 'v2');
    expect(projected[0].x).toBe(placements[0].x - 48);
    expect(projected[0].x - after.pageFrames[0].x - after.pageFrames[0].contentInset.left).toBe(450);
    expect(projected[1]).toBe(placements[1]);
    expect(JSON.stringify({ blocks, placements })).toBe(before);
  });

  it('preserves current horizontal and vertical insets through real insert and append services', () => {
    const adjusted = movePageFrameWall(createPageFrameCollectionSeed(frame), frame.id, 'left', -48);
    const inserted = insertPageFrameAfter(adjusted, frame.id, { id: 'inserted' });
    const appended = appendPageFrameToStack(adjusted, adjusted.primaryStackId!, frame.id, { id: 'appended' });
    for (const [result, id] of [[inserted, 'inserted'], [appended, 'appended']] as const) {
      expect(result.pageFrames.find((item) => item.id === id)?.contentInset).toEqual({ left: 24, right: 72, top: 96, bottom: 88 });
    }
  });
});
