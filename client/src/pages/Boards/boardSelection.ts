import type { BoardDetail, BoardEdge, BoardMember, BoardVisual } from './boardTypes';
import type { BoardPoint } from './boardViewport';

export type BoardSelection = { kind: 'member' | 'edge' | 'visual'; id: string };
export type BoardRect = { x: number; y: number; w: number; h: number };
export const selectionKey = (selection: BoardSelection) => `${selection.kind}:${selection.id}`;

export function selectionFromKeys(keys: Set<string>) {
  const key = [...keys][keys.size - 1];
  const anchor: BoardSelection | null = key ? {
    kind: key.slice(0, key.indexOf(':')) as BoardSelection['kind'], id: key.slice(key.indexOf(':') + 1),
  } : null;
  return { keys, anchor };
}

export function selectionRect(start: BoardPoint, end: BoardPoint): BoardRect {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y) };
}

export function connectionPoint(member: BoardMember, other: BoardMember): BoardPoint {
  const center = { x: member.x + member.w * member.scale / 2, y: member.y + member.h * member.scale / 2 };
  const dx = other.x + other.w * other.scale / 2 - center.x;
  const dy = other.y + other.h * other.scale / 2 - center.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return center;
  const reach = Math.min(dx ? member.w * member.scale / 2 / Math.abs(dx) : Infinity,
    dy ? member.h * member.scale / 2 / Math.abs(dy) : Infinity) + 6 / distance;
  return { x: center.x + dx * reach, y: center.y + dy * reach };
}

function intersects(a: BoardRect, b: BoardRect) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

/** Clip the actual connection segment, not the empty corners of its bounding box. */
function segmentIntersects(rect: BoardRect, start: BoardPoint, end: BoardPoint) {
  let lower = 0; let upper = 1;
  const dx = end.x - start.x; const dy = end.y - start.y;
  for (const [p, q] of [[-dx, start.x - rect.x], [dx, rect.x + rect.w - start.x],
    [-dy, start.y - rect.y], [dy, rect.y + rect.h - start.y]]) {
    if (!p) { if (q < 0) return false; continue; }
    const distance = q / p;
    if (p < 0) lower = Math.max(lower, distance); else upper = Math.min(upper, distance);
    if (lower > upper) return false;
  }
  return true;
}

export function visualBounds(visual: BoardVisual): BoardRect {
  const angle = visual.rotation * Math.PI / 180;
  const origin = visual.visual_kind === 'freehand' ? { x: 0, y: 0 } : { x: visual.w / 2, y: visual.h / 2 };
  const corners = [[0, 0], [visual.w, 0], [visual.w, visual.h], [0, visual.h]].map(([x, y]) => ({
    x: visual.x + (origin.x + (x - origin.x) * Math.cos(angle) - (y - origin.y) * Math.sin(angle)) * visual.scale,
    y: visual.y + (origin.y + (x - origin.x) * Math.sin(angle) + (y - origin.y) * Math.cos(angle)) * visual.scale,
  }));
  const xs = corners.map(({ x }) => x); const ys = corners.map(({ y }) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function marqueeSelection(rect: BoardRect, detail: Pick<BoardDetail, 'members' | 'edges' | 'visuals'>): BoardSelection[] {
  const members = detail.members.filter((member) => member.placed !== false);
  return [
    ...members.filter((member) => intersects(rect, { x: member.x, y: member.y,
      w: member.w * member.scale, h: member.h * member.scale })).map(({ id }) => ({ kind: 'member' as const, id })),
    ...detail.visuals.filter((visual) => intersects(rect, visualBounds(visual))).map(({ id }) => ({ kind: 'visual' as const, id })),
    ...detail.edges.filter((edge) => {
      const from = members.find(({ id }) => id === edge.from_member_id);
      const to = members.find(({ id }) => id === edge.to_member_id);
      return from && to && segmentIntersects(rect, connectionPoint(from, to), connectionPoint(to, from));
    }).map(({ id }) => ({ kind: 'edge' as const, id })),
  ];
}

export function deletionScope(keys: Set<string>, detail: Pick<BoardDetail, 'members' | 'edges' | 'visuals'>,
  incidentEdges: BoardEdge[] = detail.edges) {
  const memberIds = detail.members.filter((member) => keys.has(selectionKey({ kind: 'member', id: member.id }))).map(({ id }) => id);
  const memberSet = new Set(memberIds);
  const connected = (edge: BoardEdge) => memberSet.has(edge.from_member_id) || memberSet.has(edge.to_member_id);
  // Hidden connections are not independent targets, but removing a visible
  // endpoint still cascades to them. The confirmation must count that impact.
  const connectedEdges = incidentEdges.filter(connected);
  const edgeIds = detail.edges.filter((edge) => !connected(edge) && keys.has(selectionKey({ kind: 'edge', id: edge.id }))).map(({ id }) => id);
  const visualIds = detail.visuals.filter((visual) => keys.has(selectionKey({ kind: 'visual', id: visual.id }))).map(({ id }) => id);
  return { memberIds, edgeIds, visualIds, connectedEdgeCount: connectedEdges.length, reversibleCount: edgeIds.length + visualIds.length };
}
