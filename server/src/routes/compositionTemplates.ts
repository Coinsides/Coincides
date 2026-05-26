import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getCompositionTemplate,
  getCompositionTemplateCompatibilityReport,
  listCompositionTemplates,
  seedSystemCompositionTemplates,
} from '../services/compositionTemplates.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  seedSystemCompositionTemplates(getDb(), req.userId!);
  res.json(listCompositionTemplates(getDb(), req.userId!, {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    composition_key: typeof req.query.composition_key === 'string' ? req.query.composition_key : undefined,
  }));
});

router.post('/seed-system', (req: AuthRequest, res: Response) => {
  res.json({
    composition_templates: seedSystemCompositionTemplates(getDb(), req.userId!),
  });
});

router.get('/compatibility-report', (req: AuthRequest, res: Response) => {
  res.json(getCompositionTemplateCompatibilityReport(getDb(), req.userId!));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getCompositionTemplate(getDb(), req.userId!, String(req.params.id)));
});

export default router;
