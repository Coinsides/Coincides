import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { publicSettings } from '../services/publicSettings.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Dev quick login must not be loaded in production');
}

const quickLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
}).strict();

interface QuickLoginUserRow {
  id: string;
  email: string;
  name: string;
  settings: string | null;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

export const devQuickLoginRouter = Router();

devQuickLoginRouter.post('/quick-login', (req: Request, res: Response) => {
  try {
    const data = quickLoginSchema.parse(req.body);
    const user = getDb().prepare(`
      SELECT id, email, name, settings, onboarding_completed, created_at, updated_at
      FROM users
      WHERE email = ?
    `).get(data.email) as QuickLoginUserRow | undefined;

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      token: generateToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        settings: publicSettings(JSON.parse(user.settings || '{}')),
        onboarding_completed: !!user.onboarding_completed,
        created_at: user.created_at,
        updated_at: user.updated_at,
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
