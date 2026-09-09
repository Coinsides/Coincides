// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  applyWorldRectToLayout,
  canonicalizeDraftLayout,
  draftAuthorityBoundary,
  moveAffiliatedLayout,
  normalizeBlockLayoutForSave,
  resolveAffiliationRect,
  resolveDefaultDraftLayout,
  resolveFlowCurrentFrameId,
  resolveFlowFrameStartLayout,
  resolveScreenRect,
  screenLayoutToLocal,
  resolveWorldRect,
  selectPlacementFrame,
  toStoredLayout,
} from './placementContractService';
import {
  applyMoveSnap,
  buildDefaultBlockLayouts,
  buildLayoutPayload,
  buildRuntimeBlockPlacement,
  layoutsEqual,
  normalizeBlockLayout,
  normalizeResolvedBlockLayout,
  projectPageFrameLocalLayoutToCanvasLayout,
  reconcileHydratedBlockLayoutSurfaceAuthority,
  reflowLayoutsAfterHeightChange,
  resolveStackedLayoutCollisions,
} from './placementService';
import type { BlockBoxLayout } from './runtimeLayout';
import { createPageStackFromFrame } from './pageStackCollectionService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

const frames: PageFrameModel[] = [
  { id: 'first', role: 'primary_page_frame', exportable: true, x: 80, y: 80, width: 794, height: 1123,
    contentInset: { top: 96, right: 72, bottom: 96, left: 72 } },
  { id: 'second', role: 'secondary_page_frame', exportable: true, x: 80, y: 1239, width: 794, height: 1123,
    contentInset: { top: 96, right: 72, bottom: 96, left: 72 } },
];
const local = (frameId = 'second', y = 14): BlockBoxLayout => ({
  x: 12, y, width: 300, height: 72, surface: 'formal_page',
  coordinate_space: 'page_frame_local', frame_id: frameId, boundary_role: 'inside',
});
const legacy = (): BlockBoxLayout => ({ x: 7, y: 99, width: 500, height: 60 });

