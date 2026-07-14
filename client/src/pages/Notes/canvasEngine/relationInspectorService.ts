import type {
  RelationEndpointItemV1,
  RelationFreshness,
  RelationV1,
} from './runtimeDataTypes';

export type RelationInspectorDirection = 'outgoing' | 'incoming' | 'undirected';

export interface RelationInspectorRowV1 {
  id: string;
  relation_type: string;
  type_label: string;
  direction: RelationInspectorDirection;
  direction_label: string;
  other_item: RelationEndpointItemV1;
  note: string | null;
  freshness: RelationFreshness;
  freshness_label: string;
  checkpoint_at: string;
  endpoint_retired: boolean;
  can_reaffirm: boolean;
  can_revoke: boolean;
}

function titleCaseRelationType(relationType: string): string {
  return relationType
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function relativeDirection(
  relation: RelationV1,
  itemId: string,
): RelationInspectorDirection | null {
  if (relation.from_item_id !== itemId && relation.to_item_id !== itemId) return null;
  if (relation.directionality === 'undirected') return 'undirected';
  return relation.from_item_id === itemId ? 'outgoing' : 'incoming';
}

function relativeFreshnessLabel(relation: RelationV1, itemId: string): string {
  if (relation.freshness === 'fresh') return 'Current';
  if (relation.freshness === 'both_changed') return 'Both Items changed';
  const currentChanged = relation.from_item_id === itemId
    ? relation.from_changed
    : relation.to_changed;
  return currentChanged ? 'This Item changed' : 'Other Item changed';
}

export function buildRelationInspectorRows(
  relations: RelationV1[],
  itemId: string,
): RelationInspectorRowV1[] {
  const rows: RelationInspectorRowV1[] = [];
  for (const relation of relations) {
    if (relation.status !== 'active') continue;
    const direction = relativeDirection(relation, itemId);
    if (!direction) continue;
    const otherItem = relation.from_item_id === itemId ? relation.to_item : relation.from_item;
    const endpointRetired = relation.from_item.status === 'retired' || relation.to_item.status === 'retired';
    rows.push({
      id: relation.id,
      relation_type: relation.relation_type,
      type_label: titleCaseRelationType(relation.relation_type),
      direction,
      direction_label: direction === 'outgoing'
        ? 'Points to'
        : direction === 'incoming'
          ? 'Points here'
          : 'Undirected',
      other_item: otherItem,
      note: relation.note,
      freshness: relation.freshness,
      freshness_label: relativeFreshnessLabel(relation, itemId),
      checkpoint_at: relation.inspection_checkpoint_at,
      endpoint_retired: endpointRetired,
      can_reaffirm: !endpointRetired,
      can_revoke: true,
    });
  }
  return rows;
}
