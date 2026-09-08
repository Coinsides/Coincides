import type { CanvasBoundaryKind, CanvasSurface, NoteCanvasMode } from './types';

// V13.2 S5: retain the historical mode and placement vocabulary until 13.6.
export const CANVAS_MODE_RETIRED = true;

export function resolveActiveNoteCanvasMode(mode: unknown): NoteCanvasMode {
  if (CANVAS_MODE_RETIRED) return 'page';
  return mode === 'canvas' ? 'canvas' : 'page';
}

export type WritableCanvasSurface = Exclude<CanvasSurface, 'canvas_workspace'>;
export type WritableCanvasBoundary = Exclude<CanvasBoundaryKind, 'crossing'>;
export type CanvasPlacementWritePayload = Record<string, unknown> & {
  surface: WritableCanvasSurface;
  boundary_role?: WritableCanvasBoundary;
};

export function assertNoRetiredCanvasWrite(placement: { surface?: unknown; boundary_role?: unknown }): void {
  if (placement.surface === 'canvas_workspace') throw new Error('canvas_workspace_retired');
  if (placement.boundary_role === 'crossing') throw new Error('canvas_crossing_retired');
}

/** Only write DTOs pass this gate; historical models and geometry stay readable. */
export function requireCanvasPlacementWritePayload(
  placement: Record<string, unknown>,
): CanvasPlacementWritePayload {
  assertNoRetiredCanvasWrite(placement);
  // An omitted surface used to regenerate workspace in the server normalizer.
  if (placement.surface !== 'formal_page' && placement.surface !== 'tray') {
    throw new Error('canvas_surface_required');
  }
  if (placement.boundary_role !== undefined
    && placement.boundary_role !== 'inside' && placement.boundary_role !== 'outside') {
    throw new Error('canvas_boundary_invalid');
  }
  return placement as CanvasPlacementWritePayload;
}

export function requireCanvasObjectWritePayload(payload: Record<string, unknown>): Record<string, unknown> & {
  placement: CanvasPlacementWritePayload;
} {
  const placement = payload.placement;
  if (!placement || typeof placement !== 'object' || Array.isArray(placement)) {
    throw new Error('canvas_surface_required');
  }
  requireCanvasPlacementWritePayload(placement as Record<string, unknown>);
  return payload as Record<string, unknown> & { placement: CanvasPlacementWritePayload };
}
