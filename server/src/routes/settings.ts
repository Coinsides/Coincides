import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateSettingsSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/settings
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(req.userId!) as any;

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json(JSON.parse(user.settings || '{}'));
});

// PUT /api/settings
router.put('/', (req: AuthRequest, res: Response) => {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const db = getDb();

    const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(req.userId!) as any;
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Merge existing settings with new ones
    const currentSettings = JSON.parse(user.settings || '{}');
    const mergedSettings = { ...currentSettings, ...data.settings };

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET settings = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(mergedSettings),
      now,
      req.userId!
    );

    res.json(mergedSettings);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;
