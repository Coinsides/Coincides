import { Router, type Response } from 'express';
import { deleteEpisode, listEpisodes } from '../agent/memory/episodes.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// Human memory management shares Settings authentication and its lightweight deletion ceremony.
const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(listEpisodes(req.userId!));
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  if (!deleteEpisode(req.userId!, String(req.params.id))) throw new AppError(404, 'Agent episode not found');
  res.status(204).end();
});

export default router;
