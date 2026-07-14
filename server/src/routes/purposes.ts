import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getPurposeCompiledScope,
  listNotePurposes,
  replaceNotePurposes,
  searchPurposeItems,
} from '../services/purposes.js';
import {
  purposeItemSearchQuerySchema,
  replaceNotePurposesSchema,
} from '../validators/index.js';

const router = Router();

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

router.get('/by-note/:noteId', (req: AuthRequest, res: Response) => {
  res.json({
    purposes: listNotePurposes(getDb(), req.userId!, String(req.params.noteId)),
  });
});

router.put('/by-note/:noteId', (req: AuthRequest, res: Response) => {
  try {
    const data = replaceNotePurposesSchema.parse(req.body);
    res.json({
      purposes: replaceNotePurposes(
        getDb(),
        req.userId!,
        String(req.params.noteId),
        data.purposes,
      ),
    });
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.get('/:purposeId/compiled-scope', (req: AuthRequest, res: Response) => {
  try {
    const query = purposeItemSearchQuerySchema.parse(req.query);
    const purposeId = String(req.params.purposeId);
    const scope = query.q || query.limit
      ? searchPurposeItems(getDb(), req.userId!, purposeId, {
          query: query.q,
          limit: query.limit,
        })
      : getPurposeCompiledScope(getDb(), req.userId!, purposeId);
    res.json(scope);
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

export default router;
