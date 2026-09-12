import type { BoardDetail, BoardMember, BoardVisual } from './boardTypes';

export const layerIdOf = (object: { layer_id?: string | null }) => object.layer_id ?? null;

/** One ordered source for both painted containers and pointer/keyboard candidates. */
export function boardLayerScene(detail: BoardDetail | null, members: BoardMember[], visuals: BoardVisual[]) {
  const layers = [
    { id: null as string | null, name: 'Base', visible: detail?.board.base_layer_visible !== false },
    ...[...(detail?.layers || [])].sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id)),
  ];
  const ranks = new Map(layers.map((layer, rank) => [layer.id, rank]));
  const visibleIds = new Set(layers.filter((layer) => layer.visible).map((layer) => layer.id));
  const visibleMembers = members.filter((member) => member.placed !== false && visibleIds.has(layerIdOf(member)));
  const visibleVisuals = visuals.filter((visual) => visibleIds.has(layerIdOf(visual)));
  const memberById = new Map(visibleMembers.map((member) => [member.id, member]));
  const edges = (detail?.edges || []).filter((edge) => memberById.has(edge.from_member_id) && memberById.has(edge.to_member_id));
  const edgeLayer = new Map(edges.map((edge) => {
    const from = layerIdOf(memberById.get(edge.from_member_id)!);
    const to = layerIdOf(memberById.get(edge.to_member_id)!);
    return [edge.id, (ranks.get(from) ?? 0) >= (ranks.get(to) ?? 0) ? from : to];
  }));
  return {
    layers,
    members: visibleMembers,
    visuals: visibleVisuals,
    edges,
    containers: layers.flatMap((layer, rank) => layer.visible ? [{
      ...layer, rank,
      members: visibleMembers.filter((member) => layerIdOf(member) === layer.id),
      visuals: visibleVisuals.filter((visual) => layerIdOf(visual) === layer.id),
      edges: edges.filter((edge) => edgeLayer.get(edge.id) === layer.id),
    }] : []),
  };
}
