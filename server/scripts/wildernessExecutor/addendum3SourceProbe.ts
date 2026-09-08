import assert from 'node:assert/strict';
import { resolveScreenRect } from '../../../client/src/pages/Notes/canvasEngine/placementContractService.js';
import { reconcileHydratedBlockLayoutSurfaceAuthority } from '../../../client/src/pages/Notes/canvasEngine/placementService.js';
import { getPrimaryPageOffsetX } from '../../../client/src/pages/Notes/canvasEngine/viewportService.js';
import type { BlockBoxLayout } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout.js';
import type { PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types.js';

// Stop-line evidence, not an executor or migration test. Pure synthetic values only:
// no database, filesystem, environment loader, network, or product writes.
// Source shape follows sourceProjectionMaterializer.ts (v1): frame 80/80,
// 794x1123, inset 72/96, x=152, width=650, tag=canvas_world.
const offset = getPrimaryPageOffsetX('page');
assert.equal(offset, 0);
const frame = (left: number, top: number): PageFrameModel => ({
  id: 'synthetic-source-frame', role: 'primary_page_frame', exportable: true,
  x: 80, y: 80, width: 794, height: 1123,
  contentInset: { left, right: 72, top, bottom: 96 },
});
const cases = [
  { name: 'nonzero-origin-72-96', frame: frame(72, 96), x: 10, y: 10, width: 100, tag: 'page_frame_local' },
  { name: 'nonzero-origin-54-112', frame: frame(54, 112), x: 10, y: 10, width: 100, tag: 'page_frame_local' },
  { name: 'source-materialized-x152', frame: frame(72, 96), x: 152, y: 176, width: 650, tag: 'canvas_world' },
] as const;
const evidence = cases.map(input => {
  const original: BlockBoxLayout = { x: input.x, y: input.y, width: input.width, height: 72,
    rotation: 0, frame_id: input.frame.id, surface: 'formal_page', boundary_role: 'inside', coordinate_space: input.tag };
  // Apply the declared addendum-3 equation exactly, independently of the old solver.
  const candidate: BlockBoxLayout = { ...original, x: original.x,
    y: original.y - (input.frame.y + input.frame.contentInset.top), coordinate_space: 'page_frame_local' };
  const hydrate = (layout: BlockBoxLayout, contract: 'v1' | 'v2') =>
    reconcileHydratedBlockLayoutSurfaceAuthority(layout as unknown as Record<string, unknown>, [input.frame], contract) as unknown as BlockBoxLayout;
  const oldHydrated = hydrate(original, 'v1');
  const newHydrated = hydrate(candidate, 'v2');
  const screenBefore = resolveScreenRect(original, input.frame, 'v1', offset);
  const screenAfter = resolveScreenRect(candidate, input.frame, 'v2', offset);
  const hydratedScreenBefore = resolveScreenRect(oldHydrated, input.frame, 'v1', offset);
  const hydratedScreenAfter = resolveScreenRect(newHydrated, input.frame, 'v2', offset);
  assert.deepEqual(screenAfter, screenBefore, 'All required shapes satisfy the raw screen-only equation');
  if (input.name === 'source-materialized-x152') {
    assert.deepEqual({ x: candidate.x, y: candidate.y }, { x: 152, y: 0 });
    assert.equal(oldHydrated.surface, 'formal_page');
    assert.equal(newHydrated.surface, 'canvas_workspace');
    assert.deepEqual(hydratedScreenBefore, { x: 0, y: 176, width: 650, height: 72 });
    assert.deepEqual(hydratedScreenAfter, { x: 152, y: 176, width: 650, height: 72 });
    // x'=0 would preserve hydrated screen and formal membership, but breaks the
    // mandated stored-value screen equation. The builder must not choose it silently.
    const alternative = { ...candidate, x: 0 };
    assert.notDeepEqual(resolveScreenRect(alternative, input.frame, 'v2', offset), screenBefore);
    assert.deepEqual(resolveScreenRect(hydrate(alternative, 'v2'), input.frame, 'v2', offset), hydratedScreenBefore);
    assert.equal(hydrate(alternative, 'v2').surface, 'formal_page');
  } else {
    assert.ok(candidate.y < 0);
    assert.equal(newHydrated.surface, oldHydrated.surface);
    assert.deepEqual(hydratedScreenAfter, hydratedScreenBefore);
  }
  return { name: input.name, frame: input.frame, original, candidate,
    screenBefore, screenAfter, hydratedScreenBefore, hydratedScreenAfter,
    surfaceBefore: oldHydrated.surface, surfaceAfter: newHydrated.surface };
});
console.log(JSON.stringify({ result: 'SOURCE_HYDRATION_CONFLICT_REPRODUCED', synthetic: true,
  rawScreenEqual: 3, hydratedScreenEqual: 2, sourceRequiredPositiveFailed: true,
  // A raw-screen-only normalization fuse sees 3/3, so it cannot stop this drift.
  rawScreenNormalizationRate: 1, evidence }, null, 2));
