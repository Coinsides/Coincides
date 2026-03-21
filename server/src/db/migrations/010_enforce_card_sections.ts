import type Database from 'better-sqlite3';

export default {
  id: '010_enforce_card_sections',
  description: 'Ensure all cards have a section_id: create "Unsorted" section per deck for orphaned cards',
  up(db: Database.Database): void {
    // Find all decks that have cards with NULL section_id
    const decksWithOrphans = db.prepare(`
      SELECT DISTINCT c.deck_id, c.user_id
      FROM cards c
      WHERE c.section_id IS NULL
    `).all() as { deck_id: string; user_id: string }[];

    if (decksWithOrphans.length === 0) return;

    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();

    const insertSection = db.prepare(`
      INSERT INTO card_sections (id, deck_id, user_id, name, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateCards = db.prepare(`
      UPDATE cards SET section_id = ? WHERE deck_id = ? AND section_id IS NULL
    `);

    // Get max order_index per deck to place "Unsorted" at the end
    const getMaxOrder = db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) as max_order
      FROM card_sections WHERE deck_id = ?
    `);

    for (const { deck_id, user_id } of decksWithOrphans) {
      const { max_order } = getMaxOrder.get(deck_id) as { max_order: number };
      const sectionId = uuidv4();
      insertSection.run(sectionId, deck_id, user_id, 'Unsorted', max_order + 1, now);
      updateCards.run(sectionId, deck_id);
    }
  },
};
