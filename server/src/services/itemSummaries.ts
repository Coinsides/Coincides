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
    SELECT id, plain_text, status, item_type, topic, origin_note_id, origin_course_id
    FROM items WHERE user_id = ? AND id IN (${ids.map(() => '?').join(', ')})
  `).all(userId, ...ids) as ItemSummaryRow[];
  const byId = new Map(rows.map(({ plain_text, ...row }) => [row.id, {
    ...row, summary: plain_text.replace(/\s+/g, ' ').trim().slice(0, 240),
  }]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
