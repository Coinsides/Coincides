// Byte-identical mirror: shared/boardVisualGeometry.ts and server/src/services/boardVisualGeometry.ts.
// Server runtime cannot import shared. The board geometry contract test locks both copies.
// Board-only presentation geometry: no content, relation, or persistence dependencies.
export interface BoardPoint { x: number; y: number }
export interface BoardRect extends BoardPoint { w: number; h: number; radius?: number }
export type BoardAnchor = 'auto' | 'n' | 'e' | 's' | 'w';
export type BoardCap = 'none' | 'arrow' | 'dot';
export interface BoardArc {
  start: BoardPoint;
  end: BoardPoint;
  bend: number;
  center: BoardPoint | null;
  radius: number;
  startAngle: number;
  sweep: number;
  length: number;
  path: string;
}

const EPSILON = 1e-7;
const TAU = Math.PI * 2;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const distance = (a: BoardPoint, b: BoardPoint) => Math.hypot(b.x - a.x, b.y - a.y);
const positiveAngle = (angle: number) => ((angle % TAU) + TAU) % TAU;
const numberText = (value: number) => String(Math.round(value * 10000) / 10000);
const pointText = (point: BoardPoint) => `${numberText(point.x)} ${numberText(point.y)}`;

/** Signed distance of the bend handle from the chord. Only the normal component matters. */
export function bendFromBoardPoint(start: BoardPoint, end: BoardPoint, point: BoardPoint): number {
  const length = distance(start, end);
  if (length < EPSILON) return 0;
  return ((point.x - (start.x + end.x) / 2) * (start.y - end.y)
    + (point.y - (start.y + end.y) / 2) * (end.x - start.x)) / length;
}

/** Two ends and one signed sagitta define a true circular arc. Zero remains a straight line. */
export function createBoardArc(start: BoardPoint, end: BoardPoint, bend: number): BoardArc {
  const chord = distance(start, end);
  // Small chords cannot carry a hairpin; coincident ends are a finite zero-length line.
  const safeBend = !Number.isFinite(bend) || chord < EPSILON ? 0
    : chord < 48 ? Math.max(-chord / 2, Math.min(chord / 2, bend)) : bend;
  const arc: BoardArc = {
    start: { ...start }, end: { ...end }, bend: safeBend, center: null,
    radius: 0, startAngle: 0, sweep: 0, length: chord, path: '',
  };
  if (Math.abs(safeBend) > EPSILON) {
    const normal = { x: (start.y - end.y) / chord, y: (end.x - start.x) / chord };
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const centerOffset = safeBend / 2 - chord * chord / (8 * safeBend);
    const center = { x: midpoint.x + normal.x * centerOffset, y: midpoint.y + normal.y * centerOffset };
    const middle = { x: midpoint.x + normal.x * safeBend, y: midpoint.y + normal.y * safeBend };
    arc.center = center;
    arc.radius = distance(center, start);
    arc.startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    const middleAngle = Math.atan2(middle.y - center.y, middle.x - center.x);
    const positiveSweep = positiveAngle(endAngle - arc.startAngle);
    arc.sweep = positiveAngle(middleAngle - arc.startAngle) <= positiveSweep + EPSILON
      ? positiveSweep : positiveSweep - TAU;
    arc.length = Math.abs(arc.sweep) * arc.radius;
  }
  arc.path = boardArcSubpath(arc, 0, 1);
  return arc;
}

/** t is proportional to arc length, not a Bézier parameter. */
export function pointOnBoardArc(arc: BoardArc, position: number): BoardPoint {
  const t = clamp01(position);
  if (t === 0) return { ...arc.start };
  if (t === 1) return { ...arc.end };
  if (!arc.center) return {
    x: arc.start.x + (arc.end.x - arc.start.x) * t,
    y: arc.start.y + (arc.end.y - arc.start.y) * t,
  };
  const angle = arc.startAngle + arc.sweep * t;
  return { x: arc.center.x + Math.cos(angle) * arc.radius, y: arc.center.y + Math.sin(angle) * arc.radius };
}

export function tangentOnBoardArc(arc: BoardArc, position: number): BoardPoint {
  if (!arc.center) {
    const length = distance(arc.start, arc.end);
    return length < EPSILON ? { x: 1, y: 0 }
      : { x: (arc.end.x - arc.start.x) / length, y: (arc.end.y - arc.start.y) / length };
  }
  const angle = arc.startAngle + arc.sweep * clamp01(position);
  const direction = Math.sign(arc.sweep);
  return { x: -Math.sin(angle) * direction, y: Math.cos(angle) * direction };
}

