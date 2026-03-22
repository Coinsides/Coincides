import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createSectionSchema, updateSectionSchema, reorderSectionsSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne, transaction } from '../db/pool.js';

const router = Router();

// GET /api/sections?deck_id=...
router.get('/', async (req: AuthRequest, res: Response) => {
  const { deck_id } = req.query as Record<string, string>;

  if (!deck_id) {
    throw new AppError(400, 'deck_id query parameter is required');
  }

  const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [deck_id, req.userId!]);
  if (!deck) {
    throw new AppError(404, 'Deck not found');
  }

  const sections = await queryAll(`SELECT * FROM card_sections WHERE deck_id = $1 AND user_id = $2 ORDER BY order_index ASC, created_at ASC`, [deck_id, req.userId!]);

  res.json(sections);
});

// POST /api/sections
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createSectionSchema.parse(req.body);
    const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [data.deck_id, req.userId!]);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO card_sections (id, deck_id, user_id, name, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [id, data.deck_id, req.userId!, data.name, data.order_index, now]);

    const section = await queryOne(`SELECT * FROM card_sections WHERE id = $1`, [id]);
    res.status(201).json(section);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/sections/reorder
router.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const data = reorderSectionsSchema.parse(req.body);
    const deck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [data.deck_id, req.userId!]);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    const batch = await transaction(async (client) => {
      for (let i = 0; i < data.order.length; i++) {
        await execute(`UPDATE card_sections SET order_index = $1 WHERE id = $2 AND deck_id = $3 AND user_id = $4`, [i, data.order[i], data.deck_id, req.userId!]);
      }
    });

    batch();

    const sections = await queryAll(`SELECT * FROM card_sections WHERE deck_id = $1 AND user_id = $2 ORDER BY order_index ASC, created_at ASC`, [data.deck_id, req.userId!]);

    res.json(sections);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/sections/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSectionSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM card_sections WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Section not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.order_index !== undefined) { fields.push('order_index = ?'); values.push(data.order_index); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    values.push(req.params.id);
    await execute(`UPDATE card_sections SET ${fields.join(', ')} WHERE id = $1`, [...values]);

    const updated = await queryOne(`SELECT * FROM card_sections WHERE id = $1`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/sections/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id, deck_id FROM card_sections WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Section not found');
  }

  const { count: cardCount } = await queryOne(`SELECT COUNT(*) as count FROM cards WHERE section_id = $1`, [req.params.id]);

  const batch = await transaction(async (client) => {
    if (cardCount > 0) {
      await execute(`DELETE FROM cards WHERE section_id = $1`, [req.params.id]);
      await execute(`UPDATE card_decks SET card_count = card_count - $1, updated_at = $2 WHERE id = $3`, [cardCount, new Date().toISOString(), existing.deck_id
      ]);
    }
    await execute(`DELETE FROM card_sections WHERE id = $1`, [req.params.id]);
  });

  batch();
  res.json({ message: 'Section deleted', cards_deleted: cardCount });
});

export default router;