describe('first-save block affiliation on continuous paper', () => {
  const firstFrame: PageFrameModel = {
    ...frames[0], id: 'trace-frame', x: 0, y: 0, width: 904, height: 1279,
  };
  const collection: PageFrameCollectionModel = {
    pageFrames: [firstFrame], primaryFrameId: firstFrame.id,
  };
  const unplaced = (): BlockBoxLayout => ({
    x: 0, y: 0, width: 760, height: 44, coordinate_space: 'page_frame_local',
  });
  const screen = (layout: BlockBoxLayout, current = collection, offset = 72) => resolveScreenRect(
    layout, selectPlacementFrame(layout, current.pageFrames, 'v2'), 'v2', offset,
  );

  it('affiliates the default trace at local (0, -96) with no screen jump or hydration drift', () => {
    const block = { id: 'unplaced' };
    const defaults = buildDefaultBlockLayouts([block], 760, () => 44);
    const before = normalizeBlockLayout({
      block, fallback: defaults[block.id], contentWidth: 760, surfaceMode: 'page',
      contract: 'v2', estimateHeight: () => 44,
    });
    expect(selectPlacementFrame(before, collection.pageFrames, 'v2')).toBeUndefined();
    expect(screen(before)).toEqual({ x: 72, y: 0, width: 760, height: 44 });

    const saved = normalizeBlockLayoutForSave(before, collection, 'v2', 72);
    expect(saved).toMatchObject({
      x: 0, y: -96, frame_id: 'trace-frame', coordinate_space: 'page_frame_local',
      surface: 'formal_page', boundary_role: 'inside',
    });
    const hydrated = reconcileHydratedBlockLayoutSurfaceAuthority({ ...saved }, collection.pageFrames, 'v2') as unknown as BlockBoxLayout;
    expect(screen(saved)).toEqual(screen(before));
    expect(screen(hydrated)).toEqual(screen(before));
    expect(normalizeBlockLayoutForSave(saved, collection, 'v2', 72)).toEqual(saved);
    expect(before).not.toHaveProperty('frame_id', 'trace-frame');
  });

  it('uses presented frame geometry for nonzero world origins and different insets', () => {
    const movedFrame: PageFrameModel = {
      ...firstFrame, x: 420, y: 150, contentInset: { left: 54, right: 54, top: 112, bottom: 112 },
    };
    const movedCollection = { ...collection, pageFrames: [movedFrame] };
    const before = { ...unplaced(), x: 17, y: 180, width: 300 };
    for (const offset of [0, 72]) {
      const saved = normalizeBlockLayoutForSave(before, movedCollection, 'v2', offset);
      expect(saved).toMatchObject({ x: 17, y: -82, frame_id: firstFrame.id, surface: 'formal_page' });
      expect(screen(saved, movedCollection, offset)).toEqual(screen(before, movedCollection, offset));
    }
  });

  it('chooses the largest outer overlap even when an earlier frame contains the block center', () => {
    const earlier = { ...firstFrame, id: 'earlier', y: 0, height: 100 };
    const larger = { ...firstFrame, id: 'larger', x: 500, y: 10, height: 120 };
    const overlapping = { pageFrames: [earlier, larger], primaryFrameId: earlier.id };
    const before = { ...unplaced(), y: 60, height: 60 };
    const saved = normalizeBlockLayoutForSave(before, overlapping, 'v2', 72);
    expect(saved).toMatchObject({ frame_id: 'larger', x: 0, y: -46 });
    expect(screen(saved, overlapping)).toEqual(screen(before, overlapping));
  });

  it('uses the primary stack primary frame for zero overlap instead of the selected or first frame', () => {
    const selected = { ...firstFrame, id: 'selected' };
    const stackFirst = { ...firstFrame, id: 'stack-first', y: 1400 };
    const stackPrimary = { ...firstFrame, id: 'stack-primary', y: 2800 };
    const primaryStack = {
      ...createPageStackFromFrame(stackFirst, { id: 'primary-stack' }),
      frameIds: [stackFirst.id, stackPrimary.id], primaryFrameId: stackPrimary.id,
    };
    const multiStack: PageFrameCollectionModel = {
      pageFrames: [selected, stackFirst, stackPrimary],
      pageStacks: [createPageStackFromFrame(selected, { id: 'selected-stack' }), primaryStack],
      primaryFrameId: stackFirst.id, primaryStackId: primaryStack.id,
      selectedFrameId: selected.id, selectedStackId: 'selected-stack',
    };
    const before = { ...unplaced(), y: 9000 };
    const saved = normalizeBlockLayoutForSave(before, multiStack, 'v2');
    expect(saved).toMatchObject({ frame_id: 'stack-primary', x: 0, y: 6104 });
    expect(screen(saved, multiStack, 0)).toEqual(screen(before, multiStack, 0));
  });

  it('retains existing ownership, world conversion, v1 behavior, and tray geometry', () => {
    const current = { pageFrames: frames, primaryFrameId: frames[0].id };
    const owned = local('second', -20);
    expect(normalizeBlockLayoutForSave(owned, current, 'v2')).toEqual(toStoredLayout(owned, frames, 'v2'));
    const world = { ...local(), ...resolveWorldRect(local(), frames[1], 'v2'), coordinate_space: 'canvas_world' as const };
    expect(normalizeBlockLayoutForSave(world, current, 'v2')).toEqual(toStoredLayout(world, frames, 'v2'));
    const v1 = unplaced();
    expect(normalizeBlockLayoutForSave(v1, current, 'v1')).toBe(v1);
    for (const surface of ['tray', 'canvas_workspace'] as const) {
      const untouched = { ...unplaced(), surface };
      expect(normalizeBlockLayoutForSave(untouched, current, 'v2')).toBe(untouched);
    }
  });

  it('keeps absent frames and dangling explicit identities unresolved', () => {
    expect(() => normalizeBlockLayoutForSave(unplaced(), { pageFrames: [], primaryFrameId: null }, 'v2'))
      .toThrow('A resolved page frame is required to save this coordinate contract');
    expect(() => normalizeBlockLayoutForSave({ ...unplaced(), frame_id: 'missing' }, collection, 'v2'))
      .toThrow('A resolved page frame is required to save this coordinate contract');
  });

  it('preserves signed fallback coordinates and identity while stored ownership still wins', () => {
    const fallback: BlockBoxLayout = {
      ...local('first', -96), x: -12, width_mode: 'manual',
      surface_authority: { coordinateSpace: 'page_frame_local', pageBoundary: { left: 0, right: 650, frameId: 'first' } },
    };
    const options = {
      fallback, contentWidth: 650, surfaceMode: 'page' as const, contract: 'v2' as const, estimateHeight: () => 72,
    };
    expect(normalizeBlockLayout({ ...options, block: { id: 'new-block' } })).toMatchObject(fallback);
    const stored = local('second', 14);
    expect(normalizeBlockLayout({ ...options, block: { id: 'stored-block', canvas_layout: { ...stored } } }))
      .toMatchObject({ x: 12, y: 14, frame_id: 'second', coordinate_space: 'page_frame_local' });
  });
});

