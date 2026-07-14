import api from '@/services/api';
import type {
  ItemAnchorTargetKind,
  ItemAnchorV1,
  ItemV1,
} from './runtimeDataTypes';

export interface CollectItemAnchorInput {
  pool_scope_kind: 'content_group';
  pool_scope_id: string;
  target_kind: ItemAnchorTargetKind;
  target_id: string;
  range_json?: Record<string, unknown> | null;
  excerpt: string;
  reference_mode?: string;
  source_record_id?: string | null;
  collected_for?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface CastItemInput {
  anchor_ids: string[];
  plain_text: string;
  item_type?: string | null;
  topic?: string | null;
  origin_course_id?: string | null;
  origin_note_id?: string | null;
  created_by?: string;
  claimed_by?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemInput {
  plain_text?: string;
  item_type?: string | null;
  topic?: string | null;
  metadata?: Record<string, unknown>;
}

export async function loadItem(itemId: string): Promise<ItemV1> {
  const response = await api.get<ItemV1>(`/items/${itemId}`);
  return response.data;
}

export async function loadPoolItemAnchors(groupId: string): Promise<ItemAnchorV1[]> {
  const response = await api.get<ItemAnchorV1[]>('/items/anchors', {
    params: {
      pool_scope_kind: 'content_group',
      pool_scope_id: groupId,
    },
  });
  return response.data;
}

export async function collectItemAnchor(input: CollectItemAnchorInput): Promise<ItemAnchorV1> {
  const response = await api.post<ItemAnchorV1>('/items/anchors', input);
  return response.data;
}

export async function discardItemAnchor(anchorId: string): Promise<void> {
  await api.delete(`/items/anchors/${anchorId}`);
}

export async function castItemFromAnchors(input: CastItemInput): Promise<ItemV1> {
  const response = await api.post<ItemV1>('/items/cast', input);
  return response.data;
}

export async function updateItem(itemId: string, input: UpdateItemInput): Promise<ItemV1> {
  const response = await api.put<ItemV1>(`/items/${itemId}`, input);
  return response.data;
}

export async function retireItem(itemId: string, successorItemId?: string | null): Promise<ItemV1> {
  const response = await api.post<ItemV1>(`/items/${itemId}/retire`, {
    successor_item_id: successorItemId || null,
  });
  return response.data;
}
