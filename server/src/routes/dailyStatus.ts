import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { setDailyStatusSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// POST /api/daily-status
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = setDailyStatusSchema.parse(req.body);
    const db = getDb();

    const date = data.date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Upsert: insert or replace for the same user + date
    const existing = db.prepare(
      'SELECT id FROM daily_statuses WHERE user_id = ? AND date = ?'
    ).get(req.userId!, date) as any;

    if (existing) {
      db.prepare('UPDATE daily_statuses SET energy_level = ? WHERE id = ?').run(data.energy_level, existing.id);
    } else {
      db.prepare(
        'INSERT INTO daily_statuses (id, user_id, date, energy_level, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(uuidv4(), req.userId!, date, data.energy_level, now);
    }

    const status = db.prepare('SELECT * FROM daily_statuses WHERE user_id = ? AND date = ?').get(req.userId!, date);
    res.json(status);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/daily-status
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const status = db.prepare('SELECT * FROM daily_statuses WHERE user_id = ? AND date = ?').get(req.userId!, date);

  if (!status) {
    res.json(null);
    return;
  }

  res.json(status);
});

export default router;
