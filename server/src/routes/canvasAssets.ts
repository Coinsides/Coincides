import { Router, Response } from 'express';
import multer from 'multer';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createCanvasImageAssetFromUpload,
  getCanvasAsset,
  getCanvasAssetBlob,
} from '../services/canvasAssets.js';

const router = Router();

const canvasImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, 'Unsupported canvas image type') as Error);
  },
});

function optionalPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed);
  }
  return null;
}

router.post('/images', canvasImageUpload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, 'No image file uploaded');
  const noteId = typeof req.body.note_id === 'string' ? req.body.note_id : '';
  if (!noteId) throw new AppError(400, 'note_id is required');
  const width = optionalPositiveInt(req.body.width);
  const height = optionalPositiveInt(req.body.height);
  const asset = createCanvasImageAssetFromUpload(getDb(), req.userId!, {
    noteId,
    file: req.file,
    width,
    height,
    metadata: { source: req.body.source === 'note_cover_upload' ? 'note_cover_upload' : 'canvas_image_upload' },
  });
  res.status(201).json(asset);
});

router.get('/:assetId', (req: AuthRequest, res: Response) => {
  res.json(getCanvasAsset(getDb(), req.userId!, String(req.params.assetId)));
});

router.get('/:assetId/blob', (req: AuthRequest, res: Response) => {
  const blob = getCanvasAssetBlob(getDb(), req.userId!, String(req.params.assetId));
  res.type(blob.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${blob.filename.replace(/"/g, '')}"`);
  blob.stream.pipe(res);
});

export default router;