function positionForAngle(arc: BoardArc, angle: number): number | null {
  const traveled = arc.sweep >= 0 ? positiveAngle(angle - arc.startAngle) : positiveAngle(arc.startAngle - angle);
  const sweep = Math.abs(arc.sweep);
  if (traveled > sweep + EPSILON) return null;
  return clamp01(traveled / sweep);
}

export function nearestBoardArcPosition(
  arc: BoardArc,
  point: BoardPoint,
  options: { snapToMiddle?: boolean; snapDistance?: number } = {},
): number {
  let position: number;
  if (!arc.center) {
    const dx = arc.end.x - arc.start.x;
    const dy = arc.end.y - arc.start.y;
    position = arc.length < EPSILON ? 0.5
      : clamp01(((point.x - arc.start.x) * dx + (point.y - arc.start.y) * dy) / (dx * dx + dy * dy));
  } else {
    position = positionForAngle(arc, Math.atan2(point.y - arc.center.y, point.x - arc.center.x))
      ?? (distance(point, arc.start) <= distance(point, arc.end) ? 0 : 1);
  }
  return options.snapToMiddle && Math.abs(position - 0.5) * arc.length <= (options.snapDistance ?? 10)
    ? 0.5 : position;
}

export function boardArcSubpath(arc: BoardArc, start: number, end: number): string {
  const from = clamp01(start);
  const to = clamp01(end);
  const first = pointOnBoardArc(arc, from);
  const last = pointOnBoardArc(arc, to);
  if (!arc.center || Math.abs(to - from) < EPSILON) return `M ${pointText(first)} L ${pointText(last)}`;
  const sweep = arc.sweep * (to - from);
  return `M ${pointText(first)} A ${numberText(arc.radius)} ${numberText(arc.radius)} 0 ${Math.abs(sweep) > Math.PI ? 1 : 0} ${sweep >= 0 ? 1 : 0} ${pointText(last)}`;
}

export function sampleBoardArc(arc: BoardArc, maxStep = 8): BoardPoint[] {
  const count = Math.max(1, Math.min(4096, Math.ceil(arc.length / Math.max(1, maxStep))));
  return Array.from({ length: count + 1 }, (_, index) => pointOnBoardArc(arc, index / count));
}

