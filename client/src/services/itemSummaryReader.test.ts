import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemSummary } from '@shared/types/itemSummary';
import { itemOriginLabel, loadItemSummaries } from './itemSummaryReader';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

function summary(id: string, text = id): ItemSummary {
  return { id, summary: text, status: 'active', item_type: null, topic: null, origin_note_id: null,
    origin_course_id: null, origin_board_id: null, origin_board_title: null };
}

beforeEach(() => vi.resetAllMocks());

describe('shared Item summary reader', () => {
  it('keeps the current birthplace label separate from Item body and degrades a removed origin', async () => {
    const boardItem = { ...summary('board-item', 'Preserved body'),
      origin_board_id: 'board-1', origin_board_title: 'Thinking board' };
    http.post.mockResolvedValueOnce({ data: [boardItem] });
    const loaded = (await loadItemSummaries(['board-item'])).get('board-item')!;
    expect(itemOriginLabel(loaded)).toBe('Born on board Thinking board');
    expect(loaded.summary).toBe('Preserved body');

    http.post.mockResolvedValueOnce({ data: [{ ...boardItem, origin_board_id: null, origin_board_title: null }] });
    const reopened = (await loadItemSummaries(['board-item'])).get('board-item')!;
    expect(itemOriginLabel(reopened)).toBe('Birthplace unavailable');
    expect(reopened.summary).toBe('Preserved body');
    expect(itemOriginLabel({ ...boardItem, origin_board_title: null })).toBe('Birthplace unavailable');
  });

  it('deduplicates repeated group references, batches over 200, and preserves omitted missing ids', async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `item-${index}`);
    http.post.mockImplementation(async (_path: string, body: { item_ids: string[] }) => ({
      data: body.item_ids.filter((id) => id !== 'item-200').map((id) => summary(id)),
    }));

    const result = await loadItemSummaries([...ids, ...ids]);

    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.post).toHaveBeenNthCalledWith(1, '/items/summaries', { item_ids: ids.slice(0, 200) });
    expect(http.post).toHaveBeenNthCalledWith(2, '/items/summaries', { item_ids: ['item-200'] });
    expect(result.size).toBe(200);
    expect(result.has('item-200')).toBe(false);
  });

  it('reuses the current list response as seed, without caching it across later loads', async () => {
    const seed = summary('item-1', 'Current list text');
    const seeded = await loadItemSummaries(['item-1', 'item-1'], [seed]);
    expect(seeded.get('item-1')).toBe(seed);
    expect(http.post).not.toHaveBeenCalled();

    http.post.mockResolvedValueOnce({ data: [summary('item-1', 'New current text')] });
    const reread = await loadItemSummaries(['item-1']);
    expect(reread.get('item-1')?.summary).toBe('New current text');
    expect(seeded.get('item-1')?.summary).toBe('Current list text');
  });

  it('does no request for an empty set and propagates a failed read instead of reporting items missing', async () => {
    expect((await loadItemSummaries([])).size).toBe(0);
    expect(http.post).not.toHaveBeenCalled();
    const failure = new Error('Fixture summary read failed');
    http.post.mockRejectedValueOnce(failure);
    await expect(loadItemSummaries(['item-1'])).rejects.toBe(failure);
  });
});
