import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  buildPackageExportPreview,
  createPackageExport,
  getPackageExport,
  listPackageExports,
} from '../services/packagePortability.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listPackageExports(getDb(), req.userId!));
});

router.post('/preview', (req: AuthRequest, res: Response) => {
  res.json(buildPackageExportPreview(getDb(), req.userId!, req.body || {}));
});

router.post('/', (req: AuthRequest, res: Response) => {
  res.status(201).json(createPackageExport(getDb(), req.userId!, req.body || {}));
});

router.get('/:id/download', (req: AuthRequest, res: Response) => {
  const record = getPackageExport(getDb(), req.userId!, String(req.params.id));
  const packageKey = String(record.bundle.manifest.package_key || 'coincides-package')
    .replace(/[^a-z0-9_.-]/gi, '-')
    .slice(0, 120);
  res.setHeader('Content-Disposition', `attachment; filename="${packageKey}.coincides.json"`);
  res.json(record.bundle);
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getPackageExport(getDb(), req.userId!, String(req.params.id)));
});

export default router;