export function boardRectCenter(rect: BoardRect): BoardPoint {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function boardAnchorPoint(rect: BoardRect, anchor: Exclude<BoardAnchor, 'auto'>): BoardPoint {
  const center = boardRectCenter(rect);
  if (anchor === 'n') return { x: center.x, y: rect.y };
  if (anchor === 'e') return { x: rect.x + rect.w, y: center.y };
  if (anchor === 's') return { x: center.x, y: rect.y + rect.h };
  return { x: rect.x, y: center.y };
}

/** Analytic ray/rounded-rectangle intersection, starting at the rectangle center. */
export function roundedBoardRectIntersection(rect: BoardRect, toward: BoardPoint): BoardPoint {
  const center = boardRectCenter(rect);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const length = Math.hypot(dx, dy);
  if (length < EPSILON) return boardAnchorPoint(rect, 'e');
  const ux = dx / length;
  const uy = dy / length;
  const halfW = Math.max(0, rect.w / 2);
  const halfH = Math.max(0, rect.h / 2);
  const radius = Math.min(halfW, halfH, Math.max(0, rect.radius ?? 12));
  const t = Math.min(Math.abs(ux) < EPSILON ? Infinity : halfW / Math.abs(ux),
    Math.abs(uy) < EPSILON ? Infinity : halfH / Math.abs(uy));
  const x = ux * t;
  const y = uy * t;
  if (radius < EPSILON || Math.abs(x) <= halfW - radius + EPSILON || Math.abs(y) <= halfH - radius + EPSILON) {
    return { x: center.x + x, y: center.y + y };
  }
  const cornerX = Math.sign(ux) * (halfW - radius);
  const cornerY = Math.sign(uy) * (halfH - radius);
  const projection = ux * cornerX + uy * cornerY;
  const discriminant = Math.max(0, projection * projection - cornerX * cornerX - cornerY * cornerY + radius * radius);
  const hit = projection + Math.sqrt(discriminant);
  return { x: center.x + ux * hit, y: center.y + uy * hit };
}

export function boardEdgeEndpoints(
  from: BoardRect | BoardPoint,
  to: BoardRect | BoardPoint,
  options: { fromAnchor?: BoardAnchor; toAnchor?: BoardAnchor; capStart?: BoardCap; capEnd?: BoardCap; arrowGap?: number } = {},
): { start: BoardPoint; end: BoardPoint } {
  const fromCenter = 'w' in from ? boardRectCenter(from) : from;
  const toCenter = 'w' in to ? boardRectCenter(to) : to;
  const resolve = (input: BoardRect | BoardPoint, toward: BoardPoint, anchor: BoardAnchor): BoardPoint =>
    'w' in input ? anchor === 'auto' ? roundedBoardRectIntersection(input, toward) : boardAnchorPoint(input, anchor) : { ...input };
  const start = resolve(from, toCenter, options.fromAnchor ?? 'auto');
  const end = resolve(to, fromCenter, options.toAnchor ?? 'auto');
  const length = distance(start, end);
  const gap = Math.min(options.arrowGap ?? 6, length / 4);
  // Retreat outside the bound card, including an explicitly pinned anchor that faces
  // away from the other card. Chord-based offsets can otherwise push that end inside.
  const retreat = (point: BoardPoint, rect: BoardRect) => {
    const center = boardRectCenter(rect);
    const reach = distance(center, point);
    if (reach < EPSILON) return;
    point.x += (point.x - center.x) / reach * gap;
    point.y += (point.y - center.y) / reach * gap;
  };
  if ('w' in from && options.capStart === 'arrow') retreat(start, from);
  if ('w' in to && options.capEnd === 'arrow') retreat(end, to);
  return { start, end };
}

export function boardPointInRect(point: BoardPoint, rect: BoardRect): boolean {
  return point.x >= rect.x - EPSILON && point.x <= rect.x + rect.w + EPSILON
    && point.y >= rect.y - EPSILON && point.y <= rect.y + rect.h + EPSILON;
}

export function expandBoardRect(rect: BoardRect, padding: number): BoardRect {
  return { x: rect.x - padding, y: rect.y - padding, w: rect.w + padding * 2, h: rect.h + padding * 2 };
}

/** Exact circle/rectangle boundary parameters; no polyline approximation for clipping/routing. */
function boardArcRectPositions(arc: BoardArc, rect: BoardRect): number[] {
  const positions = [0, 1];
  const add = (point: BoardPoint) => {
    if (!boardPointInRect(point, rect)) return;
    const position = arc.center
      ? positionForAngle(arc, Math.atan2(point.y - arc.center.y, point.x - arc.center.x))
      : arc.length < EPSILON ? null : ((point.x - arc.start.x) * (arc.end.x - arc.start.x)
        + (point.y - arc.start.y) * (arc.end.y - arc.start.y)) / (arc.length * arc.length);
    if (position !== null && position >= -EPSILON && position <= 1 + EPSILON) positions.push(clamp01(position));
  };
  if (!arc.center) {
    const dx = arc.end.x - arc.start.x;
    const dy = arc.end.y - arc.start.y;
    if (Math.abs(dx) > EPSILON) for (const x of [rect.x, rect.x + rect.w]) add({ x, y: arc.start.y + (x - arc.start.x) * dy / dx });
    if (Math.abs(dy) > EPSILON) for (const y of [rect.y, rect.y + rect.h]) add({ x: arc.start.x + (y - arc.start.y) * dx / dy, y });
  } else {
    for (const x of [rect.x, rect.x + rect.w]) {
      const square = arc.radius * arc.radius - (x - arc.center.x) ** 2;
      if (square >= -EPSILON) for (const sign of [-1, 1]) add({ x, y: arc.center.y + sign * Math.sqrt(Math.max(0, square)) });
    }
    for (const y of [rect.y, rect.y + rect.h]) {
      const square = arc.radius * arc.radius - (y - arc.center.y) ** 2;
      if (square >= -EPSILON) for (const sign of [-1, 1]) add({ x: arc.center.x + sign * Math.sqrt(Math.max(0, square)), y });
    }
  }
  return positions.sort((a, b) => a - b).filter((value, index, all) => index === 0 || value - all[index - 1] > EPSILON);
}

export function boardArcIntersectsRect(arc: BoardArc, rect: BoardRect): boolean {
  if (boardPointInRect(arc.start, rect) || boardPointInRect(arc.end, rect)) return true;
  const positions = boardArcRectPositions(arc, rect);
  return positions.some((value, index) => index > 0
    && boardPointInRect(pointOnBoardArc(arc, (positions[index - 1] + value) / 2), rect));
}

/** Remove the occupied intervals themselves; callers need no label/board background mapping. */
export function boardArcPathOutsideRect(arc: BoardArc, labelRect: BoardRect, padding = 3): string {
  const rect = expandBoardRect(labelRect, padding);
  const positions = boardArcRectPositions(arc, rect);
  const paths: string[] = [];
  for (let index = 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    if (!boardPointInRect(pointOnBoardArc(arc, (from + to) / 2), rect)) paths.push(boardArcSubpath(arc, from, to));
  }
  return paths.join(' ');
}

/** Creation/explicit-reroute only. Obstacles must exclude the two bound endpoint cards. */
export function routeBoardEdge(
  start: BoardPoint,
  end: BoardPoint,
  obstacles: readonly BoardRect[],
  options: { margin?: number; defaultBend?: number } = {},
): number {
  const chord = distance(start, end);
  if (chord < EPSILON) return 0;
  const preferred = options.defaultBend ?? Math.min(24, Math.max(8, chord * 0.035));
  const padded = obstacles.map((rect) => expandBoardRect(rect, options.margin ?? 16));
  const intersects = (bend: number) => padded.some((rect) => boardArcIntersectsRect(createBoardArc(start, end, bend), rect));
  if (!intersects(preferred)) return createBoardArc(start, end, preferred).bend;
  // Scan both sides in increasing magnitude, then refine the first clear interval on each.
  // This is bounded one-shot circular-arc selection, not an elbow or continuous router.
  let best: { bend: number; length: number } | null = null;
  const extent = Math.max(chord, ...padded.flatMap((rect) => [distance(start, rect), distance(start, { x: rect.x + rect.w, y: rect.y + rect.h })]));
  const maximum = Math.max(64, extent * 4);
  for (const sign of [1, -1]) {
    let previous = 0;
    for (let magnitude = Math.max(4, Math.abs(preferred)); magnitude <= maximum; magnitude = magnitude * 1.15 + 4) {
      if (intersects(sign * magnitude)) { previous = magnitude; continue; }
      let low = previous;
      let high = magnitude;
      for (let iteration = 0; iteration < 18; iteration += 1) {
        const middle = (low + high) / 2;
        if (intersects(sign * middle)) low = middle; else high = middle;
      }
      const bend = sign * (high + 0.01);
      const length = createBoardArc(start, end, bend).length;
      if (!best || length < best.length - EPSILON) best = { bend, length };
      break;
    }
  }
  // An endpoint covered by another card may make every arc impossible. Preserve a finite
  // default; the non-blocking inspector reports the unresolved overlap to its consumer.
  return best?.bend ?? createBoardArc(start, end, preferred).bend;
}

export const chooseBoardEdgeBend = routeBoardEdge;

/** Deterministic plain-text label projection; measured DOM rectangles may replace this. */
export function boardLabelRect(
  text: string,
  center: BoardPoint,
  options: { maxWidth?: number; fontSize?: number; lineHeight?: number; padding?: number } = {},
): BoardRect & { lines: string[] } {
  const maxWidth = options.maxWidth ?? 120;
  const fontSize = options.fontSize ?? 12;
  const lineHeight = options.lineHeight ?? 16;
  const padding = options.padding ?? 4;
  const widthOf = (character: string) => /[\u0000-\u00ff]/u.test(character) ? fontSize * 0.56 : fontSize;
  const lines: string[] = [];
  let widest = 0;
  for (const paragraph of text.split('\n')) {
    let line = '';
    let width = 0;
    for (const character of paragraph) {
      const nextWidth = widthOf(character);
      if (line && width + nextWidth > maxWidth) { lines.push(line); widest = Math.max(widest, width); line = ''; width = 0; }
      line += character;
      width += nextWidth;
    }
    lines.push(line);
    widest = Math.max(widest, width);
  }
  const w = Math.min(maxWidth, widest) + padding * 2;
  const h = Math.max(1, lines.length) * lineHeight + padding * 2;
  return { x: center.x - w / 2, y: center.y - h / 2, w, h, lines };
}
