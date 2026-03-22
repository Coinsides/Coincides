import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { rateCardSchema } from '../validators/index.js';
import { ZodError } from 'zod';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card as FSRSCard } from 'ts-fsrs';

import { execute, queryAll, queryOne } from '../db/pool.js';

const router = Router();
const f = fsrs(generatorParameters());

async function getCardTags(cardId: unknown) {
  return await queryAll(`SELECT t.* FROM tags t INNER JOIN card_tags ct ON ct.tag_id = t.id WHERE ct.card_id = $1`, [cardId]);
}

function parseCardContent(card: any) {
  if (card && typeof card.content === 'string') {
    try { card.content = JSON.parse(card.content); } catch { /* keep as string */ }
  }
  return card;
}

// GET /api/review/due
router.get('/due', async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const deckId = req.query.deckId as string | undefined;
  const sectionId = req.query.sectionId as string | undefined;
  const tagId = req.query.tagId as string | undefined;

  // Build dynamic query with optional filters
  let sql = `SELECT c.*, cd.name as deck_name, cd.course_id
     FROM cards c
     INNER JOIN card_decks cd ON cd.id = c.deck_id`;
  const params: unknown[] = [];
  let paramIdx = 1;

  if (tagId) {
    sql += ` INNER JOIN card_tags ct ON ct.card_id = c.id`;
  }

  sql += ` WHERE c.user_id = $${paramIdx++} AND (c.fsrs_next_review <= $${paramIdx++} OR c.fsrs_reps = 0)`;
  params.push(req.userId!, date + 'T23:59:59');

  if (deckId) {
    sql += ` AND c.deck_id = $${paramIdx++}`;
    params.push(deckId);
  }
  if (sectionId) {
    sql += ` AND c.section_id = $${paramIdx++}`;
    params.push(sectionId);
  }
  if (tagId) {
    sql += ` AND ct.tag_id = $${paramIdx++}`;
    params.push(tagId);
  }

  if (tagId) {
    sql += ` GROUP BY c.id`;
  }

  sql += ` ORDER BY c.fsrs_reps ASC, c.fsrs_next_review ASC`;

  const cards = await queryAll(sql, params);

  const result = await Promise.all(cards.map(async card => {
    parseCardContent(card);
    return { ...card, tags: await getCardTags(card.id) };
  }));

  res.json(result);
});

// GET /api/review/due/count
router.get('/due/count', async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const row = await queryOne(`SELECT COUNT(*) as count FROM cards
     WHERE user_id = $1 AND (fsrs_next_review <= $2 OR fsrs_reps = 0)`, [req.userId!, date + 'T23:59:59']);

  res.json({ count: row.count });
});

