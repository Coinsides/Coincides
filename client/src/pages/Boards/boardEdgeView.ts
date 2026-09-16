import type { BoardPoint, BoardRect } from '../../../../shared/boardVisualGeometry';
import { boardEdgeGeometry, boardEndpoint } from './boardEdgeGeometry';
import type { BoardEdge, BoardEdgeAnchor, BoardEdgeEndpoint, BoardMember, BoardSticky } from './boardTypes';

export type BoardCard = BoardMember | BoardSticky;
export const cardKind = (card: BoardCard) => 'member_kind' in card ? 'member' as const : 'sticky' as const;
export const cardRect = (card: BoardCard): BoardRect => ({ x: card.x, y: card.y, w: card.w * card.scale, h: card.h * card.scale, radius: 8 * card.scale });
export const cardEndpoint = (card: BoardCard, anchor: BoardEdgeAnchor = 'auto'): BoardEdgeEndpoint => ({ kind: cardKind(card), id: card.id, anchor });

export function edgeEndpoint(edge: BoardEdge, side: 'from' | 'to'): BoardEdgeEndpoint | undefined {
  return boardEndpoint(edge, side) ?? undefined;
}
export function endpointCard(endpoint: BoardEdgeEndpoint | undefined, cards: BoardCard[]) {
  return endpoint && endpoint.kind !== 'point' ? cards.find((card) => card.id === endpoint.id && cardKind(card) === endpoint.kind) : undefined;
}
export function endpointShape(endpoint: BoardEdgeEndpoint | undefined, cards: BoardCard[]) {
  if (!endpoint) return undefined;
  if (endpoint.kind === 'point') return { x: endpoint.x, y: endpoint.y };
  const card = endpointCard(endpoint, cards);
  return card ? cardRect(card) : undefined;
}
export function boardEdgeArc(edge: BoardEdge, cards: BoardCard[]) {
  return boardEdgeGeometry(edge, { members: cards.filter((card): card is BoardMember => 'member_kind' in card),
    stickies: cards.filter((card): card is BoardSticky => !('member_kind' in card)) })?.arc;
}

export function anchorPoint(rect: BoardRect, anchor: Exclude<BoardEdgeAnchor, 'auto'>): BoardPoint {
  return { x: rect.x + (anchor === 'w' ? 0 : anchor === 'e' ? rect.w : rect.w / 2),
    y: rect.y + (anchor === 'n' ? 0 : anchor === 's' ? rect.h : rect.h / 2) };
}

/** Hit candidates use screen-sized radii, so low zoom does not make anchors unreachable. */
export function pickBoardEndpoint(point: BoardPoint, cards: BoardCard[], zoom: number, bypass: boolean): BoardEdgeEndpoint {
  if (bypass) return { kind: 'point', ...point };
  const radius = 20 / zoom;
  let best: { endpoint: BoardEdgeEndpoint; distance: number } | undefined;
  for (const card of [...cards].sort((a, b) => b.z_index - a.z_index)) {
    const rect = cardRect(card);
    for (const anchor of ['n', 'e', 's', 'w'] as const) {
      const handle = anchorPoint(rect, anchor);
      const distance = Math.hypot(point.x - handle.x, point.y - handle.y);
      if (distance <= radius && (!best || distance < best.distance)) best = { endpoint: cardEndpoint(card, anchor), distance };
    }
  }
  if (best) return best.endpoint;
  for (const card of [...cards].sort((a, b) => b.z_index - a.z_index)) {
    const rect = cardRect(card);
    if (point.x >= rect.x - radius && point.x <= rect.x + rect.w + radius
      && point.y >= rect.y - radius && point.y <= rect.y + rect.h + radius) return cardEndpoint(card);
  }
  return { kind: 'point', ...point };
}
