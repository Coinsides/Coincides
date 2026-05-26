import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getDomainBlockSet,
  getDomainBlockSetCompatibilityReport,
  listDomainBlockSets,
  seedSystemDomainPackages,
} from '../services/domainPackages.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  seedSystemDomainPackages(getDb(), req.userId!);
  res.json(listDomainBlockSets(getDb(), req.userId!, {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    domain_key: typeof req.query.domain_key === 'string' ? req.query.domain_key : undefined,
    package_manifest_id: typeof req.query.package_manifest_id === 'string' ? req.query.package_manifest_id : undefined,
  }));
});

router.post('/seed-system', (req: AuthRequest, res: Response) => {
  res.json(seedSystemDomainPackages(getDb(), req.userId!));
});

router.get('/:id/compatibility-report', (req: AuthRequest, res: Response) => {
  res.json(getDomainBlockSetCompatibilityReport(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getDomainBlockSet(getDb(), req.userId!, String(req.params.id)));
});

export default router;

