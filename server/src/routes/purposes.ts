import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { listNotePurposes, replaceNotePurposes } from '../services/purposes.js';
import { replaceNotePurposesSchema } from '../validators/index.js';

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

export default router;
