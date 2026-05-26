import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveCanvasNode,
  getCanvasNodeJumpTarget,
  restoreCanvasNode,
  updateCanvasNode,
} from '../services/learningCanvases.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getCanvasNodeJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateCanvasNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveCanvasNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreCanvasNode(getDb(), req.userId!, String(req.params.id)));
});

export default router;
