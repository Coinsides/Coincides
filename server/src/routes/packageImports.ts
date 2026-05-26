import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  applyPackageImport,
  buildPackageImportPreview,
  discardPackageImportPreview,
  getPackageImportPreview,
  listPackageImportPreviews,
} from '../services/packagePortability.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listPackageImportPreviews(getDb(), req.userId!));
});

router.post('/preview', (req: AuthRequest, res: Response) => {
  res.status(201).json(buildPackageImportPreview(getDb(), req.userId!, req.body || {}));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getPackageImportPreview(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/apply', (req: AuthRequest, res: Response) => {
  res.json(applyPackageImport(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/discard', (req: AuthRequest, res: Response) => {
  res.json(discardPackageImportPreview(getDb(), req.userId!, String(req.params.id)));
});

export default router;
