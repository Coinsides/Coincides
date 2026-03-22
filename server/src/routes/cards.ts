import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createCardSchema, updateCardSchema, batchDeleteCardsSchema, batchMoveCardsSchema, reorderCardsSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne, transaction } from '../db/pool.js';

const router = Router();

function getCardTags(cardId: unknown) {
  return await queryAll(`SELECT t.* FROM tags t INNER JOIN card_tags ct ON ct.tag_id = t.id WHERE ct.card_id = $1`, [cardId]);
}

function setCardTags(cardId: unknown, tagIds: string[]) {
  await execute(`DELETE FROM card_tags WHERE card_id = $1`, [cardId]);
  if (tagIds.length > 0) {
    for (const tagId of tagIds) {
      await execute(`INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2)`, [cardId, tagId]);
    }
  }
}

function parseCardContent(card: any) {
  if (card && typeof card.content === 'string') {
    try { card.content = JSON.parse(card.content); } catch { /* keep as string */ }
  }
  return card;
}

// GET /api/cards
router.get('/', async (req: AuthRequest, res: Response) => {
  const { deck_id, tag_id, template_type, importance, search } = req.query as Record<string, string>;

  if (!deck_id) {
    throw new AppError(400, 'deck_id query parameter is required');
  }

  // Verify deck belongs to user
  const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [deck_id, req.userId!]);
  if (!deck) {
    throw new AppError(404, 'Deck not found');
  }

  let query = 'SELECT DISTINCT c.* FROM cards c';
  const params: unknown[] = [];
  const conditions: string[] = ['c.deck_id = ?', 'c.user_id = ?'];
  params.push(deck_id, req.userId!);

  if (tag_id) {
    query += ' INNER JOIN card_tags ct ON ct.card_id = c.id';
    conditions.push('ct.tag_id = ?');
    params.push(tag_id);
  }

  if (template_type) {
    conditions.push('c.template_type = ?');
    params.push(template_type);
  }

  if (importance) {
    conditions.push('c.importance = ?');
    params.push(parseInt(importance, 10));
  }

  if (search) {
    conditions.push('(c.title LIKE ? OR c.content LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY c.section_id NULLS LAST, c.order_index ASC, c.created_at DESC`;
  const cards = await queryAll(query, params)[];

  // Attach tags to each card
  const result = cards.map(card => {
    parseCardContent(card);
    return { ...card, tags: getCardTags(db, card.id) };
  });

  res.json(result);
});

// GET /api/cards/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const card = await queryOne(`SELECT * FROM cards WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!card) {
    throw new AppError(404, 'Card not found');
  }

  parseCardContent(card);
  card.tags = getCardTags(db, card.id);
  res.json(card);
});

// POST /api/cards
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createCardSchema.parse(req.body);
    // Verify deck belongs to user
    const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [data.deck_id, req.userId!]);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    // Enforce section_id requirement
    if (!data.section_id) {
      throw new AppError(400, 'section_id is required — every card must belong to a section');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO cards (id, user_id, deck_id, section_id, template_type, title, content, importance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [id,
      req.userId!,
      data.deck_id,
      data.section_id,
      data.template_type,
      data.title,
      JSON.stringify(data.content]),
      data.importance,
      now,
      now
    );

    // Set tags
    if (data.tag_ids && data.tag_ids.length > 0) {
      setCardTags(db, id, data.tag_ids);
    }

    // Increment deck card_count
    await execute(`UPDATE card_decks SET card_count = card_count + 1, updated_at = $1 WHERE id = $2`, [now, data.deck_id]);

    const card = await queryOne(`SELECT * FROM cards WHERE id = $1`, [id]);
    parseCardContent(card);
    card.tags = getCardTags(db, id);

    res.status(201).json(card);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/cards/reorder — MUST be before /:id to avoid param capture
router.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const data = reorderCardsSchema.parse(req.body);
    // Verify deck belongs to user
    const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [data.deck_id, req.userId!]);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    // Verify all cards belong to this deck
    for (const upd of data.updates) {
      const card = await queryOne(`SELECT id FROM cards WHERE id = $1 AND deck_id = $2 AND user_id = $3`, [upd.id, data.deck_id, req.userId!]);
      if (!card) {
        throw new AppError(400, `Card ${upd.id} not found in this deck`);
      }
    }

    const now = new Date().toISOString();

    const batch = await transaction(async (client) => {
      for (const upd of data.updates) {
        await execute(`UPDATE cards SET section_id = $1, order_index = $2, updated_at = $3 WHERE id = $4`, [upd.section_id, upd.order_index, now, upd.id]);
      }
    });

    batch();
    res.json({ updated: data.updates.length });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/cards/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCardSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM cards WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Card not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.template_type !== undefined) { fields.push('template_type = ?'); values.push(data.template_type); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(JSON.stringify(data.content)); }
    if (data.importance !== undefined) { fields.push('importance = ?'); values.push(data.importance); }
    if (data.section_id !== undefined) { fields.push('section_id = ?'); values.push(data.section_id); }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(req.params.id);
      await execute(`UPDATE cards SET ${fields.join(', ')} WHERE id = $1`, [...values]);
    }

    // Update tags if provided
    const cardId = req.params.id;
    if (data.tag_ids !== undefined) {
      setCardTags(db, cardId, data.tag_ids);
    }

    const updated = await queryOne(`SELECT * FROM cards WHERE id = $1`, [cardId]);
    parseCardContent(updated);
    updated.tags = getCardTags(db, cardId);

    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/cards/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id, deck_id FROM cards WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Card not found');
  }

  // CASCADE handles card_tags cleanup via FK constraints
  await execute(`DELETE FROM cards WHERE id = $1`, [req.params.id]);

  // Decrement deck card_count
  await execute(`UPDATE card_decks SET card_count = card_count - 1, updated_at = $1 WHERE id = $2`, [new Date(]).toISOString(),
    existing.deck_id
  );

  res.json({ message: 'Card deleted' });
});

