import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveSourceBoard,
  archiveSourceBoardNode,
  createSourceBoard,
  createSourceBoardNode,
  getSourceBoardDetail,
  getSourceBoardNodeJumpTarget,
  listSourceBoards,
  restoreSourceBoard,
  restoreSourceBoardNode,
  seedSourceBoardFromScopes,
  updateSourceBoard,
  updateSourceBoardNode,
} from '../services/sourceBoards.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listSourceBoards(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

router.post('/', (req: AuthRequest, res: Response) => {
  res.status(201).json(createSourceBoard(getDb(), req.userId!, bodyObject(req)));
});

router.get('/nodes/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getSourceBoardNodeJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.put('/nodes/:id', (req: AuthRequest, res: Response) => {
  res.json(updateSourceBoardNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/nodes/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveSourceBoardNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/nodes/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreSourceBoardNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/seed-from-scopes', (req: AuthRequest, res: Response) => {
  res.json(seedSourceBoardFromScopes(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/nodes', (req: AuthRequest, res: Response) => {
  res.status(201).json(createSourceBoardNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveSourceBoard(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreSourceBoard(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getSourceBoardDetail(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateSourceBoard(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

export default router;
