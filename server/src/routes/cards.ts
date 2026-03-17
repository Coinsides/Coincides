import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createCardSchema, updateCardSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

function getCardTags(db: ReturnType<typeof getDb>, cardId: unknown) {
  return db.prepare(
    'SELECT t.* FROM tags t INNER JOIN card_tags ct ON ct.tag_id = t.id WHERE ct.card_id = ?'
  ).all(cardId);
}

function setCardTags(db: ReturnType<typeof getDb>, cardId: unknown, tagIds: string[]) {
  db.prepare('DELETE FROM card_tags WHERE card_id = ?').run(cardId);
  if (tagIds.length > 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insert.run(cardId, tagId);
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
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { deck_id, tag_id, template_type, importance, search } = req.query as Record<string, string>;

  if (!deck_id) {
    throw new AppError(400, 'deck_id query parameter is required');
  }

  // Verify deck belongs to user
  const deck = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(deck_id, req.userId!);
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

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY c.created_at DESC`;
  const cards = db.prepare(query).all(...params) as any[];

  // Attach tags to each card
  const result = cards.map(card => {
    parseCardContent(card);
    return { ...card, tags: getCardTags(db, card.id) };
  });

  res.json(result);
});

// GET /api/cards/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!card) {
    throw new AppError(404, 'Card not found');
  }

  parseCardContent(card);
  card.tags = getCardTags(db, card.id);
  res.json(card);
});

// POST /api/cards
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createCardSchema.parse(req.body);
    const db = getDb();

    // Verify deck belongs to user
    const deck = db.prepare('SELECT id FROM card_decks WHERE id = ? AND user_id = ?').get(data.deck_id, req.userId!);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO cards (id, user_id, deck_id, template_type, title, content, importance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      req.userId!,
      data.deck_id,
      data.template_type,
      data.title,
      JSON.stringify(data.content),
      data.importance,
      now,
      now
    );

    // Set tags
    if (data.tag_ids && data.tag_ids.length > 0) {
      setCardTags(db, id, data.tag_ids);
    }

    // Increment deck card_count
    db.prepare('UPDATE card_decks SET card_count = card_count + 1, updated_at = ? WHERE id = ?').run(now, data.deck_id);

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as any;
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

// PUT /api/cards/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateCardSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!existing) {
      throw new AppError(404, 'Card not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.template_type !== undefined) { fields.push('template_type = ?'); values.push(data.template_type); }
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(JSON.stringify(data.content)); }
    if (data.importance !== undefined) { fields.push('importance = ?'); values.push(data.importance); }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(req.params.id);
      db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update tags if provided
    const cardId = req.params.id;
    if (data.tag_ids !== undefined) {
      setCardTags(db, cardId, data.tag_ids);
    }

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as any;
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
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id, deck_id FROM cards WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) {
    throw new AppError(404, 'Card not found');
  }

  // CASCADE handles card_tags cleanup via FK constraints
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);

  // Decrement deck card_count
  db.prepare('UPDATE card_decks SET card_count = card_count - 1, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    existing.deck_id
  );

  res.json({ message: 'Card deleted' });
});

export default router;
