import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveCanvasEdge,
  bindCanvasEdgeRelation,
  getCanvasEdge,
  restoreCanvasEdge,
  unbindCanvasEdgeRelation,
  updateCanvasEdge,
} from '../services/learningCanvases.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getCanvasEdge(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateCanvasEdge(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveCanvasEdge(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreCanvasEdge(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/bind-relation', (req: AuthRequest, res: Response) => {
  res.json(bindCanvasEdgeRelation(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/unbind-relation', (req: AuthRequest, res: Response) => {
  res.json(unbindCanvasEdgeRelation(getDb(), req.userId!, String(req.params.id)));
});

export default router;
