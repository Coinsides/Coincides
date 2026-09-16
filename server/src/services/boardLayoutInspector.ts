import type { BoardPoint, BoardRect } from './boardVisualGeometry.js';

/** Geometry is already projected into board coordinates. No storage or domain access. */
export interface BoardLayoutCard extends BoardRect { id: string }
export interface BoardLayoutEdge {
  id: string;
  fromId?: string | null;
  toId?: string | null;
  points: readonly BoardPoint[];
  label?: BoardRect | null;
}
export interface BoardLayoutProjection {
  cards: readonly BoardLayoutCard[];
  edges: readonly BoardLayoutEdge[];
}
export type BoardLayoutIssueKind = 'label-card-overlap' | 'label-label-overlap'
  | 'edge-through-card' | 'card-card-overlap' | 'near-parallel-edges';
export interface BoardLayoutIssue {
  kind: BoardLayoutIssueKind;
  severity: 'warning' | 'error';
  itemIds: string[];
  coordinate: BoardPoint;
  bounds: BoardRect;
}
export interface BoardLayoutReport {
  issues: BoardLayoutIssue[];
  counts: Record<BoardLayoutIssueKind, number>;
}
export interface BoardLayoutInspectorOptions {
  /** Overlap area / area of the smaller card. Boundary contact is never overlap. */
  cardOverlapRatio?: number;
  cardOverlapMinArea?: number;
  parallelDistance?: number;
  parallelAngleDegrees?: number;
  parallelMinLength?: number;
}

const EPSILON = 1e-7;
const center = (rect: BoardRect): BoardPoint => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

function intersection(a: BoardRect, b: BoardRect): BoardRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > EPSILON && h > EPSILON ? { x, y, w, h } : null;
}

function segmentBounds(a: BoardPoint, b: BoardPoint): BoardRect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Liang–Barsky interval, with boundary-only contact excluded from penetration reports. */
function segmentThroughRect(a: BoardPoint, b: BoardPoint, rect: BoardRect): BoardRect | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let from = 0;
  let to = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - rect.x, rect.x + rect.w - a.x, a.y - rect.y, rect.y + rect.h - a.y];
  for (let index = 0; index < 4; index += 1) {
    if (Math.abs(p[index]) < EPSILON) {
      if (q[index] <= EPSILON) return null;
      continue;
    }
    const value = q[index] / p[index];
    if (p[index] < 0) from = Math.max(from, value); else to = Math.min(to, value);
    if (from >= to - EPSILON) return null;
  }
  return segmentBounds({ x: a.x + dx * from, y: a.y + dy * from }, { x: a.x + dx * to, y: a.y + dy * to });
}

function nearParallelSegments(
  a: BoardPoint, b: BoardPoint, c: BoardPoint, d: BoardPoint,
  maxDistance: number, angleCosine: number,
): { from: number; to: number; bounds: BoardRect } | null {
  const firstLength = Math.hypot(b.x - a.x, b.y - a.y);
  const secondLength = Math.hypot(d.x - c.x, d.y - c.y);
  if (firstLength < EPSILON || secondLength < EPSILON) return null;
  const ux = (b.x - a.x) / firstLength;
  const uy = (b.y - a.y) / firstLength;
  const vx = (d.x - c.x) / secondLength;
  const vy = (d.y - c.y) / secondLength;
  if (Math.abs(ux * vx + uy * vy) < angleCosine) return null;
  const projectionC = (c.x - a.x) * ux + (c.y - a.y) * uy;
  const projectionD = (d.x - a.x) * ux + (d.y - a.y) * uy;
  const from = Math.max(0, Math.min(projectionC, projectionD));
  const to = Math.min(firstLength, Math.max(projectionC, projectionD));
  if (to - from < EPSILON) return null;
  const orthogonalC = (c.x - a.x) * -uy + (c.y - a.y) * ux;
  const orthogonalD = (d.x - a.x) * -uy + (d.y - a.y) * ux;
  const separation = (position: number) => orthogonalC
    + (orthogonalD - orthogonalC) * (position - projectionC) / (projectionD - projectionC);
  if (Math.max(Math.abs(separation(from)), Math.abs(separation(to))) > maxDistance) return null;
  return { from, to, bounds: segmentBounds({ x: a.x + ux * from, y: a.y + uy * from }, { x: a.x + ux * to, y: a.y + uy * to }) };
}

