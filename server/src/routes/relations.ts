import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  createRelation,
  getRelation,
  listRelations,
  listRelationTypes,
  reaffirmRelation,
  revokeRelation,
} from '../services/relations.js';
import {
  createRelationSchema,
  listRelationsQuerySchema,
  relationCommandSchema,
} from '../validators/index.js';

const router = Router();

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

router.get('/types', (_req: AuthRequest, res: Response) => {
  res.json(listRelationTypes());
});

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const query = listRelationsQuerySchema.parse(req.query);
    res.json(listRelations(getDb(), req.userId!, query));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createRelationSchema.parse(req.body);
    res.status(201).json(createRelation(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.get('/:relationId', (req: AuthRequest, res: Response) => {
  res.json(getRelation(getDb(), req.userId!, String(req.params.relationId)));
});

router.post('/:relationId/revoke', (req: AuthRequest, res: Response) => {
  try {
    relationCommandSchema.parse(req.body ?? {});
    res.json(revokeRelation(getDb(), req.userId!, String(req.params.relationId)));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/:relationId/reaffirm', (req: AuthRequest, res: Response) => {
  try {
    relationCommandSchema.parse(req.body ?? {});
    res.json(reaffirmRelation(getDb(), req.userId!, String(req.params.relationId)));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

export default router;
