import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  generateSourceSnapshots,
  getSourceSnapshot,
  listSourceSnapshotPages,
  listSourceSnapshots,
} from '../services/sourceSnapshots.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const result = listSourceSnapshots(getDb(), req.userId!, String(req.query.course_id || ''));
  res.json(result);
});

router.post('/generate', (req: AuthRequest, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body as any : {};
  const result = generateSourceSnapshots(getDb(), req.userId!, {
    course_id: String(body.course_id || ''),
    document_id: typeof body.document_id === 'string' ? body.document_id : undefined,
    source_material_id: typeof body.source_material_id === 'string' ? body.source_material_id : undefined,
  });
  res.json(result);
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getSourceSnapshot(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id/pages', (req: AuthRequest, res: Response) => {
  res.json(listSourceSnapshotPages(getDb(), req.userId!, String(req.params.id)));
});

export default router;
