import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getPackageManifest,
  getPackageManifestPreview,
  listPackageManifests,
  previewPackageManifestInput,
  seedSystemDomainPackages,
} from '../services/domainPackages.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  seedSystemDomainPackages(getDb(), req.userId!);
  res.json(listPackageManifests(getDb(), req.userId!, {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    package_key: typeof req.query.package_key === 'string' ? req.query.package_key : undefined,
  }));
});

router.post('/seed-system', (req: AuthRequest, res: Response) => {
  res.json(seedSystemDomainPackages(getDb(), req.userId!));
});

router.post('/preview', (req: AuthRequest, res: Response) => {
  res.json(previewPackageManifestInput(getDb(), req.userId!, req.body || {}));
});

router.get('/:id/preview', (req: AuthRequest, res: Response) => {
  res.json(getPackageManifestPreview(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getPackageManifest(getDb(), req.userId!, String(req.params.id)));
});

export default router;

