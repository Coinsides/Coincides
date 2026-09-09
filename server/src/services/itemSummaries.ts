import type Database from 'better-sqlite3';
import type { ItemSummary } from '../../../shared/types/itemSummary.js';

type ItemSummaryRow = Omit<ItemSummary, 'summary'> & { plain_text: string };

/** Read current content only: no snapshot creation or anchor hydration. */
export function listItemSummaries(
  db: Database.Database,
  userId: string,
  itemIds: string[],
): ItemSummary[] {
  const ids = [...new Set(itemIds)];
  if (ids.length === 0) return [];
  const rows = db.prepare(`
    SELECT i.id, i.plain_text, i.status, i.item_type, i.topic, i.origin_note_id, i.origin_course_id,
      i.origin_board_id, b.title AS origin_board_title
    FROM items i
    LEFT JOIN boards b ON b.id = i.origin_board_id AND b.user_id = i.user_id
    WHERE i.user_id = ? AND i.id IN (${ids.map(() => '?').join(', ')})
  `).all(userId, ...ids) as ItemSummaryRow[];
  const byId = new Map(rows.map(({ plain_text, ...row }) => [row.id, {
    ...row, plain_text, summary: plain_text.replace(/\s+/g, ' ').trim().slice(0, 240),
  }]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
