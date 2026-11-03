import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import documentRoutes from './routes/documentRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import { initializeCollection } from './services/vectorService.js';
import { MAX_FILE_SIZE_BYTES } from './middleware/uploadMiddleware.js';
import { AppError } from './utils/errors.js';

const PORT = Number(process.env.PORT) || 5000;
// Comma-separated list of allowed frontend origins.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/documents', documentRoutes);
app.use('/api/query', queryRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// Central error handler. Only AppError messages (and known upload/JSON errors)
// reach the client; everything else becomes a generic message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const limitMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
      return res
        .status(413)
        .json({ success: false, error: `File is too large. The limit is ${limitMb} MB.`, code: 'FILE_TOO_LARGE' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res
        .status(400)
        .json({ success: false, error: 'Upload the file in the "document" field.', code: 'UNEXPECTED_FIELD' });
    }
    return res.status(400).json({ success: false, error: 'The upload request was invalid.', code: 'UPLOAD_ERROR' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Request body is not valid JSON.', code: 'INVALID_JSON' });
  }

  console.error('[server] Unhandled error:', err);
  return res.status(500).json({ success: false, error: 'Something went wrong on the server.', code: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => {
  console.log(`DocuMind AI backend listening on http://localhost:${PORT}`);

  // Try to prepare the Qdrant collection at startup. If Qdrant is not up yet,
  // the server still starts and retries on the first upload or question.
  initializeCollection().then(
    () => console.log('[server] Qdrant collection is ready'),
    (error) => console.warn(`[server] Qdrant not ready yet (${error.message}). Will retry on first use.`)
  );
});
