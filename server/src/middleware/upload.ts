import multer from 'multer';
import { mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = process.env.UPLOAD_DIR || join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/markdown',
];

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // req.userId is set by auth middleware which runs before this
    const userDir = join(UPLOADS_DIR, (req as any).userId || 'unknown');
    mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

export { UPLOADS_DIR };
