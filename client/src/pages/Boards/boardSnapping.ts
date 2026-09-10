import type { BoardRect } from './boardSelection';
import type { BoardPoint } from './boardViewport';

export const BOARD_SNAP_THRESHOLD_PX = 6;

export type BoardAlignmentGuide = {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
};

type AxisMatch = { correction: number; position: number; target: BoardRect };

function alignmentPoints(rect: BoardRect, axis: 'x' | 'y'): number[] {
  const start = rect[axis];
  const size = axis === 'x' ? rect.w : rect.h;
  return [start, start + size / 2, start + size];
}

function closestMatch(primary: BoardRect, targets: readonly BoardRect[], axis: 'x' | 'y', threshold: number): AxisMatch | null {
  let nearest: AxisMatch | null = null;
  const primaryPoints = alignmentPoints(primary, axis);
  for (const target of targets) {
    for (const primaryPoint of primaryPoints) {
      for (const targetPoint of alignmentPoints(target, axis)) {
        const correction = targetPoint - primaryPoint;
        if (Math.abs(correction) <= threshold && (!nearest || Math.abs(correction) < Math.abs(nearest.correction))) {
          // Keeping the first exact tie preserves target and edge/center order.
          nearest = { correction, position: targetPoint, target };
        }
      }
    }
  }
  return nearest;
}

/** Snap one primary object's translation; callers keep the same delta for its group. */
export function snapBoardTranslation(primary: BoardRect, delta: BoardPoint, targets: readonly BoardRect[], zoom: number): {
  delta: BoardPoint;
  guides: BoardAlignmentGuide[];
} {
  if (!Number.isFinite(zoom) || zoom <= 0) return { delta: { ...delta }, guides: [] };
  const proposed = { ...primary, x: primary.x + delta.x, y: primary.y + delta.y };
  const threshold = BOARD_SNAP_THRESHOLD_PX / zoom;
  const xMatch = closestMatch(proposed, targets, 'x', threshold);
  const yMatch = closestMatch(proposed, targets, 'y', threshold);
  const snappedDelta = { x: delta.x + (xMatch?.correction ?? 0), y: delta.y + (yMatch?.correction ?? 0) };
  const snapped = { ...primary, x: primary.x + snappedDelta.x, y: primary.y + snappedDelta.y };
  const padding = 8 / zoom;
  const guides: BoardAlignmentGuide[] = [];
  if (xMatch) guides.push({ axis: 'x', position: xMatch.position,
    start: Math.min(snapped.y, xMatch.target.y) - padding,
    end: Math.max(snapped.y + snapped.h, xMatch.target.y + xMatch.target.h) + padding });
  if (yMatch) guides.push({ axis: 'y', position: yMatch.position,
    start: Math.min(snapped.x, yMatch.target.x) - padding,
    end: Math.max(snapped.x + snapped.w, yMatch.target.x + yMatch.target.w) + padding });
  return { delta: snappedDelta, guides };
}
