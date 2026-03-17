import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function parseConfig(row: any) {
  if (row && typeof row.config === 'string') {
    try { row.config = JSON.parse(row.config); } catch { /* keep as string */ }
  }
  return row;
}

// GET /api/study-templates
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;

  // Return all system templates + user's custom templates
  const templates = db.prepare(
    'SELECT * FROM study_mode_templates WHERE user_id IS NULL OR user_id = ? ORDER BY is_system DESC, name ASC'
  ).all(userId) as any[];

  res.json(templates.map(parseConfig));
});

// GET /api/study-templates/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;
  const templateId = req.params.id as string;

  const template = db.prepare(
    'SELECT * FROM study_mode_templates WHERE id = ? AND (user_id IS NULL OR user_id = ?)'
  ).get(templateId, userId) as any;

  if (!template) {
    throw new AppError(404, 'Study template not found');
  }

  res.json(parseConfig(template));
});

export default router;
