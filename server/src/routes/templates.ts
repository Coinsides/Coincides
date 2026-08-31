import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getTemplateDefinition,
  listTemplateDefinitions,
  seedSystemTemplateDefinitions,
} from '../services/templateDefinitions.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  seedSystemTemplateDefinitions(getDb(), req.userId!);
  res.json(listTemplateDefinitions(getDb(), req.userId!, {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    template_key: typeof req.query.template_key === 'string' ? req.query.template_key : undefined,
    system_type: typeof req.query.system_type === 'string' ? req.query.system_type : undefined,
    learning_role: typeof req.query.learning_role === 'string' ? req.query.learning_role : undefined,
  }));
});

router.post('/seed-system', (req: AuthRequest, res: Response) => {
  res.json({
    templates: seedSystemTemplateDefinitions(getDb(), req.userId!),
  });
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

export default router;
