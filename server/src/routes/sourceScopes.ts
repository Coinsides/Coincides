import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  archiveSourceScope,
  createSourceScope,
  getSourceScope,
  getSourceScopeJumpTarget,
  listSourceScopes,
  restoreSourceScope,
  updateSourceScope,
} from '../services/sourceScopes.js';

const router = Router();

function bodyObject(req: AuthRequest) {
  return req.body && typeof req.body === 'object' ? req.body as any : {};
}

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listSourceScopes(getDb(), req.userId!, {
    course_id: String(req.query.course_id || ''),
    status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
  }));
});

router.post('/', (req: AuthRequest, res: Response) => {
  res.status(201).json(createSourceScope(getDb(), req.userId!, bodyObject(req)));
});

router.get('/:id/jump-target', (req: AuthRequest, res: Response) => {
  res.json(getSourceScopeJumpTarget(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveSourceScope(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreSourceScope(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getSourceScope(getDb(), req.userId!, String(req.params.id)));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateSourceScope(getDb(), req.userId!, String(req.params.id), bodyObject(req)));
});

export default router;