/** Merge collinear samples so the result does not depend on the caller's sampling density. */
function simplifyPath(points: readonly BoardPoint[]): BoardPoint[] {
  const output: BoardPoint[] = [];
  for (const point of points) {
    if (output.length && Math.hypot(point.x - output[output.length - 1].x, point.y - output[output.length - 1].y) < EPSILON) continue;
    while (output.length >= 2) {
      const a = output[output.length - 2];
      const b = output[output.length - 1];
      const cross = (b.x - a.x) * (point.y - b.y) - (b.y - a.y) * (point.x - b.x);
      const dot = (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y);
      if (Math.abs(cross) > EPSILON || dot < 0) break;
      output.pop();
    }
    output.push({ ...point });
  }
  return output;
}

/**
 * Advisory only: reports five geometric defect classes and never mutates/blocks anything.
 * IDs should use a projection-local namespace (e.g. member:id / sticky:id).
 * Consumers supply horizontal label rectangles and actual visible edge geometry.
 */
export function inspectBoardLayout(
  projection: BoardLayoutProjection,
  options: BoardLayoutInspectorOptions = {},
): BoardLayoutReport {
  const report: BoardLayoutReport = {
    issues: [],
    counts: { 'label-card-overlap': 0, 'label-label-overlap': 0, 'edge-through-card': 0,
      'card-card-overlap': 0, 'near-parallel-edges': 0 },
  };
  const add = (kind: BoardLayoutIssueKind, itemIds: string[], bounds: BoardRect, severity: BoardLayoutIssue['severity'] = 'warning') => {
    report.issues.push({ kind, severity, itemIds, coordinate: center(bounds), bounds });
    report.counts[kind] += 1;
  };
  const cards = projection.cards;
  const edges = projection.edges.map((edge) => ({ ...edge, points: simplifyPath(edge.points) }));
  const labels = edges.filter((edge): edge is typeof edge & { label: BoardRect } => Boolean(edge.label));
  for (const edge of labels) {
    for (const card of cards) {
      const overlap = intersection(edge.label, card);
      if (overlap) add('label-card-overlap', [edge.id, card.id], overlap, 'error');
    }
  }
  for (let index = 0; index < labels.length; index += 1) {
    for (const other of labels.slice(index + 1)) {
      const overlap = intersection(labels[index].label, other.label);
      if (overlap) add('label-label-overlap', [labels[index].id, other.id], overlap, 'error');
    }
  }
  for (const edge of edges) {
    for (const card of cards) {
      if (card.id === edge.fromId || card.id === edge.toId) continue;
      for (let index = 1; index < edge.points.length; index += 1) {
        const overlap = segmentThroughRect(edge.points[index - 1], edge.points[index], card);
        if (overlap) { add('edge-through-card', [edge.id, card.id], overlap); break; }
      }
    }
  }
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    for (const other of cards.slice(index + 1)) {
      const overlap = intersection(card, other);
      if (!overlap) continue;
      const area = overlap.w * overlap.h;
      const ratio = area / Math.min(card.w * card.h, other.w * other.h);
      if (ratio > (options.cardOverlapRatio ?? 0.1) && area >= (options.cardOverlapMinArea ?? 64)) {
        add('card-card-overlap', [card.id, other.id], overlap);
      }
    }
  }
  const angleCosine = Math.cos((options.parallelAngleDegrees ?? 8) * Math.PI / 180);
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    for (const other of edges.slice(index + 1)) {
      let overlap: BoardRect | null = null;
      let overlappingLength = 0;
      for (let first = 1; first < edge.points.length; first += 1) {
        const intervals: Array<{ from: number; to: number }> = [];
        for (let second = 1; second < other.points.length; second += 1) {
          const candidate = nearParallelSegments(edge.points[first - 1], edge.points[first], other.points[second - 1], other.points[second],
            options.parallelDistance ?? 4, angleCosine);
          if (!candidate) continue;
          intervals.push(candidate);
          if (!overlap) overlap = candidate.bounds;
        }
        intervals.sort((a, b) => a.from - b.from);
        let coveredUntil = 0;
        for (const interval of intervals) {
          overlappingLength += Math.max(0, interval.to - Math.max(interval.from, coveredUntil));
          coveredUntil = Math.max(coveredUntil, interval.to);
        }
        if (overlappingLength >= (options.parallelMinLength ?? 24)) break;
      }
      if (overlap && overlappingLength >= (options.parallelMinLength ?? 24)) add('near-parallel-edges', [edge.id, other.id], overlap);
    }
  }
  return report;
}
