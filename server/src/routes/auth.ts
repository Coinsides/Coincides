import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { seedSystemTags } from '../db/init.js';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const db = getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
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

    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.email, passwordHash, data.name, defaultSettings, now, now);

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
router.post('/login', (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email) as any;
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
        settings: JSON.parse(user.settings || '{}'),
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
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, settings, onboarding_completed, created_at, updated_at FROM users WHERE id = ?').get(req.userId!) as any;

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({
    ...user,
    settings: JSON.parse(user.settings || '{}'),
    onboarding_completed: !!user.onboarding_completed,
  });
});

export default router;