describe('loaded placement coordinate contract', () => {
  it('defaults to the exact v1 mixed-axis runtime and screen geometry', () => {
    const hybrid = { ...local(), y: 1349 };
    const world = { ...hybrid, x: 164, coordinate_space: 'canvas_world' as const };
    expect(resolveWorldRect(hybrid, frames[1], undefined, 72)).toEqual({ x: 84, y: 1349, width: 300, height: 72 });
    expect(resolveWorldRect(world, frames[1], undefined, 72)).toEqual({ x: 164, y: 1349, width: 300, height: 72 });
    expect(resolveScreenRect(world, frames[1], undefined, 72)).toEqual({ x: 236, y: 1349, width: 300, height: 72 });
    expect(resolveAffiliationRect(world, frames[1], undefined, 72)).toEqual({ x: 236, y: 1349, width: 300, height: 72 });
    expect(toStoredLayout(hybrid, frames)).toBe(hybrid);
  });

  it('preserves v1 screen numbers against manually normalized v2 data on both frames', () => {
    for (const frame of frames) {
      const v2 = local(frame.id);
      const v1 = { ...v2, y: v2.y + frame.y + frame.contentInset.top };
      expect(resolveScreenRect(v2, frame, 'v2', 72)).toEqual(resolveScreenRect(v1, frame, 'v1', 72));
    }
  });

  it('projects both local axes through the owning frame for runtime and round trips without drift', () => {
    const layout = local();
    const world = resolveWorldRect(layout, frames[1], 'v2', 72);
    expect(world).toEqual({ x: 164, y: 1349, width: 300, height: 72 });
    const persisted = toStoredLayout({ ...layout, ...world, coordinate_space: 'canvas_world' }, frames, 'v2');
    expect(persisted).toMatchObject(layout);
    expect(toStoredLayout(persisted, frames, 'v2')).toEqual(persisted);
    const runtime = buildRuntimeBlockPlacement({
      block: { id: 'block' }, canvasId: 'canvas', layout, pageOffsetX: 72,
      pageFrame: frames[0], pageFrames: frames, contract: 'v2', zIndex: 0,
    });
    expect(runtime).toMatchObject({ ...world, frameId: 'second' });
    expect(buildLayoutPayload({ ...layout, ...world, coordinate_space: 'canvas_world' }, 'v2', frames))
      .toMatchObject({ x: 12, y: 14, coordinate_space: 'page_frame_local', frame_id: 'second' });
  });

  it('selects an unbound world input by both axes while respecting an explicit frame', () => {
    const world = { ...local(), x: 164, y: 1349, coordinate_space: 'canvas_world' as const, frame_id: undefined };
    expect(selectPlacementFrame(world, frames, 'v2')?.id).toBe('second');
    expect(reconcileHydratedBlockLayoutSurfaceAuthority(world, frames, 'v2'))
      .toMatchObject({ x: 12, y: 14, frame_id: 'second', coordinate_space: 'page_frame_local' });
    expect(reconcileHydratedBlockLayoutSurfaceAuthority(world, frames, 'v1'))
      .toMatchObject({ x: 12, y: 1349, frame_id: 'first', coordinate_space: 'page_frame_local' });
    expect(selectPlacementFrame({ ...world, frame_id: 'first' }, frames, 'v2')?.id).toBe('first');
  });

  it('does not guess historical tags, missing frames, or convert tray/workspace coordinates', () => {
    const untagged = { ...local(), coordinate_space: undefined };
    expect(reconcileHydratedBlockLayoutSurfaceAuthority(untagged, frames, 'v2')).toBe(untagged);
    const unresolved = { ...local(), frame_id: 'missing' };
    expect(toStoredLayout(unresolved, frames, 'v2')).toBe(unresolved);
    const unbound = { ...local(), frame_id: undefined };
    expect(selectPlacementFrame(unbound, frames, 'v2', frames[0])).toBeUndefined();
    expect(toStoredLayout(unbound, frames, 'v2')).toBe(unbound);
    for (const surface of ['tray', 'canvas_workspace'] as const) {
      const layout = { ...local(), surface, coordinate_space: 'canvas_world' as const };
      expect(toStoredLayout(layout, frames, 'v2')).toBe(layout);
      expect(reconcileHydratedBlockLayoutSurfaceAuthority(layout, frames, 'v2')).toBe(layout);
    }
  });

  it('projects an explicit world layout once and preserves the exact v1 projection behavior', () => {
    const layout = { ...local(), x: 164, y: 1349, coordinate_space: 'canvas_world' as const };
    expect(projectPageFrameLocalLayoutToCanvasLayout({ layout, pageFrame: frames[1], pageOffsetX: 72, contract: 'v2' })).toBe(layout);
    expect(projectPageFrameLocalLayoutToCanvasLayout({ layout, pageFrame: frames[1], pageOffsetX: 72 }))
      .toMatchObject({ x: 316, y: 2684, coordinate_space: 'canvas_world' });
  });

  it('isolates v2 collision, reflow, and snapping within each frame', () => {
    const layouts = { a: local('first', 0), b: local('second', 0), c: local('first', 20) };
    expect(resolveStackedLayoutCollisions(layouts, ['a', 'b', 'c'], 'v2')).toMatchObject({
      a: { y: 0 }, b: { y: 0 }, c: { y: 72 },
    });
    expect(resolveStackedLayoutCollisions(layouts, ['a', 'b', 'c'])).toMatchObject({
      a: { y: 0 }, b: { y: 72 }, c: { y: 144 },
    });
    const reflowInput = { a: local('first', 0), b: local('second', 100), c: local('first', 100) };
    expect(reflowLayoutsAfterHeightChange(reflowInput, 'a', reflowInput.a, { ...reflowInput.a, height: 120 }, 'v2'))
      .toMatchObject({ b: { y: 100 }, c: { y: 148 } });
    const snapLayout = { ...local('first', 96), x: 120 };
    expect(applyMoveSnap(snapLayout, 'a', { b: local('second', 100) }, 650, 'v2').layout.y).toBe(96);
    expect(applyMoveSnap(snapLayout, 'a', { b: local('second', 100) }, 650).layout.y).toBe(100);
  });

  it('compares v2 coordinate identity and leaves local geometry stable when its frame moves', () => {
    const a = local('first');
    const b = local('second');
    expect(layoutsEqual(a, b)).toBe(true);
    expect(layoutsEqual(a, b, 'v2')).toBe(false);
    expect(layoutsEqual(a, { ...a, coordinate_space: 'canvas_world' }, 'v2')).toBe(false);
    expect(layoutsEqual(a, { ...a, boundary_role: 'crossing' }, 'v2')).toBe(false);
    expect(moveAffiliatedLayout(a, frames[0], { x: 20, y: 30 }, 'v2')).toBe(a);
    expect(moveAffiliatedLayout(a, frames[0], { x: 20, y: 30 })).toMatchObject({ x: 32, y: 44 });
  });

  it('preserves v2 signed local values during both normalization paths', () => {
    const layout = { ...local(), x: -12, y: -14, width_mode: 'manual' as const };
    const block = { id: 'block', canvas_layout: layout };
    const common = { block, contentWidth: 650, surfaceMode: 'page' as const, estimateHeight: () => 72 };
    expect(normalizeBlockLayout({ ...common, fallback: local(), contract: 'v2' })).toMatchObject({ x: -12, y: -14 });
    expect(normalizeResolvedBlockLayout({ ...common, layout, contract: 'v2' })).toMatchObject({ x: -12, y: -14 });
    expect(normalizeBlockLayout({ ...common, fallback: local() })).toMatchObject({ x: 0, y: 0 });
    expect(normalizeResolvedBlockLayout({ ...common, layout })).toMatchObject({ x: 0, y: 0 });
    const crossing = toStoredLayout(layout, frames, 'v2');
    expect(crossing.surface).toBe('canvas_workspace');
    expect(resolveWorldRect(crossing, frames[1], 'v2')).toEqual({ x: 140, y: 1321, width: 300, height: 72 });
    expect(projectPageFrameLocalLayoutToCanvasLayout({ layout: crossing, pageFrame: frames[1], pageOffsetX: 72, contract: 'v2' }))
      .toMatchObject({ x: 140, y: 1321, coordinate_space: 'canvas_world' });
    expect(resolveWorldRect({ ...layout, coordinate_space: undefined }, frames[1], 'v2'))
      .toEqual({ x: -12, y: -14, width: 300, height: 72 });
  });

  it('canonicalizes v2 flow and draft values into the selected local frame', () => {
    expect(resolveFlowFrameStartLayout(frames[1], local(), 72, 'v1', legacy)).toEqual(legacy());
    expect(resolveFlowFrameStartLayout(frames[1], local(), 72, 'v2', legacy))
      .toMatchObject({ x: 0, y: 0, frame_id: 'second', coordinate_space: 'page_frame_local' });
    const runtime = { x: 92, y: 1349, width: 300, height: 72 };
    expect(canonicalizeDraftLayout(runtime, frames[1], 72, 'runtime_surface', 'v2', legacy))
      .toMatchObject({ x: 12, y: 14, frame_id: 'second', coordinate_space: 'page_frame_local' });
    expect(canonicalizeDraftLayout(local(), frames[1], 72, 'runtime_surface', 'v2', legacy)).toMatchObject(local());
    expect(resolveDefaultDraftLayout({ a: local('first', 800), b: local('second', 14) }, 650, frames, 'v2', legacy))
      .toMatchObject({ y: 86, frame_id: 'second', coordinate_space: 'page_frame_local' });
    expect(resolveFlowCurrentFrameId(local(), 'first', 'v2')).toBe('second');
    expect(draftAuthorityBoundary(frames[1], 'v2')).toEqual({ left: 0, right: 650, frameId: 'second' });
    expect(draftAuthorityBoundary(frames[1], 'v1')).toEqual({ left: 152, right: 802, frameId: 'second' });
  });

  it('binds new paper pointer input by its screen position before an inherited frame id', () => {
    const pointer = { ...local('first'), y: 1349 };
    expect(screenLayoutToLocal(pointer, frames)).toBe(pointer);
    expect(screenLayoutToLocal(pointer, frames, 'v2')).toMatchObject(local('second'));
    expect(screenLayoutToLocal({ ...pointer, y: 1310, frame_id: 'second' }, frames, 'v2'))
      .toMatchObject({ x: 12, y: -25, frame_id: 'second', coordinate_space: 'page_frame_local' });
    const unbound = { ...pointer, y: 4000, frame_id: undefined };
    expect(screenLayoutToLocal(unbound, frames, 'v2')).toBe(unbound);
  });

  it('keeps the exact legacy floating-point operation order when applying a collected world rect', () => {
    const layout = { ...local(), x: 0.1, y: 0.3 };
    const currentWorld = { ...layout, x: layout.x + 0.2 };
    const nextWorld = { ...layout, x: 0.4, y: 0.5 };
    const result = applyWorldRectToLayout(layout, currentWorld, nextWorld, 'v1', () => ({
      ...layout, x: nextWorld.x - 0.2, y: nextWorld.y,
    }));
    expect(result.x).toBe(0.2);
    expect(result.y).toBe(0.5);
    expect(result.x).not.toBe(layout.x + nextWorld.x - currentWorld.x);
  });
});
