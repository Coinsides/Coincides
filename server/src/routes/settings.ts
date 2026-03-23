import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateSettingsSchema } from '../validators/index.js';
import { ZodError } from 'zod';
import { encryptApiKeysInSettings, maskApiKeysInSettings } from '../utils/crypto.js';

import { execute, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/settings
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await queryOne(`SELECT settings FROM users WHERE id = $1`, [req.userId!]);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Mask API keys before sending to frontend
  const settings = (user.settings || {}) as Record<string, any>;
  res.json(maskApiKeysInSettings(settings));
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
    const currentSettings = (user.settings || {}) as Record<string, any>;
    const incoming = data.settings as Record<string, any>;

    // Smart merge: if incoming api_key looks masked (contains ...), keep the existing one
    if (incoming.ai_providers && currentSettings.ai_providers) {
      for (const [provName, provConfig] of Object.entries(incoming.ai_providers) as [string, Record<string, any>][]) {
        if (provConfig?.api_key && provConfig.api_key.includes('...')) {
          // Masked key sent back — keep the stored (encrypted) version
          const existing = (currentSettings.ai_providers as Record<string, any>)?.[provName];
          if (existing?.api_key) {
            provConfig.api_key = existing.api_key;
          }
        }
      }
    }
    if (incoming.embedding_api_key && incoming.embedding_api_key.includes('...')) {
      incoming.embedding_api_key = currentSettings.embedding_api_key;
    }

    const mergedSettings = { ...currentSettings, ...incoming };

    // Encrypt API keys before storing
    encryptApiKeysInSettings(mergedSettings);

    const now = new Date().toISOString();
    await execute(`UPDATE users SET settings = $1, updated_at = $2 WHERE id = $3`, [JSON.stringify(mergedSettings),
      now,
      req.userId!
    ]);

    // Return masked version to frontend
    res.json(maskApiKeysInSettings(mergedSettings));
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
