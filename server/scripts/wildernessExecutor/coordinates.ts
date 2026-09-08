import type Database from 'better-sqlite3';
import { resolveScreenRect, resolveGenericPlacementToWorld } from '../../../client/src/pages/Notes/canvasEngine/placementContractService.js';
import { projectCanvasPlacementLayout } from '../../src/services/canvasPlacementLayout.js';
import { getPrimaryPageOffsetX } from '../../../client/src/pages/Notes/canvasEngine/viewportService.js';
import { reconcileHydratedBlockLayoutSurfaceAuthority } from '../../../client/src/pages/Notes/canvasEngine/placementService.js';
import { normalizePageFramePrintBaseline } from '../../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.js';
import type { BlockBoxLayout } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout.js';
import type { CanvasRect, PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types.js';

export type Row = Record<string, unknown> & { id: string; note_id: string; user_id: string };
export const PAGE_OFFSET_X = getPrimaryPageOffsetX('page');
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return undefined; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
export function sameRect(a: CanvasRect, b: CanvasRect): boolean {
  return (['x', 'y', 'width', 'height'] as const).every(axis => finite(a[axis]) && finite(b[axis]) && a[axis] === b[axis]);
}

export function readFrame(db: Database.Database, row: Row): PageFrameModel | undefined {
  if (typeof row.frame_id !== 'string') return undefined;
  const frames = db.prepare(`SELECT e.frame_id, e.content_inset_json, e.page_size, p.x, p.y, p.width, p.height, p.rotation
    FROM page_frame_extensions e JOIN canvas_objects o ON o.id=e.object_id AND o.user_id=e.user_id
      AND o.note_id=e.note_id AND o.kind='page_frame' AND o.status='active'
    JOIN canvas_placements p ON p.object_id=o.id AND p.user_id=o.user_id AND p.note_id=o.note_id
    WHERE e.user_id=? AND e.note_id=? AND e.frame_id=?`).all(row.user_id, row.note_id, row.frame_id) as Record<string, unknown>[];
  if (frames.length !== 1) return undefined;
  const f = frames[0];
  const inset = record(f.content_inset_json);
  if (!inset || ![f.x, f.y, f.width, f.height, inset.left, inset.right, inset.top, inset.bottom].every(finite)
    || f.rotation !== 0) return undefined;
  const { left, right, top, bottom } = inset as Record<string, number>;
  const { x, y, width, height } = f as Record<string, number>;
  if ([left, right, top, bottom].some(n => n < 0) || width - left - right <= 0 || height - top - bottom <= 0
    || ![x + left, y + top, width - left - right, height - top - bottom].every(finite)) return undefined;
  if (f.page_size !== null && !['A4', 'Letter', 'Custom'].includes(String(f.page_size))) return undefined;
  return normalizePageFramePrintBaseline({ id: row.frame_id, x, y, width, height,
    pageSize: (f.page_size || undefined) as PageFrameModel['pageSize'], contentInset: { left, right, top, bottom },
    role: 'primary_page_frame', exportable: true });
}

// Hydration can select a different frame for a canvas_world row. Never silently
// reduce that search to the requested frame. Invalid context is insufficient evidence.
export function readFrames(db: Database.Database, row: Row): PageFrameModel[] | null {
  const ids = db.prepare(`SELECT COALESCE(e.frame_id,p.frame_id) AS frame_id FROM canvas_objects o
    JOIN canvas_placements p ON p.object_id=o.id AND p.user_id=o.user_id AND p.note_id=o.note_id
    LEFT JOIN page_frame_extensions e ON o.id=e.object_id AND o.user_id=e.user_id AND o.note_id=e.note_id
    WHERE o.user_id=? AND o.note_id=? AND o.kind='page_frame' AND o.status='active'
      AND COALESCE(e.frame_id,p.frame_id) IS NOT NULL
    ORDER BY p.z_index ASC, COALESCE(e.frame_id,p.frame_id) ASC`)
    .all(row.user_id, row.note_id) as { frame_id: string }[];
  const frames = ids.map(({ frame_id }) => readFrame(db, { ...row, frame_id }));
  if (!frames.length || frames.some(f => !f) || new Set(ids.map(f => f.frame_id)).size !== ids.length) return null;
  return frames as PageFrameModel[];
}

export interface HydratedView {
  screen: CanvasRect; surface: BlockBoxLayout['surface'];
  boundaryRole: BlockBoxLayout['boundary_role']; frameId: string | undefined;
}
export function replayHydratedView(layout: BlockBoxLayout, frames: PageFrameModel[], contract: 'v1' | 'v2',
  objectKind = 'paragraph_block_projection'): HydratedView {
  if (objectKind !== 'paragraph_block_projection') {
    // The generic renderer consumes these already-projected rectangles directly;
    // it does not use block rounding or the block editor's screen reader.
    const hydrated = resolveGenericPlacementToWorld({ x: layout.x, y: layout.y, width: layout.width, height: layout.height,
      frameId: layout.frame_id, surface: layout.surface! }, objectKind, layout.coordinate_space, frames, contract);
    return { screen: { x: hydrated.x, y: hydrated.y, width: hydrated.width, height: hydrated.height },
      surface: hydrated.surface as BlockBoxLayout['surface'], boundaryRole: layout.boundary_role, frameId: hydrated.frameId };
  }
  const projected = projectCanvasPlacementLayout(layout, { coordinate_space: layout.coordinate_space });
  const hydrated = reconcileHydratedBlockLayoutSurfaceAuthority(
    projected, frames, contract) as unknown as BlockBoxLayout;
  const frame = frames.find(f => f.id === hydrated.frame_id);
  return { screen: resolveScreenRect(hydrated, frame, contract, PAGE_OFFSET_X),
    surface: hydrated.surface, boundaryRole: hydrated.boundary_role, frameId: hydrated.frame_id };
}
export function sameView(a: HydratedView, b: HydratedView): boolean {
  // Boundary/frame receipts are diagnostics, not additional hidden invariants.
  return sameRect(a.screen, b.screen) && a.surface === b.surface;
}

export type Solution = { status: 'normalized'; candidate: BlockBoxLayout; metadata: string;
  frame: PageFrameModel; frames: PageFrameModel[]; beforeHydrated: HydratedView; afterHydrated: HydratedView;
  objectKind: string; diagnosticYMinusOrigin: number }
  | { status: 'exception'; reason: 'missing_or_invalid_frame' | 'nonfinite_geometry' | 'invalid_metadata'
    | 'unknown_coordinate_space' | 'no_exact_solution' | 'hydration_mismatch' | 'incomplete_frame_context'
    | 'unresolved_consumer'; original: Row };

/** Addendum 4: tag-dispatched candidates, judged ONLY after the live hydration chain.
 * Neither raw-storage screen nor world equality is an invariant. No epsilon,
 * origin guessing, clamp, rounding, or alternative coordinate reader.
 */
export function solveCoordinates(row: Row, frame: PageFrameModel | undefined,
  frames: PageFrameModel[] | null = frame ? [frame] : null, objectKind: string | null = 'paragraph_block_projection'): Solution {
  const exception = (reason: Extract<Solution, { status: 'exception' }>['reason']): Solution =>
    ({ status: 'exception', reason, original: row });
  if (!frame) return exception('missing_or_invalid_frame');
  if (!frames?.some(f => f.id === frame.id)) return exception('incomplete_frame_context');
  if (!objectKind) return exception('unresolved_consumer');
  if (![row.x, row.y, row.width, row.height, row.rotation].every(finite)) return exception('nonfinite_geometry');
  const meta = record(row.metadata);
  const policy = record(meta?.layout_policy);
  if (!meta || (meta.layout_policy !== undefined && !policy)) return exception('invalid_metadata');
  const tag = policy?.coordinate_space;
  if (tag !== undefined && tag !== 'canvas_world' && tag !== 'page_frame_local') return exception('unknown_coordinate_space');
  const layout = { ...row, coordinate_space: tag } as unknown as BlockBoxLayout;
  const candidate: BlockBoxLayout = { ...layout,
    x: tag === 'canvas_world' ? layout.x - (frame.x + frame.contentInset.left) : layout.x,
    y: layout.y - (frame.y + frame.contentInset.top), coordinate_space: 'page_frame_local' };
  if (![candidate.x, candidate.y].every(finite)) return exception('no_exact_solution');
  const beforeHydrated = replayHydratedView(layout, frames, 'v1', objectKind);
  const afterHydrated = replayHydratedView(candidate, frames, 'v2', objectKind);
  if (!sameView(beforeHydrated, afterHydrated)) {
    return exception('hydration_mismatch');
  }
  return { status: 'normalized', candidate, frame, frames, objectKind, beforeHydrated, afterHydrated,
    metadata: JSON.stringify({ ...meta, layout_policy: { ...policy, coordinate_space: 'page_frame_local' } }),
    diagnosticYMinusOrigin: layout.y - (frame.y + frame.contentInset.top) };
}

export function verifySolution(row: Row, solution: Extract<Solution, { status: 'normalized' }>): boolean {
  const layout = { ...row, coordinate_space: record(record(row.metadata)?.layout_policy)?.coordinate_space } as unknown as BlockBoxLayout;
  return layout.coordinate_space === 'page_frame_local'
    && sameView(solution.beforeHydrated, replayHydratedView(layout, solution.frames, 'v2', solution.objectKind));
}
