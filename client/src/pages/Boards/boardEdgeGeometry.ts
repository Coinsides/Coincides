import { boardEdgeEndpoints, createBoardArc } from '../../../../shared/boardVisualGeometry';
import type { BoardDetail, BoardEdge, BoardEdgeEndpoint, BoardMember, BoardSticky } from './boardTypes';
import type { BoardPoint } from './boardViewport';

export type BoardEndpointDetail = Pick<BoardDetail, 'members' | 'stickies'>;

/** Old snapshots retain their member aliases until saved through the new endpoint UI. */
export function boardEndpoint(edge: BoardEdge, side: 'from' | 'to'): BoardEdgeEndpoint | null {
  const endpoint = edge[side];
  if (endpoint) return endpoint;
  const id = edge[`${side}_member_id`];
  return id ? { kind: 'member', id, anchor: 'auto' } : null;
}

export function boardEndpointObject(endpoint: BoardEdgeEndpoint | null, detail: BoardEndpointDetail): BoardMember | BoardSticky | null {
  if (!endpoint || endpoint.kind === 'point') return null;
  return (endpoint.kind === 'member' ? detail.members : detail.stickies ?? []).find(({ id }) => id === endpoint.id) ?? null;
}

/** Preserve the original S1 straight edge's six-pixel clearance exactly. */
export function legacyConnectionPoint(member: BoardMember | BoardSticky, other: BoardMember | BoardSticky): BoardPoint {
  const center = { x: member.x + member.w * member.scale / 2, y: member.y + member.h * member.scale / 2 };
  const dx = other.x + other.w * other.scale / 2 - center.x;
  const dy = other.y + other.h * other.scale / 2 - center.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return center;
  const reach = Math.min(dx ? member.w * member.scale / 2 / Math.abs(dx) : Infinity,
    dy ? member.h * member.scale / 2 / Math.abs(dy) : Infinity) + 6 / distance;
  return { x: center.x + dx * reach, y: center.y + dy * reach };
}

export function boardEdgeGeometry(edge: BoardEdge, detail: BoardEndpointDetail) {
  const from = boardEndpoint(edge, 'from');
  const to = boardEndpoint(edge, 'to');
  if (!from || !to) return null;
  const fromObject = boardEndpointObject(from, detail);
  const toObject = boardEndpointObject(to, detail);
  if ((from.kind !== 'point' && !fromObject) || (to.kind !== 'point' && !toObject)) return null;
  if ((fromObject && 'placed' in fromObject && fromObject.placed === false)
    || (toObject && 'placed' in toObject && toObject.placed === false)) return null;
  if (edge.visual_version !== 1 && fromObject && toObject) {
    const start = legacyConnectionPoint(fromObject, toObject);
    const end = legacyConnectionPoint(toObject, fromObject);
    return { start, end, arc: createBoardArc(start, end, 0) };
  }
  const rect = (object: BoardMember | BoardSticky) => ({ x: object.x, y: object.y,
    w: object.w * object.scale, h: object.h * object.scale, radius: 8 * object.scale });
  const { start, end } = boardEdgeEndpoints(from.kind === 'point' ? from : rect(fromObject!),
    to.kind === 'point' ? to : rect(toObject!), {
      fromAnchor: from.kind === 'point' ? 'auto' : from.anchor,
      toAnchor: to.kind === 'point' ? 'auto' : to.anchor,
      capStart: edge.cap_start ?? 'none', capEnd: edge.cap_end ?? 'none',
    });
  return { start, end, arc: createBoardArc(start, end, edge.bend ?? 0) };
}
