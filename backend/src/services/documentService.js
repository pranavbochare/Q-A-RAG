import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { extractText } from '../utils/textExtractor.js';
import { chunkText } from '../utils/textChunker.js';
import { embedDocuments } from './embeddingService.js';
import { insertChunks } from './vectorService.js';
import { unprocessable } from '../utils/errors.js';

const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 1000;
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP) || 100;
const MAX_CHUNKS = Number(process.env.MAX_CHUNKS) || 500;

/** Keep only the base name, strip control characters, and limit the length. */
function sanitizeFileName(name) {
  const base = path.basename(String(name || 'document'));
  return base.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 200) || 'document';
}

/**
 * Full indexing pipeline:
 * extract -> clean -> chunk -> embed -> store in Qdrant.
 *
 * @param {{ buffer: Buffer, originalName: string }} file
 * @returns {Promise<{ docId: string, fileName: string, totalChunks: number }>}
 */
export async function processDocument({ buffer, originalName }) {
  const fileName = sanitizeFileName(originalName);

  // 1. Extract and clean text (also verifies the real file type)
  const { text } = await extractText(buffer, fileName);

  // 2. Split into overlapping chunks
  const chunks = chunkText(text, { chunkSize: CHUNK_SIZE, overlap: CHUNK_OVERLAP });
  if (chunks.length === 0) {
    throw unprocessable('The document does not contain any usable text.', 'EMPTY_DOCUMENT');
  }
  if (chunks.length > MAX_CHUNKS) {
    throw unprocessable(
      `This document is too large (${chunks.length} chunks). The limit is ${MAX_CHUNKS} chunks. Please upload a smaller document.`,
      'DOCUMENT_TOO_LARGE'
    );
  }

  // 3. Embed every chunk (batched, limited concurrency)
  const vectors = await embedDocuments(chunks.map((chunk) => chunk.text));

  // 4. Store vectors + metadata under a fresh document id
  const docId = randomUUID();
  await insertChunks({ docId, fileName, chunks, vectors });

  console.log(`[documentService] Indexed "${fileName}" as ${docId} (${chunks.length} chunks)`);
  return { docId, fileName, totalChunks: chunks.length };
}