// POST /api/cards/batch-delete
router.post('/batch-delete', async (req: AuthRequest, res: Response) => {
  try {
    const data = batchDeleteCardsSchema.parse(req.body);
    const deckCounts: Record<string, number> = {};
    let deleted = 0;

    const batch = await transaction(async (client) => {
      for (const cardId of data.card_ids) {
        const card = await queryOne(`SELECT id FROM cards WHERE id = $1 AND deck_id = $2 AND user_id = $3`, [cardId, req.userId!]);
        if (card) {
          await execute(`DELETE FROM cards WHERE id = $1 AND user_id = $2`, [cardId, req.userId!]);
          deckCounts[card.deck_id] = (deckCounts[card.deck_id] || 0) + 1;
          deleted++;
        }
      }

      const now = new Date().toISOString();
      for (const [deckId, count] of Object.entries(deckCounts)) {
        await execute(`UPDATE card_decks SET card_count = card_count - $1, updated_at = $2 WHERE id = $3`, [count, now, deckId]);
      }
    });

    batch();
    res.json({ deleted });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/cards/batch-move
router.post('/batch-move', async (req: AuthRequest, res: Response) => {
  try {
    const data = batchMoveCardsSchema.parse(req.body);
    // Verify target deck belongs to user
    const targetDeck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [data.target_deck_id, req.userId!]);
    if (!targetDeck) {
      throw new AppError(404, 'Target deck not found');
    }

    const sourceDeckCounts: Record<string, number> = {};
    let moved = 0;

    const batch = await transaction(async (client) => {
      const now = new Date().toISOString();
      for (const cardId of data.card_ids) {
        const card = await queryOne(`SELECT id FROM cards WHERE id = $1 AND deck_id = $2 AND user_id = $3`, [cardId, req.userId!]);
        if (card && card.deck_id !== data.target_deck_id) {
          await execute(`UPDATE cards SET deck_id = $1, section_id = $2, updated_at = $3 WHERE id = $4`, [data.target_deck_id, data.target_section_id || null, now, cardId]);
          sourceDeckCounts[card.deck_id] = (sourceDeckCounts[card.deck_id] || 0) + 1;
          moved++;
        }
      }

      const now2 = new Date().toISOString();
      for (const [deckId, count] of Object.entries(sourceDeckCounts)) {
        await execute(`UPDATE card_decks SET card_count = card_count - $1, updated_at = $2 WHERE id = $3`, [count, now2, deckId]);
      }
      if (moved > 0) {
        await execute(`UPDATE card_decks SET card_count = card_count + $1, updated_at = $2 WHERE id = $3`, [moved, now2, data.target_deck_id]);
      }
    });

    batch();
    res.json({ moved });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// ============================================================
// Card-Task reverse lookup (v1.7)
// ============================================================

// GET /api/cards/:cardId/tasks — get all tasks linked to a card
router.get('/:cardId/tasks', async (req: AuthRequest, res: Response) => {
  const { cardId } = req.params;

  // Verify card belongs to user
  const card = await queryOne(`SELECT id FROM cards WHERE id = $1 AND user_id = $2`, [cardId, req.userId!]);
  if (!card) {
    throw new AppError(404, 'Card not found');
  }

  const links = await queryAll(`
    SELECT tc.id, tc.task_id, tc.checklist_index, tc.created_at,
           t.title as task_title, t.date as task_date, t.status as task_status,
           t.priority as task_priority
    FROM task_cards tc
    JOIN tasks t ON tc.task_id = t.id
    WHERE tc.card_id = $1
    ORDER BY t.date DESC, tc.created_at ASC
  `, [cardId]);

  res.json(links);
});

export default router;
