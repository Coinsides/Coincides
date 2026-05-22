import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  generateSourceAnchors,
  getSourceAnchor,
  getSourceAnchorJumpTarget,
  listSourceAnchors,
  refreshSourceAnchor,
} from '../services/sourceAnchors.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const result = listSourceAnchors(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    target_type: typeof req.query.target_type === 'string' ? req.query.target_type as any : undefined,
    target_id: typeof req.query.target_id === 'string' ? req.query.target_id : undefined,
  });
  res.json(result);
});

router.post('/generate', (req: AuthRequest, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body as any : {};
  const result = generateSourceAnchors(getDb(), req.userId!, {
    course_id: String(body.course_id || ''),
    target_type: typeof body.target_type === 'string' ? body.target_type : undefined,
    target_id: typeof body.target_id === 'string' ? body.target_id : undefined,
  });
  res.json(result);
});

router.get('/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getSourceAnchorJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/refresh', (req: AuthRequest, res: Response) => {
  res.json(refreshSourceAnchor(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getSourceAnchor(getDb(), req.userId!, String(req.params.id)));
});

export default router;
