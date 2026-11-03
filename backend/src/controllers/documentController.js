import { processDocument } from '../services/documentService.js';
import { badRequest } from '../utils/errors.js';

export async function uploadDocument(req, res) {
  if (!req.file) {
    throw badRequest('No file received. Send a PDF, DOCX, or TXT file in the "document" field.', 'NO_FILE');
  }

  const { docId, fileName, totalChunks } = await processDocument({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
  });

  res.status(201).json({
    success: true,
    docId,
    fileName,
    totalChunks,
    message: 'Document processed successfully',
  });
}
