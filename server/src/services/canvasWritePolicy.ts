import { AppError } from '../middleware/errorHandler.js';

/** Applies only to current writers; migrations, rollback and historical reads retain old values. */
export function assertCanvasPlacementWriteAllowed(placement: {
  surface?: unknown;
  boundary_role?: unknown;
}): void {
  if (placement.surface === 'canvas_workspace') throw new AppError(400, 'canvas_workspace_retired');
  if (placement.boundary_role === 'crossing') throw new AppError(400, 'canvas_crossing_retired');
}
