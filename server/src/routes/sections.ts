import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createSectionSchema, updateSectionSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/sections?deck_id=...
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { deck_id } = req.query as Record<string, string>;

  if (!deck_id) {
    throw new AppError(400, 'deck_id query parameter is required');
  }

  const deck = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(deck_id, req.userId!);
  if (!deck) {
    throw new AppError(404, 'Deck not found');
  }

  const sections = db.prepare(
    'SELECT * FROM card_sections WHERE deck_id = ? AND user_id = ? ORDER BY order_index ASC, created_at ASC'
  ).all(deck_id, req.userId!);

  res.json(sections);
});

// POST /api/sections
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createSectionSchema.parse(req.body);
    const db = getDb();

    const deck = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(data.deck_id, req.userId!);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO card_sections (id, deck_id, user_id, name, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.deck_id, req.userId!, data.name, data.order_index, now);

    const section = db.prepare('SELECT * FROM card_sections WHERE id = ?').get(id);
    res.status(201).json(section);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/sections/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateSectionSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM card_sections WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
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
    db.prepare(`UPDATE card_sections SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM card_sections WHERE id = ?').get(req.params.id);
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
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id, deck_id FROM card_sections WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) {
    throw new AppError(404, 'Section not found');
  }

  const { count: cardCount } = db.prepare('SELECT COUNT(*) as count FROM cards WHERE section_id = ?').get(req.params.id) as any;

  const batch = db.transaction(() => {
    if (cardCount > 0) {
      db.prepare('DELETE FROM cards WHERE section_id = ?').run(req.params.id);
      db.prepare('UPDATE card_decks SET card_count = card_count - ?, updated_at = ? WHERE id = ?').run(
        cardCount, new Date().toISOString(), existing.deck_id
      );
    }
    db.prepare('DELETE FROM card_sections WHERE id = ?').run(req.params.id);
  });

  batch();
  res.json({ message: 'Section deleted', cards_deleted: cardCount });
});

export default router;