// POST /api/review/:cardId/rate
router.post('/:cardId/rate', async (req: AuthRequest, res: Response) => {
  try {
    const data = rateCardSchema.parse(req.body);
    const card = await queryOne(`SELECT * FROM cards WHERE id = $1 AND user_id = $2`, [req.params.cardId, req.userId!]);
    if (!card) {
      throw new AppError(404, 'Card not found');
    }

    const now = new Date();
    let fsrsCard: FSRSCard;

    if (card.fsrs_reps === 0) {
      // New card
      fsrsCard = createEmptyCard(now);
    } else {
      // Existing card — reconstruct FSRS card state
      const lastReview = card.fsrs_last_review ? new Date(card.fsrs_last_review) : now;
      const elapsedDays = Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000)));

      fsrsCard = {
        due: new Date(card.fsrs_next_review || now),
        stability: card.fsrs_stability || 0,
        difficulty: card.fsrs_difficulty || 0,
        elapsed_days: elapsedDays,
        scheduled_days: 0,
        reps: card.fsrs_reps || 0,
        lapses: 0,
        learning_steps: 0,
        state: card.fsrs_reps === 0 ? State.New : State.Review,
        last_review: lastReview,
      };
    }

    // Run FSRS scheduling
    const scheduling = f.repeat(fsrsCard, now);

    // Map rating number to Rating enum
    const ratingMap: Record<number, Rating> = {
      1: Rating.Again,
      2: Rating.Hard,
      3: Rating.Good,
      4: Rating.Easy,
    };
    const rating = ratingMap[data.rating];
    const result = (scheduling as any)[rating] as { card: FSRSCard; log: any };
    const newCard = result.card;

    // Update card in database
    const updatedAt = now.toISOString();
    await execute(`UPDATE cards SET
        fsrs_stability = $1,
        fsrs_difficulty = $2,
        fsrs_last_review = $3,
        fsrs_next_review = $4,
        fsrs_reps = $5,
        updated_at = $6
       WHERE id = $7`, [newCard.stability,
      newCard.difficulty,
      newCard.last_review ? (newCard.last_review as Date).toISOString() : updatedAt,
      newCard.due.toISOString(),
      newCard.reps,
      updatedAt,
      req.params.cardId
    ]);

    // Log activity
    const activityDate = now.toISOString().split('T')[0];
    await execute(`INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type) VALUES ($1, $2, $3, $4, $5, $6)`, [uuidv4(), req.userId!, activityDate, 'card_reviewed', req.params.cardId, 'card']);

    const updated = await queryOne(`SELECT * FROM cards WHERE id = $1`, [req.params.cardId]);
    parseCardContent(updated);
    updated.tags = await getCardTags(req.params.cardId);

    res.json({
      card: updated,
      review_log: {
        rating: data.rating,
        state: newCard.state,
        stability: newCard.stability,
        difficulty: newCard.difficulty,
        due: newCard.due.toISOString(),
        reps: newCard.reps,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/review/browse — deck→section→card tree for custom selector
router.get('/browse', async (req: AuthRequest, res: Response) => {
  const decks = await queryAll(`SELECT id, name, course_id FROM card_decks WHERE user_id = $1 ORDER BY name`, [req.userId!]);

  const result = await Promise.all(decks.map(async (deck: any) => {
    const sections = await queryAll(`SELECT id, name FROM card_sections WHERE deck_id = $1 ORDER BY order_index`, [deck.id]);

    const unsectionedCards = await queryAll(`SELECT id, title, fsrs_reps, fsrs_next_review
       FROM cards WHERE deck_id = $1 AND section_id IS NULL AND user_id = $2
       ORDER BY order_index`, [deck.id, req.userId!]);

    const sectionData = await Promise.all(sections.map(async (section: any) => {
      const cards = await queryAll(`SELECT id, title, fsrs_reps, fsrs_next_review
         FROM cards WHERE section_id = $1 AND user_id = $2
         ORDER BY order_index`, [section.id, req.userId!]);
      return { ...section, cards };
    }));

    return {
      ...deck,
      sections: sectionData,
      unsectioned_cards: unsectionedCards,
    };
  }));

  res.json(result);
});

// POST /api/review/custom — review arbitrary card IDs
router.post('/custom', async (req: AuthRequest, res: Response) => {
  const { card_ids } = req.body;
  if (!Array.isArray(card_ids) || card_ids.length === 0) {
    throw new AppError(400, 'card_ids must be a non-empty array');
  }
  if (card_ids.length > 500) {
    throw new AppError(400, 'Maximum 500 cards per custom review session');
  }
  let pIdx = 1;
  const placeholders = card_ids.map(() => `$${pIdx++}`).join(',');
  const cards = await queryAll(`SELECT c.*, cd.name as deck_name, cd.course_id
     FROM cards c
     INNER JOIN card_decks cd ON cd.id = c.deck_id
     WHERE c.id IN (${placeholders}) AND c.user_id = $${pIdx}
     ORDER BY c.fsrs_reps ASC, c.fsrs_next_review ASC`, [...card_ids, req.userId!]);

  const result = await Promise.all(cards.map(async card => {
    parseCardContent(card);
    return { ...card, tags: await getCardTags(card.id) };
  }));

  res.json(result);
});

export default router;
