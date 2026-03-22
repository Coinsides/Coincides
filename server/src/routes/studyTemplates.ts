import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

import { queryAll, queryOne } from '../db/pool.js';

const router = Router();

function parseConfig(row: any) {
  if (row && typeof row.config === 'string') {
    try { row.config = JSON.parse(row.config); } catch { /* keep as string */ }
  }
  return row;
}

// GET /api/study-templates
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Return all system templates + user's custom templates
  const templates = await queryAll(`SELECT * FROM study_mode_templates WHERE user_id IS NULL OR user_id = $1 ORDER BY is_system DESC, name ASC`, [userId]);

  res.json(templates.map(parseConfig));
});

// GET /api/study-templates/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const templateId = req.params.id as string;

  const template = await queryOne(`SELECT * FROM study_mode_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`, [templateId, userId]);

  if (!template) {
    throw new AppError(404, 'Study template not found');
  }

  res.json(parseConfig(template));
});

export default router;
