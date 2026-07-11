import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import {
  getSourceTempDirectory,
  SOURCE_UPLOAD_MAX_BYTES,
} from '../services/sourceFileIntake.js';

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    const tempDir = getSourceTempDirectory();
    mkdirSync(tempDir, { recursive: true });
    callback(null, tempDir);
  },
  filename: (_req, _file, callback) => {
    callback(null, `${uuidv4()}.upload`);
  },
});

export const sourceFileUpload = multer({
  storage,
  limits: {
    fileSize: SOURCE_UPLOAD_MAX_BYTES,
    files: 1,
    fields: 8,
  },
});
