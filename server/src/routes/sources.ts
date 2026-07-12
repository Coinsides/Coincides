import { Router, type NextFunction, type Response } from 'express';
import multer from 'multer';
import { z, ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sourceFileUpload } from '../middleware/sourceUpload.js';
import {
  discardSourceTempFile,
  getSourceBlob,
  getSourceRecordDetail,
  intakeSourceTempFile,
  listSourceRecords,
  precheckSourceHash,
  type SourceOriginEntryKind,
} from '../services/sourceFileIntake.js';
import { scheduleSourceMaterialization } from '../services/sourceMaterialization.js';
import {
  deleteSourceWithCompensation,
  getSourceDeletionImpact,
} from '../services/sourceLifecycle.js';

const router = Router();

const originEntryKindSchema = z.enum(['project_upload', 'library_upload', 'import']);
const targetSchema = z.object({
  course_id: z.string().uuid().optional(),
  origin_entry_kind: originEntryKindSchema.default('project_upload'),
}).superRefine((value, context) => {
  if (value.origin_entry_kind !== 'library_upload' && !value.course_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['course_id'],
      message: 'course_id is required outside Source Library upload',
    });
  }
});

const precheckSchema = z.object({
  course_id: z.string().uuid().optional(),
  origin_entry_kind: originEntryKindSchema.default('project_upload'),
  content_hash: z.string().regex(/^[a-fA-F0-9]{64}$/, 'content_hash must be a SHA-256 hex digest'),
}).superRefine((value, context) => {
  if (value.origin_entry_kind !== 'library_upload' && !value.course_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['course_id'],
      message: 'course_id is required outside Source Library upload',
    });
  }
});

function nextValidationError(error: unknown, next: NextFunction): void {
  if (error instanceof ZodError) {
    next(new AppError(400, 'Validation error', error.errors));
    return;
  }
  next(error);
}

function contentDisposition(value: 'inline' | 'attachment', filename: string): string {
  const clean = filename.replace(/[\u0000\r\n"\\]/g, '').trim() || 'source';
  const asciiFallback = clean.replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(clean).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
  return `${value}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

router.post('/precheck', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = precheckSchema.parse(req.body);
    res.json(precheckSourceHash(getDb(), req.userId!, input));
  } catch (error) {
    nextValidationError(error, next);
  }
});

router.post(
  '/upload',
  sourceFileUpload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'No Source file uploaded', { code: 'file_required' });
      const target = targetSchema.parse(req.body);
      const result = await intakeSourceTempFile(getDb(), req.userId!, {
        course_id: target.course_id,
        origin_entry_kind: target.origin_entry_kind as SourceOriginEntryKind,
        file: req.file,
        file_mtime: typeof req.body.file_mtime === 'string' ? req.body.file_mtime : null,
      });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      if (req.file?.path) {
        try {
          discardSourceTempFile(req.file.path);
        } catch {
          // The intake service owns managed-temp cleanup; never unlink an unmanaged path here.
        }
      }
      nextValidationError(error, next);
    }
  },
);

router.get('/', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.course_id;
    if (courseId !== undefined && (typeof courseId !== 'string' || !z.string().uuid().safeParse(courseId).success)) {
      throw new AppError(400, 'course_id must be a UUID');
    }
    res.json(listSourceRecords(getDb(), req.userId!, {
      course_id: typeof courseId === 'string' ? courseId : undefined,
    }));
  } catch (error) {
    next(error);
  }
});

function scheduleMaterialization(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const result = scheduleSourceMaterialization(
      getDb(),
      req.userId!,
      String(req.params.sourceId),
    );
    res.status(result.claimed ? 202 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

router.post('/:sourceId/materialize', scheduleMaterialization);
router.post('/:sourceId/retry', scheduleMaterialization);

router.get('/:sourceId/delete-impact', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(getSourceDeletionImpact(getDb(), req.userId!, String(req.params.sourceId)));
  } catch (error) {
    next(error);
  }
});

router.delete('/:sourceId', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(deleteSourceWithCompensation(getDb(), req.userId!, String(req.params.sourceId)));
  } catch (error) {
    next(error);
  }
});

router.get('/:sourceId', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(getSourceRecordDetail(getDb(), req.userId!, String(req.params.sourceId)));
  } catch (error) {
    next(error);
  }
});

router.get('/:sourceId/blob', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const blob = getSourceBlob(getDb(), req.userId!, String(req.params.sourceId));
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.type(blob.mime_type);
    res.setHeader('Content-Length', String(blob.byte_size));
    res.setHeader('Content-Disposition', contentDisposition(disposition, blob.filename));
    blob.stream.on('error', next);
    blob.stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

router.use((error: unknown, _req: AuthRequest, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'Source file exceeds the 50MB upload limit',
        details: { code: 'file_too_large' },
      });
      return;
    }
    res.status(400).json({
      error: 'Source upload could not be accepted',
      details: { code: 'multipart_upload_error', multer_code: error.code },
    });
    return;
  }
  next(error);
});

export default router;
