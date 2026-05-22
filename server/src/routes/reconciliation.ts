import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  listReconciliationSafety,
  reopenConflict,
  resolveConflict,
  restoreExclusion,
} from '../services/reconciliationSafety.js';

const router = Router();

function bodyReason(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const reason = (body as { reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : undefined;
}

router.get('/safety', (req: AuthRequest, res: Response) => {
  const courseId = String(req.query.course_id || '');
  const result = listReconciliationSafety(getDb(), req.userId!, courseId);
  res.json(result);
});

router.post('/exclusions/:id/restore', (req: AuthRequest, res: Response) => {
  const result = restoreExclusion(getDb(), req.userId!, String(req.params.id), bodyReason(req.body));
  res.json(result);
});

router.post('/conflicts/:id/resolve', (req: AuthRequest, res: Response) => {
  const result = resolveConflict(getDb(), req.userId!, String(req.params.id), bodyReason(req.body));
  res.json(result);
});

router.post('/conflicts/:id/reopen', (req: AuthRequest, res: Response) => {
  const result = reopenConflict(getDb(), req.userId!, String(req.params.id), bodyReason(req.body));
  res.json(result);
});

export default router;
