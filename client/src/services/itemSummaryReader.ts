import api from '@/services/api';
import type { ItemSummary } from '@shared/types/itemSummary';
import type { ContentGroupV1, ItemV1 } from '@/pages/Notes/canvasEngine/runtimeDataTypes';

export type ItemSummaryMap = ReadonlyMap<string, ItemSummary>;

/** A read projection only. Never merge these fields into ContentGroup membership. */
export function itemSummaryFromItem(item: ItemV1): ItemSummary {
  return {
    id: item.id,
    summary: item.plain_text.replace(/\s+/g, ' ').trim().slice(0, 240),
    status: item.status,
    item_type: item.item_type,
    topic: item.topic,
    origin_note_id: item.origin_note_id,
    origin_course_id: item.origin_course_id,
  };
}

export function contentGroupItemIds(groups: readonly ContentGroupV1[]): string[] {
  return groups.flatMap((group) => group.members.flatMap((member) => (
    member.kind === 'item' && member.item_id ? [member.item_id] : []
  )));
}

/** One load owns its map; a later load always rereads current Item truth. */
export async function loadItemSummaries(
  itemIds: readonly string[],
  seed: readonly ItemSummary[] = [],
): Promise<ItemSummaryMap> {
  const summaries = new Map(seed.map((item) => [item.id, item]));
  const pendingIds = [...new Set(itemIds)].filter((id) => id && !summaries.has(id));
  for (let offset = 0; offset < pendingIds.length; offset += 200) {
    const { data } = await api.post<ItemSummary[]>('/items/summaries', {
      item_ids: pendingIds.slice(offset, offset + 200),
    });
    for (const item of data) summaries.set(item.id, item);
  }
  return summaries;
}

export function itemSummaryPreview(itemId: string | null | undefined, summaries?: ItemSummaryMap): string {
  const item = itemId ? summaries?.get(itemId) : undefined;
  if (!item) return 'Item unavailable';
  const text = item.summary || 'No preview';
  return item.status === 'retired' ? `Retired item: ${text}` : text;
}
