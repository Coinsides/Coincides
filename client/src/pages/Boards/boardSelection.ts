import type { BoardDetail, BoardEdge, BoardVisual } from './boardTypes';
import type { BoardPoint } from './boardViewport';
import { boardArcIntersectsRect } from '../../../../shared/boardVisualGeometry';
import { boardEdgeGeometry, boardEndpoint, legacyConnectionPoint } from './boardEdgeGeometry';

export type BoardSelection = { kind: 'member' | 'edge' | 'visual' | 'sticky'; id: string };
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

export const connectionPoint = legacyConnectionPoint;

function intersects(a: BoardRect, b: BoardRect) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
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

export function marqueeSelection(rect: BoardRect, detail: Pick<BoardDetail, 'members' | 'edges' | 'visuals' | 'stickies'>): BoardSelection[] {
  const members = detail.members.filter((member) => member.placed !== false);
  return [
    ...members.filter((member) => intersects(rect, { x: member.x, y: member.y,
      w: member.w * member.scale, h: member.h * member.scale })).map(({ id }) => ({ kind: 'member' as const, id })),
    ...detail.visuals.filter((visual) => intersects(rect, visualBounds(visual))).map(({ id }) => ({ kind: 'visual' as const, id })),
    ...(detail.stickies ?? []).filter((sticky) => intersects(rect, sticky)).map(({ id }) => ({ kind: 'sticky' as const, id })),
    ...detail.edges.filter((edge) => {
      const geometry = boardEdgeGeometry(edge, { members, stickies: detail.stickies });
      return geometry && boardArcIntersectsRect(geometry.arc, rect);
    }).map(({ id }) => ({ kind: 'edge' as const, id })),
  ];
}

export function deletionScope(keys: Set<string>, detail: Pick<BoardDetail, 'members' | 'edges' | 'visuals' | 'stickies'>,
  incidentEdges: BoardEdge[] = detail.edges) {
  const memberIds = detail.members.filter((member) => keys.has(selectionKey({ kind: 'member', id: member.id }))).map(({ id }) => id);
  const memberSet = new Set(memberIds);
  const stickyIds = (detail.stickies ?? []).filter((sticky) => keys.has(selectionKey({ kind: 'sticky', id: sticky.id }))).map(({ id }) => id);
  const stickySet = new Set(stickyIds);
  const connected = (edge: BoardEdge) => [boardEndpoint(edge, 'from'), boardEndpoint(edge, 'to')].some((endpoint) =>
    endpoint && endpoint.kind !== 'point' && (endpoint.kind === 'member' ? memberSet : stickySet).has(endpoint.id));
  // Hidden connections are not independent targets, but removing a visible
  // endpoint still cascades to them. The confirmation must count that impact.
  const connectedEdges = incidentEdges.filter(connected);
  const edgeIds = detail.edges.filter((edge) => !connected(edge) && keys.has(selectionKey({ kind: 'edge', id: edge.id }))).map(({ id }) => id);
  const visualIds = detail.visuals.filter((visual) => keys.has(selectionKey({ kind: 'visual', id: visual.id }))).map(({ id }) => id);
  return { memberIds, edgeIds, visualIds, stickyIds, connectedEdgeCount: connectedEdges.length,
    reversibleCount: edgeIds.length + visualIds.length + stickyIds.length };
}
