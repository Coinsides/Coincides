import type Database from 'better-sqlite3';
import { resolveWorldRect, resolveScreenRect } from '../../../client/src/pages/Notes/canvasEngine/placementContractService.js';
import { getPrimaryPageOffsetX } from '../../../client/src/pages/Notes/canvasEngine/viewportService.js';
import { reconcileHydratedBlockLayoutSurfaceAuthority } from '../../../client/src/pages/Notes/canvasEngine/placementService.js';
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
  const frames = db.prepare(`SELECT e.frame_id, e.content_inset_json, p.x, p.y, p.width, p.height, p.rotation
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
  return { id: row.frame_id, x, y, width, height, contentInset: { left, right, top, bottom },
    role: 'primary_page_frame', exportable: true };
}

export type Solution = { status: 'normalized'; candidate: BlockBoxLayout; metadata: string;
  frame: PageFrameModel; beforeWorld: CanvasRect; beforeScreen: CanvasRect; diagnosticYMinusOrigin: number }
  | { status: 'exception'; reason: 'missing_or_invalid_frame' | 'nonfinite_geometry' | 'invalid_metadata'
    | 'unknown_coordinate_space' | 'no_exact_solution' | 'hydration_mismatch'; original: Row };

/** Solve the equations, then let the unchanged 4a functions judge BOTH rectangles.
 * No epsilon, origin guessing, clamp, rounding, or alternative coordinate reader.
 * P is the actual continuous-paper offset, not a fixture-specific O.x.
 */
export function solveCoordinates(row: Row, frame: PageFrameModel | undefined): Solution {
  const exception = (reason: Extract<Solution, { status: 'exception' }>['reason']): Solution =>
    ({ status: 'exception', reason, original: row });
  if (!frame) return exception('missing_or_invalid_frame');
  if (![row.x, row.y, row.width, row.height, row.rotation].every(finite)) return exception('nonfinite_geometry');
  const meta = record(row.metadata);
  const policy = record(meta?.layout_policy);
  if (!meta || (meta.layout_policy !== undefined && !policy)) return exception('invalid_metadata');
  const tag = policy?.coordinate_space;
  if (tag !== undefined && tag !== 'canvas_world' && tag !== 'page_frame_local') return exception('unknown_coordinate_space');
  const layout = { ...row, coordinate_space: tag } as unknown as BlockBoxLayout;
  const beforeWorld = resolveWorldRect(layout, frame, 'v1', PAGE_OFFSET_X);
  const beforeScreen = resolveScreenRect(layout, frame, 'v1', PAGE_OFFSET_X);
  const candidate: BlockBoxLayout = { ...layout, x: beforeWorld.x - (frame.x + frame.contentInset.left),
    y: beforeWorld.y - (frame.y + frame.contentInset.top), coordinate_space: 'page_frame_local' };
  if (!sameRect(beforeWorld, resolveWorldRect(candidate, frame, 'v2', PAGE_OFFSET_X))
    || !sameRect(beforeScreen, resolveScreenRect(candidate, frame, 'v2', PAGE_OFFSET_X))) return exception('no_exact_solution');
  const beforeHydrated = reconcileHydratedBlockLayoutSurfaceAuthority(layout as unknown as Record<string, unknown>, [frame], 'v1') as unknown as BlockBoxLayout;
  const afterHydrated = reconcileHydratedBlockLayoutSurfaceAuthority(candidate as unknown as Record<string, unknown>, [frame], 'v2') as unknown as BlockBoxLayout;
  if (beforeHydrated.surface !== afterHydrated.surface
    || !sameRect(resolveWorldRect(beforeHydrated, frame, 'v1', PAGE_OFFSET_X), resolveWorldRect(afterHydrated, frame, 'v2', PAGE_OFFSET_X))
    || !sameRect(resolveScreenRect(beforeHydrated, frame, 'v1', PAGE_OFFSET_X), resolveScreenRect(afterHydrated, frame, 'v2', PAGE_OFFSET_X))) {
    return exception('hydration_mismatch');
  }
  return { status: 'normalized', candidate, frame, beforeWorld, beforeScreen,
    metadata: JSON.stringify({ ...meta, layout_policy: { ...policy, coordinate_space: 'page_frame_local' } }),
    diagnosticYMinusOrigin: layout.y - (frame.y + frame.contentInset.top) };
}

export function verifySolution(row: Row, solution: Extract<Solution, { status: 'normalized' }>): boolean {
  const layout = { ...row, coordinate_space: record(record(row.metadata)?.layout_policy)?.coordinate_space } as unknown as BlockBoxLayout;
  return layout.coordinate_space === 'page_frame_local'
    && sameRect(solution.beforeWorld, resolveWorldRect(layout, solution.frame, 'v2', PAGE_OFFSET_X))
    && sameRect(solution.beforeScreen, resolveScreenRect(layout, solution.frame, 'v2', PAGE_OFFSET_X));
}
