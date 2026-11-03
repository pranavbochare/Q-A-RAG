import 'dotenv/config';
import multer from 'multer';
import path from 'node:path';
import { badRequest } from '../utils/errors.js';
import { SUPPORTED_EXTENSIONS } from '../utils/textExtractor.js';

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;
export const MAX_FILE_SIZE_BYTES = maxFileSizeMb * 1024 * 1024;

// Files are kept in memory only (never written to disk) and then discarded
// after text extraction. The size limit keeps memory use bounded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    // First, cheap check on the extension. The real content check (magic bytes)
    // happens later in textExtractor.detectFileType().
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return callback(badRequest('Unsupported file type. Please upload a PDF, DOCX, or TXT file.', 'UNSUPPORTED_FILE_TYPE'));
    }
    return callback(null, true);
  },
});

/** Accepts a single file in the multipart field named "document". */
export const uploadSingleDocument = upload.single('document');
