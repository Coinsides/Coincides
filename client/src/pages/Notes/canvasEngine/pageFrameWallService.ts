import type { PageFrameBlockLayoutUpdate, PageFrameObjectLayoutUpdate } from './canvasObjectRepository';
import type { CoordinateContract } from './placementContractService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';
import type { CanvasObject, CanvasPlacement, PageFrameCollectionModel, PageFrameModel } from './types';

export type PageFrameWallSide = 'left' | 'right';
export interface PageFrameWallSnapshot {
  collection: PageFrameCollectionModel;
  layoutUpdates: PageFrameBlockLayoutUpdate[];
  objectLayoutUpdates: PageFrameObjectLayoutUpdate[];
}

/** All frames share horizontal insets; the narrowest frame limits the gesture. */
export function movePageFrameWall(collection: PageFrameCollectionModel, frameId: string, side: PageFrameWallSide, delta: number): PageFrameCollectionModel {
  const source = collection.pageFrames.find((frame) => frame.id === frameId);
  if (!source || !Number.isFinite(delta)) return collection;
  const other = side === 'left' ? 'right' : 'left';
  const opposite = Math.min(240, Math.max(24, source.contentInset[other]));
  const maximum = Math.min(240, ...collection.pageFrames.map((frame) => frame.width - opposite - 320));
  if (maximum < 24) return collection;
  const value = Math.min(maximum, Math.max(24, source.contentInset[side] + delta));
  return {
    ...collection,
    pageFrames: collection.pageFrames.map((frame) => ({
      ...frame,
      contentInset: { ...frame.contentInset, [other]: opposite, [side]: value },
    })),
  };
}

function clampBox<T extends { x: number; width: number }>(box: T, span: number): T {
  if (box.x + box.width <= span) return box;
  return { ...box, x: Math.max(0, span - box.width), width: Math.min(box.width, span) };
}

function genericFrame(placement: CanvasPlacement, objects: CanvasObject[], frames: PageFrameModel[], contract: CoordinateContract) {
  const kind = objects.find((object) => object.objectId === placement.objectId)?.kind;
  if (contract === 'v1' || !kind || ['freehand', 'page_frame', 'paragraph_block_projection'].includes(kind)
    || placement.surface !== 'formal_page' || placement.sourceCoordinateSpace === 'canvas_world') return undefined;
  return frames.find((frame) => frame.id === placement.frameId);
}

/** Re-project hydrated generic world boxes; this never writes local coordinates. */
export function projectWallPlacements(placements: CanvasPlacement[], objects: CanvasObject[], before: PageFrameCollectionModel, after: PageFrameCollectionModel, contract: CoordinateContract, updates: PageFrameObjectLayoutUpdate[] = []): CanvasPlacement[] {
  return placements.map((placement) => {
    const oldFrame = genericFrame(placement, objects, before.pageFrames, contract);
    const nextFrame = after.pageFrames.find((frame) => frame.id === oldFrame?.id);
    if (!oldFrame || !nextFrame) return placement;
    const update = updates.find((item) => item.placementId === placement.placementId)?.layout;
    const x = update ? Number(update.x) : placement.x - oldFrame.x - oldFrame.contentInset.left;
    const y = update ? Number(update.y) : placement.y - oldFrame.y - oldFrame.contentInset.top;
    return { ...placement, x: x + nextFrame.x + nextFrame.contentInset.left, y: y + nextFrame.y + nextFrame.contentInset.top,
      width: update ? Number(update.width) : placement.width };
  });
}

export function buildPageFrameWallEdit(input: {
  before: PageFrameCollectionModel; after: PageFrameCollectionModel;
  blocks: NoteBlock[]; layoutDrafts?: Record<string, BlockBoxLayout>;
  objects: CanvasObject[]; placements: CanvasPlacement[]; coordinateContract: CoordinateContract;
}): { before: PageFrameWallSnapshot; after: PageFrameWallSnapshot } {
  const before: PageFrameWallSnapshot = { collection: input.before, layoutUpdates: [], objectLayoutUpdates: [] };
  const after: PageFrameWallSnapshot = { collection: input.after, layoutUpdates: [], objectLayoutUpdates: [] };
  if (input.coordinateContract === 'v1') return { before, after };
  const spans = new Map(input.after.pageFrames.map((frame) => [frame.id, frame.width - frame.contentInset.left - frame.contentInset.right]));
  for (const block of input.blocks) {
    const layout = input.layoutDrafts?.[block.id] || block.canvas_layout as BlockBoxLayout | undefined;
    if (!layout || layout.coordinate_space !== 'page_frame_local' || layout.width_mode !== 'manual'
      || layout.surface === 'tray' || layout.surface === 'canvas_workspace' || !layout.frame_id) continue;
    const oldFrame = input.before.pageFrames.find((frame) => frame.id === layout.frame_id);
    const span = spans.get(layout.frame_id);
    if (!oldFrame || span === undefined || span >= oldFrame.width - oldFrame.contentInset.left - oldFrame.contentInset.right) continue;
    const clamped = clampBox(layout, span);
    if (clamped === layout) continue;
    before.layoutUpdates.push({ block: { id: block.id, placement_id: block.placement_id }, layout: { ...layout } });
    after.layoutUpdates.push({ block: { id: block.id, placement_id: block.placement_id }, layout: clamped });
  }
  for (const placement of input.placements) {
    const frame = genericFrame(placement, input.objects, input.before.pageFrames, input.coordinateContract);
    const span = frame && spans.get(frame.id);
    if (!frame || span === undefined || span >= frame.width - frame.contentInset.left - frame.contentInset.right) continue;
    const layout = {
      x: placement.x - frame.x - frame.contentInset.left, y: placement.y - frame.y - frame.contentInset.top,
      width: placement.width, height: placement.height, rotation: placement.rotation,
      coordinate_space: 'page_frame_local', frame_id: frame.id, surface: placement.surface,
      boundary_role: placement.boundaryRole,
    };
    const clamped = clampBox(layout, span);
    if (clamped === layout) continue;
    before.objectLayoutUpdates.push({ objectId: placement.objectId, placementId: placement.placementId, layout });
    after.objectLayoutUpdates.push({ objectId: placement.objectId, placementId: placement.placementId, layout: clamped });
  }
  return { before, after };
}
