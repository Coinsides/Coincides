import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryOne } from '../db/pool.js';
import { maskApiKeysInSettings } from '../utils/crypto.js';

import { seedSystemTags } from '../db/init.js';
const router = Router();

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    // Check if email already exists
    const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [data.email]);
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const now = new Date().toISOString();
    const defaultSettings = JSON.stringify({
      theme: 'dark',
      agent_name: 'Mr. Zero',
      daily_status_enabled: true,
      keyboard_shortcuts_enabled: true,
    });

    await execute(`INSERT INTO users (id, email, password_hash, name, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, data.email, passwordHash, data.name, defaultSettings, now, now]);

    // Seed system tags for new user
    seedSystemTags(id);

    const token = generateToken(id);

    res.status(201).json({
      token,
      user: {
        id,
        email: data.email,
        name: data.name,
        settings: JSON.parse(defaultSettings),
        onboarding_completed: false,
        created_at: now,
        updated_at: now,
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

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await queryOne(`SELECT * FROM users WHERE email = $1`, [data.email]);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const validPassword = bcrypt.compareSync(data.password, user.password_hash);
    if (!validPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        settings: maskApiKeysInSettings((user.settings || {}) as Record<string, any>),
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

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await queryOne(`SELECT id, email, name, settings, onboarding_completed, created_at, updated_at FROM users WHERE id = $1`, [req.userId!]);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({
    ...user,
    settings: maskApiKeysInSettings((user.settings || {}) as Record<string, any>),
    onboarding_completed: !!user.onboarding_completed,
  });
});

export default router;
