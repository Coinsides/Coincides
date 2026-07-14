import api from '@/services/api';
import {
  normalizeRelation,
  normalizeRelations,
  normalizeRelationTypeDefinitions,
} from './relationService';
import type {
  RelationSeedTypeId,
  RelationStatus,
  RelationTypeDefinitionV1,
  RelationV1,
} from './runtimeDataTypes';

export interface CreateRelationInput {
  from_item_id: string;
  to_item_id: string;
  relation_type: RelationSeedTypeId;
  note?: string | null;
  created_by?: string;
  origin_purpose_id?: string | null;
}

export interface ListRelationsInput {
  item_id?: string;
  purpose_id?: string;
  status?: RelationStatus | 'all';
}

function requireRelation(input: unknown): RelationV1 {
  const relation = normalizeRelation(input);
  if (!relation) throw new Error('Invalid Relation response');
  return relation;
}

export async function loadRelationTypes(): Promise<RelationTypeDefinitionV1[]> {
  const response = await api.get<unknown>('/relations/types');
  return normalizeRelationTypeDefinitions(response.data);
}

export async function loadRelation(relationId: string): Promise<RelationV1> {
  const response = await api.get<unknown>(`/relations/${relationId}`);
  return requireRelation(response.data);
}

export async function loadRelations(input: ListRelationsInput): Promise<RelationV1[]> {
  const response = await api.get<unknown>('/relations', { params: input });
  return normalizeRelations(response.data);
}

export async function createRelation(input: CreateRelationInput): Promise<RelationV1> {
  const response = await api.post<unknown>('/relations', input);
  return requireRelation(response.data);
}

export async function revokeRelation(relationId: string): Promise<RelationV1> {
  const response = await api.post<unknown>(`/relations/${relationId}/revoke`, {});
  return requireRelation(response.data);
}

export async function reaffirmRelation(relationId: string): Promise<RelationV1> {
  const response = await api.post<unknown>(`/relations/${relationId}/reaffirm`, {});
  return requireRelation(response.data);
}
