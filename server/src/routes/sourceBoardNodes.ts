import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveSourceBoardNode,
  getSourceBoardNodeJumpTarget,
  restoreSourceBoardNode,
  updateSourceBoardNode,
} from '../services/sourceBoards.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getSourceBoardNodeJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateSourceBoardNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveSourceBoardNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreSourceBoardNode(getDb(), req.userId!, String(req.params.id)));
});

export default router;
