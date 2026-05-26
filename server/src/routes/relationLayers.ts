import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { listRelationLayers } from '../services/learningCanvases.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listRelationLayers(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    canvas_id: typeof req.query.canvas_id === 'string' ? req.query.canvas_id : undefined,
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

export default router;
