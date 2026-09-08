// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  applyWorldRectToLayout,
  canonicalizeDraftLayout,
  draftAuthorityBoundary,
  moveAffiliatedLayout,
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
import type { PageFrameModel } from './types';

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
