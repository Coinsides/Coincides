import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  deleteCanvasObject,
  getNoteCanvasPersistence,
  saveCanvasObject,
  saveBlockCanvasPlacement,
  savePageFrameCollection,
} from '../services/canvasObjects.js';
import {
  saveCanvasObjectSchema,
  saveCanvasBlockPlacementSchema,
  savePageFrameCollectionSchema,
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
  res.json(getNoteCanvasPersistence(getDb(), req.userId!, String(req.params.noteId)));
});

router.put('/by-note/:noteId/page-frame-collection', (req: AuthRequest, res: Response) => {
  try {
    const data = savePageFrameCollectionSchema.parse(req.body);
    res.json(savePageFrameCollection(
      getDb(),
      req.userId!,
      String(req.params.noteId),
      data.collection,
    ));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/by-note/:noteId/block-placements/:placementId', (req: AuthRequest, res: Response) => {
  try {
    const data = saveCanvasBlockPlacementSchema.parse(req.body);
    res.json(saveBlockCanvasPlacement(
      getDb(),
      req.userId!,
      String(req.params.noteId),
      String(req.params.placementId),
      data,
    ));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.put('/by-note/:noteId/objects/:objectId', (req: AuthRequest, res: Response) => {
  try {
    const data = saveCanvasObjectSchema.parse(req.body);
    res.json(saveCanvasObject(
      getDb(),
      req.userId!,
      String(req.params.noteId),
      String(req.params.objectId),
      data,
    ));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.delete('/by-note/:noteId/objects/:objectId', (req: AuthRequest, res: Response) => {
  res.json(deleteCanvasObject(
    getDb(),
    req.userId!,
    String(req.params.noteId),
    String(req.params.objectId),
  ));
});

export default router;
