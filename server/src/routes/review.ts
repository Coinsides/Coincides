import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { rateCardSchema } from '../validators/index.js';
import { ZodError } from 'zod';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card as FSRSCard } from 'ts-fsrs';

const router = Router();
const f = fsrs(generatorParameters());

function getCardTags(db: ReturnType<typeof getDb>, cardId: unknown) {
  return db.prepare(
    'SELECT t.* FROM tags t INNER JOIN card_tags ct ON ct.tag_id = t.id WHERE ct.card_id = ?'
  ).all(cardId);
}

function parseCardContent(card: any) {
  if (card && typeof card.content === 'string') {
    try { card.content = JSON.parse(card.content); } catch { /* keep as string */ }
  }
  return card;
}

// GET /api/review/due
router.get('/due', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  // Cards due: fsrs_next_review <= date OR new cards (fsrs_reps == 0)
  const cards = db.prepare(
    `SELECT c.*, cd.name as deck_name, cd.course_id
     FROM cards c
     INNER JOIN card_decks cd ON cd.id = c.deck_id
     WHERE c.user_id = ? AND (c.fsrs_next_review <= ? OR c.fsrs_reps = 0)
     ORDER BY c.fsrs_reps ASC, c.fsrs_next_review ASC`
  ).all(req.userId!, date + 'T23:59:59') as any[];

  const result = cards.map(card => {
    parseCardContent(card);
    return { ...card, tags: getCardTags(db, card.id) };
  });

  res.json(result);
});

// GET /api/review/due/count
router.get('/due/count', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const row = db.prepare(
    `SELECT COUNT(*) as count FROM cards
     WHERE user_id = ? AND (fsrs_next_review <= ? OR fsrs_reps = 0)`
  ).get(req.userId!, date + 'T23:59:59') as any;

  res.json({ count: row.count });
});

// POST /api/review/:cardId/rate
router.post('/:cardId/rate', (req: AuthRequest, res: Response) => {
  try {
    const data = rateCardSchema.parse(req.body);
    const db = getDb();

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(req.params.cardId, req.userId!) as any;
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
    db.prepare(
      `UPDATE cards SET
        fsrs_stability = ?,
        fsrs_difficulty = ?,
        fsrs_last_review = ?,
        fsrs_next_review = ?,
        fsrs_reps = ?,
        updated_at = ?
       WHERE id = ?`
    ).run(
      newCard.stability,
      newCard.difficulty,
      newCard.last_review ? (newCard.last_review as Date).toISOString() : updatedAt,
      newCard.due.toISOString(),
      newCard.reps,
      updatedAt,
      req.params.cardId
    );

    // Log activity
    const activityDate = now.toISOString().split('T')[0];
    db.prepare(
      'INSERT INTO study_activity_log (id, user_id, date, activity_type, entity_id, entity_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), req.userId!, activityDate, 'card_reviewed', req.params.cardId, 'card');

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId) as any;
    parseCardContent(updated);
    updated.tags = getCardTags(db, req.params.cardId);

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

export default router;
