import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs/promises';
import multer from 'multer';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';
import { uploadDocumentSchema } from '../validators/index.js';
import { parseDocument } from '../services/documentParser.js';
import { ZodError } from 'zod';

const router = Router();

function fileTypeFromMimetype(mimetype: string): string {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('wordprocessingml')) return 'docx';
  if (mimetype.includes('spreadsheetml')) return 'xlsx';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'text/markdown') return 'md';
  if (mimetype === 'text/plain') return 'txt';
  return 'txt';
}

// POST /api/documents/upload
router.post('/upload', upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    const data = uploadDocumentSchema.parse(req.body);

    if (!req.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const db = getDb();

    // Verify course belongs to user
    const course = db
      .prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
      .get(data.course_id, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const fileType = fileTypeFromMimetype(req.file.mimetype);

    db.prepare(
      `INSERT INTO documents (id, user_id, course_id, filename, file_path, file_type, file_size, parse_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(id, req.userId!, data.course_id, req.file.originalname, req.file.path, fileType, req.file.size, now, now);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);

    // Fire-and-forget: kick off async parsing
    parseDocument(id, req.userId!).catch((err) => {
      console.error(`Document parsing failed for ${id}:`, err);
    });

    // Strip file_path from response
    const { file_path, ...safeDoc } = document as any;
    res.status(201).json(safeDoc);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/documents?course_id=xxx
router.get('/', (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string;
  if (!courseId) {
    throw new AppError(400, 'course_id query parameter is required');
  }

  const db = getDb();
  const documents = db
    .prepare(
      `SELECT id, user_id, course_id, filename, file_type, file_size,
              parse_status, parse_channel, summary, page_count, document_type,
              chunk_count, error_message, created_at, updated_at
       FROM documents WHERE course_id = ? AND user_id = ?
       ORDER BY created_at DESC`
    )
    .all(courseId, req.userId!);

  res.json(documents);
});

// GET /api/documents/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const document = db
    .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!);

  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  const { file_path, ...safeDoc } = document as any;
  res.json(safeDoc);
});

// GET /api/documents/:id/chunks
router.get('/:id/chunks', (req: AuthRequest, res: Response) => {
  const db = getDb();

  // Verify document belongs to user
  const document = db
    .prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!);
  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  const chunks = db
    .prepare('SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index')
    .all(req.params.id);

  res.json(chunks);
});

// GET /api/documents/:id/status
router.get('/:id/status', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const document = db
    .prepare(
      'SELECT parse_status, parse_channel, page_count, chunk_count, error_message FROM documents WHERE id = ? AND user_id = ?'
    )
    .get(req.params.id, req.userId!) as {
    parse_status: string;
    parse_channel: string | null;
    page_count: number | null;
    chunk_count: number;
    error_message: string | null;
  } | undefined;

  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  res.json(document);
});

// POST /api/documents/:id/retry
router.post('/:id/retry', async (req: AuthRequest, res: Response) => {
  const docId = req.params.id as string;
  const db = getDb();
  const document = db
    .prepare('SELECT id, file_path FROM documents WHERE id = ? AND user_id = ? AND parse_status = ?')
    .get(docId, req.userId!, 'failed') as { id: string } | undefined;

  if (!document) {
    throw new AppError(404, 'Document not found or not in failed state');
  }

  db.prepare("UPDATE documents SET parse_status = 'pending', error_message = NULL, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), docId);

  parseDocument(docId, req.userId!).catch(err => {
    console.error(`Retry parse failed for ${docId}:`, err);
  });

  res.json({ message: 'Retry initiated' });
});

// DELETE /api/documents/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const db = getDb();

  const document = db
    .prepare('SELECT id, file_path FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as { id: string; file_path: string } | undefined;

  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  // Delete file from filesystem
  try {
    await unlink(document.file_path);
  } catch {
    // File may already be deleted — ignore
  }

  // Delete DB record (CASCADE handles chunks)
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);

  res.json({ message: 'Document deleted' });
});

// Handle multer errors (file too large, wrong type, etc.)
router.use((err: any, _req: AuthRequest, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err && err.message && err.message.startsWith('File type not allowed')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
