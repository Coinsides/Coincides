import type {
  ItemSnapshotV1,
  RelationDirectionality,
  RelationEndpointItemV1,
  RelationSeedTypeId,
  RelationStatus,
  RelationTypeDefinitionV1,
  RelationV1,
} from './runtimeDataTypes';

const RELATION_SEED_TYPES = new Set<RelationSeedTypeId>([
  'derives_to',
  'depends_on',
  'supports',
  'contradicts',
  'example_of',
  'equivalent_to',
  'analogous_to',
  'contrasts_with',
  'companion_of',
]);

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function directionalityValue(value: unknown): RelationDirectionality {
  return value === 'undirected' ? 'undirected' : 'directed';
}

function relationStatusValue(value: unknown): RelationStatus {
  return value === 'revoked' ? 'revoked' : 'active';
}

function normalizeSnapshot(value: unknown, fallbackItemId: string): ItemSnapshotV1 | null {
  const snapshot = recordValue(value);
  if (!snapshot) return null;
  const id = textValue(snapshot.id);
  const itemId = textValue(snapshot.item_id, fallbackItemId);
  if (!id || !itemId) return null;
  return {
    id,
    item_id: itemId,
    user_id: textValue(snapshot.user_id),
    content: textValue(snapshot.content),
    content_hash: textValue(snapshot.content_hash),
    created_at: textValue(snapshot.created_at),
  };
}

function normalizeEndpoint(value: unknown, fallbackId: string): RelationEndpointItemV1 | null {
  const endpoint = recordValue(value);
  if (!endpoint) return null;
  const id = textValue(endpoint.id, fallbackId);
  if (!id) return null;
  return {
    id,
    plain_text: textValue(endpoint.plain_text),
    item_type: optionalText(endpoint.item_type),
    topic: optionalText(endpoint.topic),
    status: endpoint.status === 'retired' ? 'retired' : 'active',
    retired_into_item_id: optionalText(endpoint.retired_into_item_id),
    updated_at: textValue(endpoint.updated_at),
  };
}

export function normalizeRelationTypeDefinitions(input: unknown): RelationTypeDefinitionV1[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const definitions: RelationTypeDefinitionV1[] = [];
  for (const candidate of input) {
    const record = recordValue(candidate);
    const id = record?.id;
    if (typeof id !== 'string' || !RELATION_SEED_TYPES.has(id as RelationSeedTypeId) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    definitions.push({
      id: id as RelationSeedTypeId,
      directionality: directionalityValue(record?.directionality),
    });
  }
  return definitions;
}

export function normalizeRelation(input: unknown): RelationV1 | null {
  const relation = recordValue(input);
  if (!relation) return null;
  const id = textValue(relation.id);
  const fromItemId = textValue(relation.from_item_id);
  const toItemId = textValue(relation.to_item_id);
  if (!id || !fromItemId || !toItemId) return null;
  const fromSnapshot = normalizeSnapshot(relation.from_snapshot, fromItemId);
  const toSnapshot = normalizeSnapshot(relation.to_snapshot, toItemId);
  const fromItem = normalizeEndpoint(relation.from_item, fromItemId);
  const toItem = normalizeEndpoint(relation.to_item, toItemId);
  if (!fromSnapshot || !toSnapshot || !fromItem || !toItem) return null;
  if (
    fromSnapshot.item_id !== fromItemId
    || toSnapshot.item_id !== toItemId
    || fromItem.id !== fromItemId
    || toItem.id !== toItemId
  ) return null;
  const fromSnapshotId = textValue(relation.from_snapshot_id, fromSnapshot.id);
  const toSnapshotId = textValue(relation.to_snapshot_id, toSnapshot.id);
  if (fromSnapshotId !== fromSnapshot.id || toSnapshotId !== toSnapshot.id) return null;

  return {
    id,
    user_id: textValue(relation.user_id),
    from_item_id: fromItemId,
    to_item_id: toItemId,
    relation_type: textValue(relation.relation_type),
    directionality: directionalityValue(relation.directionality),
    from_snapshot_id: fromSnapshotId,
    to_snapshot_id: toSnapshotId,
    note: optionalText(relation.note),
    created_by: textValue(relation.created_by, 'human'),
    origin_purpose_id: optionalText(relation.origin_purpose_id),
    status: relationStatusValue(relation.status),
    created_at: textValue(relation.created_at),
    updated_at: textValue(relation.updated_at),
    affirmed_at: textValue(relation.affirmed_at),
    from_snapshot: fromSnapshot,
    to_snapshot: toSnapshot,
    from_item: fromItem,
    to_item: toItem,
  };
}

export function normalizeRelations(input: unknown): RelationV1[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(normalizeRelation)
    .filter((relation): relation is RelationV1 => relation !== null);
}

export function relationOtherEndpoint(relation: RelationV1, itemId: string): RelationEndpointItemV1 | null {
  if (relation.from_item_id === itemId) return relation.to_item;
  if (relation.to_item_id === itemId) return relation.from_item;
  return null;
}
