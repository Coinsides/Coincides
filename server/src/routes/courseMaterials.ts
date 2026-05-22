import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  listCourseMaterials,
  listMaterialSegments,
  listSourceFragments,
} from '../services/courseMaterials.js';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;
  if (!courseId) throw new AppError(400, 'course_id query parameter is required');

  const db = getDb();
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, req.userId!);
  if (!course) throw new AppError(404, 'Course not found');

  res.json(listCourseMaterials(db, req.userId!, courseId));
});

router.get('/:id/fragments', (req: AuthRequest, res: Response) => {
  const sourceMaterialId = req.params.id as string;
  const fragments = listSourceFragments(getDb(), req.userId!, sourceMaterialId);
  if (!fragments) throw new AppError(404, 'Source material not found');
  res.json(fragments);
});

router.get('/:id/segments', (req: AuthRequest, res: Response) => {
  const sourceMaterialId = req.params.id as string;
  const segments = listMaterialSegments(getDb(), req.userId!, sourceMaterialId);
  if (!segments) throw new AppError(404, 'Source material not found');
  res.json(segments);
});

export default router;
