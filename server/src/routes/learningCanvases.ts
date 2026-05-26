import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveCanvasNode,
  createCanvasEdge,
  archiveLearningCanvas,
  createCanvasNoteBlock,
  createCanvasNode,
  createLearningCanvas,
  getCanvasCommandContext,
  getCanvasNodeJumpTarget,
  getLearningCanvasDetail,
  listCanvasEdges,
  listLearningCanvases,
  restoreCanvasNode,
  restoreLearningCanvas,
  seedCanvasFromSourceBoard,
  updateCanvasNode,
  updateCanvasViewport,
  updateLearningCanvas,
} from '../services/learningCanvases.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listLearningCanvases(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

router.post('/', (req: AuthRequest, res: Response) => {
  res.status(201).json(createLearningCanvas(getDb(), req.userId!, bodyObject(req)));
});

router.get('/nodes/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getCanvasNodeJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.put('/nodes/:id', (req: AuthRequest, res: Response) => {
  res.json(updateCanvasNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/nodes/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveCanvasNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/nodes/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreCanvasNode(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/seed-from-source-board', (req: AuthRequest, res: Response) => {
  const body = bodyObject(req);
  res.json(seedCanvasFromSourceBoard(getDb(), req.userId!, String(req.params.id), String(body.source_board_id || '')));
});

router.put('/:id/viewport', (req: AuthRequest, res: Response) => {
  res.json(updateCanvasViewport(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.get('/:id/command-context', (req: AuthRequest, res: Response) => {
  const visibleLayers = typeof req.query.visible_relation_layer_ids === 'string'
    ? req.query.visible_relation_layer_ids.split(',').map((id) => id.trim()).filter(Boolean)
    : Array.isArray(req.query.visible_relation_layer_ids)
      ? req.query.visible_relation_layer_ids.map((id) => String(id)).filter(Boolean)
      : undefined;
  res.json(getCanvasCommandContext(getDb(), req.userId!, String(req.params.id), {
    selected_type: typeof req.query.selected_type === 'string' ? req.query.selected_type as any : undefined,
    selected_id: typeof req.query.selected_id === 'string' ? req.query.selected_id : undefined,
    visible_relation_layer_ids: visibleLayers,
  }));
});

router.post('/:id/note-blocks', (req: AuthRequest, res: Response) => {
  res.status(201).json(createCanvasNoteBlock(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/nodes', (req: AuthRequest, res: Response) => {
  res.status(201).json(createCanvasNode(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.get('/:id/edges', (req: AuthRequest, res: Response) => {
  res.json(listCanvasEdges(getDb(), req.userId!, String(req.params.id), {
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

router.post('/:id/edges', (req: AuthRequest, res: Response) => {
  res.status(201).json(createCanvasEdge(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveLearningCanvas(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreLearningCanvas(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getLearningCanvasDetail(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateLearningCanvas(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

export default router;
