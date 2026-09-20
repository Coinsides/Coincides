import type { BoardDetail, BoardMember, BoardVisual, BoardSticky } from './boardTypes';
import { boardEndpoint, boardEndpointObject } from './boardEdgeGeometry';

export const layerIdOf = (object: { layer_id?: string | null }) => object.layer_id ?? null;

/** One ordered source for both painted containers and pointer/keyboard candidates. */
export function boardLayerScene(detail: BoardDetail | null, members: BoardMember[], visuals: BoardVisual[], stickies: BoardSticky[] = detail?.stickies ?? []) {
  const layers = [
    { id: null as string | null, name: 'Base', visible: detail?.board.base_layer_visible !== false },
    ...[...(detail?.layers || [])].sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id)),
  ];
  const ranks = new Map(layers.map((layer, rank) => [layer.id, rank]));
  const visibleIds = new Set(layers.filter((layer) => layer.visible).map((layer) => layer.id));
  const visibleMembers = members.filter((member) => member.placed !== false && visibleIds.has(layerIdOf(member)));
  const visibleVisuals = visuals.filter((visual) => visibleIds.has(layerIdOf(visual)));
  const visibleStickies = stickies.filter((sticky) => sticky.placed !== false && visibleIds.has(layerIdOf(sticky)));
  const endpointDetail = { members: visibleMembers, stickies: visibleStickies };
  const candidates = (detail?.edges || []).filter((edge) => [boardEndpoint(edge, 'from'), boardEndpoint(edge, 'to')].every((endpoint) =>
    endpoint && (endpoint.kind === 'point' || boardEndpointObject(endpoint, endpointDetail))));
  const edgeLayer = new Map(candidates.map((edge) => {
    const from = layerIdOf(boardEndpointObject(boardEndpoint(edge, 'from'), endpointDetail) ?? {});
    const to = layerIdOf(boardEndpointObject(boardEndpoint(edge, 'to'), endpointDetail) ?? {});
    return [edge.id, (ranks.get(from) ?? 0) >= (ranks.get(to) ?? 0) ? from : to];
  }));
  const edges = candidates.filter((edge) => visibleIds.has(edgeLayer.get(edge.id) ?? null));
  return {
    layers,
    members: visibleMembers,
    visuals: visibleVisuals,
    stickies: visibleStickies,
    edges,
    containers: layers.flatMap((layer, rank) => layer.visible ? [{
      ...layer, rank,
      members: visibleMembers.filter((member) => layerIdOf(member) === layer.id),
      visuals: visibleVisuals.filter((visual) => layerIdOf(visual) === layer.id),
      stickies: visibleStickies.filter((sticky) => layerIdOf(sticky) === layer.id),
      edges: edges.filter((edge) => edgeLayer.get(edge.id) === layer.id),
    }] : []),
  };
}
