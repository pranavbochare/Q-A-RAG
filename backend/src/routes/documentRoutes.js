import { Router } from 'express';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';
import { uploadDocument } from '../controllers/documentController.js';

const router = Router();

// POST /api/documents/upload  (multipart/form-data, field name: "document")
router.post('/upload', uploadSingleDocument, uploadDocument);

export default router;
