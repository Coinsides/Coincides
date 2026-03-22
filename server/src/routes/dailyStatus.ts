import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { setDailyStatusSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryOne } from '../db/pool.js';

const router = Router();

// POST /api/daily-status
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = setDailyStatusSchema.parse(req.body);
    const date = data.date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Upsert: insert or replace for the same user + date
    const existing = await queryOne(`SELECT id FROM daily_statuses WHERE user_id = $1 AND date = $2`, [req.userId!, date]);

    if (existing) {
      await execute(`UPDATE daily_statuses SET energy_level = $1 WHERE id = $2`, [data.energy_level, existing.id]);
    } else {
      await execute(`INSERT INTO daily_statuses (id, user_id, date, energy_level, created_at) VALUES ($1, $2, $3, $4, $5)`, [uuidv4(]), req.userId!, date, data.energy_level, now);
    }

    const status = await queryOne(`SELECT * FROM daily_statuses WHERE user_id = $1 AND date = $2`, [req.userId!, date]);
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
router.get('/', async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const status = await queryOne(`SELECT * FROM daily_statuses WHERE user_id = $1 AND date = $2`, [req.userId!, date]);

  if (!status) {
    res.json(null);
    return;
  }

  res.json(status);
});

export default router;
