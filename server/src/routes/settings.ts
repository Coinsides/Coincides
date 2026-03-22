import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateSettingsSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/settings
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await queryOne(`SELECT settings FROM users WHERE id = $1`, [req.userId!]);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json(JSON.parse(user.settings || '{}'));
});

// PUT /api/settings
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const user = await queryOne(`SELECT settings FROM users WHERE id = $1`, [req.userId!]);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Merge existing settings with new ones
    const currentSettings = JSON.parse(user.settings || '{}');
    const mergedSettings = { ...currentSettings, ...data.settings };

    const now = new Date().toISOString();
    await execute(`UPDATE users SET settings = $1, updated_at = $2 WHERE id = $3`, [JSON.stringify(mergedSettings),
      now,
      req.userId!
    ]);

    res.json(mergedSettings);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/settings/onboarding-complete
router.put('/onboarding-complete', async (req: AuthRequest, res: Response) => {
  const now = new Date().toISOString();
  await execute(`UPDATE users SET onboarding_completed = TRUE, updated_at = $1 WHERE id = $2`, [now, req.userId!]);
  res.json({ onboarding_completed: true });
});

export default router;
