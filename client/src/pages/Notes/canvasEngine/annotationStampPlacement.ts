/** View-space geometry only; annotation anchors and persisted data are never changed. */
export interface StampRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type StampSide = 'top' | 'bottom' | 'left' | 'right';

interface StampPlacementInput {
  anchor: StampRect;
  size: { width: number; height: number };
  bounds: StampRect;
  obstacles: readonly StampRect[];
  occupied: readonly StampRect[];
  gap?: number;
}

export type StampPlacement = StampRect & { side: StampSide };

function isFiniteRect(rect: StampRect): boolean {
  return [rect.left, rect.top, rect.width, rect.height,
    rect.left + rect.width, rect.top + rect.height].every(Number.isFinite)
    && rect.width >= 0 && rect.height >= 0;
}

function overlaps(a: StampRect, b: StampRect): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left
    && a.top < b.top + b.height && a.top + a.height > b.top;
}

/**
 * Try top, bottom, left, then right without moving away from the highlight edge.
 * Within each side, slide toward the nearest free position from the anchor start.
 * Free intervals can only start/end at a blocker or boundary edge, so testing those
 * exact coordinates is sufficient and avoids a resolution-dependent pixel scan.
 * A stamp must still touch the anchor's projection on the sliding axis. If no
 * adjacent, unobscured slot exists, return null instead of covering body text.
 */
export function placeAnnotationStamp({
  anchor, size, bounds, obstacles, occupied, gap = 2,
}: StampPlacementInput): StampPlacement | null {
  if (!isFiniteRect(anchor) || !isFiniteRect(bounds)
    || !Number.isFinite(size.width) || !Number.isFinite(size.height)
    || size.width <= 0 || size.height <= 0
    || !Number.isFinite(gap) || gap < 0) return null;

  const blockers = [...obstacles, ...occupied].filter((rect) => (
    isFiniteRect(rect) && rect.width > 0 && rect.height > 0
  ));
  const sides: readonly StampSide[] = ['top', 'bottom', 'left', 'right'];

  for (const side of sides) {
    const horizontal = side === 'top' || side === 'bottom';
    const length = horizontal ? size.width : size.height;
    const anchorStart = horizontal ? anchor.left : anchor.top;
    const anchorLength = horizontal ? anchor.width : anchor.height;
    const boundsStart = horizontal ? bounds.left : bounds.top;
    const boundsLength = horizontal ? bounds.width : bounds.height;
    const minimum = Math.max(boundsStart, anchorStart - length);
    const maximum = Math.min(boundsStart + boundsLength - length, anchorStart + anchorLength);
    if (minimum > maximum) continue;

    const fixed = side === 'top' ? anchor.top - gap - size.height
      : side === 'bottom' ? anchor.top + anchor.height + gap
        : side === 'left' ? anchor.left - gap - size.width
          : anchor.left + anchor.width + gap;
    const normalStart = horizontal ? bounds.top : bounds.left;
    const normalLength = horizontal ? bounds.height : bounds.width;
    const thickness = horizontal ? size.height : size.width;
    if (fixed < normalStart || fixed + thickness > normalStart + normalLength) continue;

    const candidates = new Set<number>([
      Math.min(maximum, Math.max(minimum, anchorStart)), minimum, maximum,
    ]);
    const sideBlockers = blockers.filter((rect) => {
      const start = horizontal ? rect.top : rect.left;
      const extent = horizontal ? rect.height : rect.width;
      return fixed < start + extent && fixed + thickness > start;
    });
    for (const rect of sideBlockers) {
      const start = horizontal ? rect.left : rect.top;
      const extent = horizontal ? rect.width : rect.height;
      candidates.add(start - length);
      candidates.add(start + extent);
    }

    const positions = [...candidates]
      .filter((position) => position >= minimum && position <= maximum)
      .sort((a, b) => Math.abs(a - anchorStart) - Math.abs(b - anchorStart) || a - b);
    for (const position of positions) {
      const candidate: StampPlacement = {
        left: horizontal ? position : fixed,
        top: horizontal ? fixed : position,
        width: size.width,
        height: size.height,
        side,
      };
      if (!sideBlockers.some((rect) => overlaps(candidate, rect))) return candidate;
    }
  }
  return null;
}
