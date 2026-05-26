import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  activateTemplateDefinition,
  archiveTemplateDefinition,
  copyTemplateDefinition,
  createUserTemplateDefinition,
  deprecateTemplateDefinition,
  getTemplateCompatibilityReport,
  getTemplateDefinition,
  getTemplateUsage,
  listTemplateDefinitions,
  restoreTemplateDefinition,
  seedSystemTemplateDefinitions,
  updateTemplateDefinition,
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

router.post('/', (req: AuthRequest, res: Response) => {
  const template = createUserTemplateDefinition(getDb(), req.userId!, req.body);
  res.status(201).json(template);
});

router.get('/compatibility-report', (req: AuthRequest, res: Response) => {
  res.json(getTemplateCompatibilityReport(getDb(), req.userId!, {
    course_id: typeof req.query.course_id === 'string' ? req.query.course_id : undefined,
  }));
});

router.post('/:id/copy', (req: AuthRequest, res: Response) => {
  const template = copyTemplateDefinition(getDb(), req.userId!, String(req.params.id), req.body || {});
  res.status(201).json(template);
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  res.json(updateTemplateDefinition(getDb(), req.userId!, String(req.params.id), req.body || {}));
});

router.post('/:id/activate', (req: AuthRequest, res: Response) => {
  res.json(activateTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/deprecate', (req: AuthRequest, res: Response) => {
  res.json(deprecateTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/archive', (req: AuthRequest, res: Response) => {
  res.json(archiveTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

router.post('/:id/restore', (req: AuthRequest, res: Response) => {
  res.json(restoreTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id/usage', (req: AuthRequest, res: Response) => {
  res.json(getTemplateUsage(getDb(), req.userId!, String(req.params.id)));
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  res.json(getTemplateDefinition(getDb(), req.userId!, String(req.params.id)));
});

export default router;
