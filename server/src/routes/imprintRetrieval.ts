import { Router, type NextFunction, type Response } from 'express';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { retrieveImprintFragments } from '../services/imprintRetrieval.js';

const router = Router();

router.post('/query', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) throw new AppError(400, 'query is required');
    const k = req.body?.k === undefined ? 5 : req.body.k;
    if (!Number.isInteger(k) || k < 1 || k > 20) {
      throw new AppError(400, 'k must be an integer from 1 through 20');
    }
    res.json(await retrieveImprintFragments(getDb(), req.userId!, { query, k }));
  } catch (error) {
    next(error);
  }
});

export default router;
