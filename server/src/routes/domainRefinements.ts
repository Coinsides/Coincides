import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  listDomainObjectClassifications,
  listDomainRefinementRecords,
} from '../services/domainRefinementProposals.js';

const router = Router();

router.get('/records', (req: AuthRequest, res: Response) => {
  const { source_domain_id } = req.query;
  const records = listDomainRefinementRecords(getDb(), req.userId!, {
    source_domain_id: typeof source_domain_id === 'string' ? source_domain_id : undefined,
  });
  res.json(records);
});

router.get('/classifications', (req: AuthRequest, res: Response) => {
  const { target_type, target_id, domain_id } = req.query;
  const classifications = listDomainObjectClassifications(getDb(), req.userId!, {
    target_type: typeof target_type === 'string' ? target_type : undefined,
    target_id: typeof target_id === 'string' ? target_id : undefined,
    domain_id: typeof domain_id === 'string' ? domain_id : undefined,
  });
  res.json(classifications);
});

export default router;
