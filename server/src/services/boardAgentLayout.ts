import type { getBoard } from './boards.js';
import { inspectBoardLayout } from './boardLayoutInspector.js';
import { boardEdgeEndpoints, createBoardArc, sampleBoardArc, pointOnBoardArc, boardLabelRect } from './boardVisualGeometry.js';

/** Includes Staging's saved proposed geometry, not the sidebar row rectangles. */
export function inspectAgentBoard(detail: ReturnType<typeof getBoard>) {
  const visible = (layerId: string | null) => layerId === null ? detail.board.base_layer_visible
    : detail.layers.find(layer => layer.id === layerId)?.visible !== false;
  const cards = [
    ...detail.members.filter(member => visible(member.layer_id)).map(member => ({ id: `member:${member.id}`, x: member.x, y: member.y,
      w: member.w * member.scale, h: member.h * member.scale, radius: 8 * member.scale })),
    ...detail.stickies.filter(sticky => visible(sticky.layer_id)).map(sticky => ({ id: `sticky:${sticky.id}`, x: sticky.x, y: sticky.y, w: sticky.w, h: sticky.h, radius: 8 })),
  ];
  const byId = new Map(cards.map(card => [card.id, card]));
  const edges = detail.edges.flatMap(edge => {
    const from = edge.from.kind === 'point' ? edge.from : byId.get(`${edge.from.kind}:${edge.from.id}`);
    const to = edge.to.kind === 'point' ? edge.to : byId.get(`${edge.to.kind}:${edge.to.id}`);
    if (!from || !to) return [];
    const legacy = edge.visual_version !== 1 && 'w' in from && 'w' in to;
    const endpoints = legacy ? { start: legacyPoint(from, to), end: legacyPoint(to, from) } : boardEdgeEndpoints(from, to, {
      fromAnchor: edge.from.kind === 'point' ? 'auto' : edge.from.anchor,
      toAnchor: edge.to.kind === 'point' ? 'auto' : edge.to.anchor,
      capStart: edge.cap_start, capEnd: edge.cap_end,
    });
    const arc = createBoardArc(endpoints.start, endpoints.end, legacy ? 0 : edge.bend);
    const center = pointOnBoardArc(arc, legacy ? 0.5 : edge.label_position);
    return [{ id: edge.id, fromId: edge.from.kind === 'point' ? null : `${edge.from.kind}:${edge.from.id}`,
      toId: edge.to.kind === 'point' ? null : `${edge.to.kind}:${edge.to.id}`, points: sampleBoardArc(arc),
      // Legacy labels are a single SVG text line with its baseline eight px above the center.
      label: edge.label ? (legacy ? { x: center.x - edge.label.length * 3.5, y: center.y - 20,
        w: edge.label.length * 7, h: 16 } : boardLabelRect(edge.label, center)) : null }];
  });
  return inspectBoardLayout({ cards, edges });
}

/** Same six-pixel rectangle clearance as the retained human legacy renderer. */
function legacyPoint(rect: { x: number; y: number; w: number; h: number }, other: { x: number; y: number; w: number; h: number }) {
  const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const dx = other.x + other.w / 2 - center.x, dy = other.y + other.h / 2 - center.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return center;
  const reach = Math.min(dx ? rect.w / 2 / Math.abs(dx) : Infinity, dy ? rect.h / 2 / Math.abs(dy) : Infinity) + 6 / distance;
  return { x: center.x + dx * reach, y: center.y + dy * reach };
}
