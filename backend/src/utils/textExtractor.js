// IMPORTANT: import the library file directly. The package entry point
// ("pdf-parse") runs a debug routine that reads a missing test PDF when it is
// imported from an ES module, which crashes the server at startup.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import path from 'node:path';
import { badRequest, unprocessable } from './errors.js';

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

/**
 * Detect the real file type from the file's leading bytes ("magic bytes")
 * instead of trusting the client-supplied MIME type or extension.
 * Returns 'pdf' | 'docx' | 'txt' | null
 */
export function detectFileType(buffer, originalName = '') {
  if (!buffer || buffer.length < 4) return null;

  const ext = path.extname(originalName).toLowerCase();

  // PDF files start with "%PDF"
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') {
    return ext === '.pdf' ? 'pdf' : null;
  }

  // DOCX files are ZIP archives: "PK\x03\x04"
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return ext === '.docx' ? 'docx' : null;
  }

  // TXT: must have a .txt extension and look like text (no NUL bytes in the first 8 KB)
  if (ext === '.txt') {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
    return sample.includes(0) ? null : 'txt';
  }

  return null;
}

async function extractPdf(buffer) {
  try {
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (error) {
    console.error('[textExtractor] PDF parse failed:', error.message);
    throw unprocessable(
      'Could not read this PDF. It may be corrupted or password-protected.',
      'PDF_PARSE_FAILED'
    );
  }
}

async function extractDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('[textExtractor] DOCX parse failed:', error.message);
    throw unprocessable('Could not read this DOCX file. It may be corrupted.', 'DOCX_PARSE_FAILED');
  }
}

function extractTxt(buffer) {
  let text = buffer.toString('utf8');
  // Strip a UTF-8 byte order mark if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

/**
 * Normalize extracted text: unify line endings, remove control characters,
 * collapse repeated spaces and excessive blank lines.
 */
export function cleanText(rawText) {
  return String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    // remove control characters except tab and newline
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // non-breaking space and tabs become a normal space
    .replace(/[ \t]/g, ' ')
    // trailing spaces before a newline
    .replace(/ +\n/g, '\n')
    // collapse runs of spaces
    .replace(/ {2,}/g, ' ')
    // no more than one blank line in a row
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Validate the file type and return cleaned text.
 * @param {Buffer} buffer
 * @param {string} originalName
 */
export async function extractText(buffer, originalName) {
  const type = detectFileType(buffer, originalName);
  if (!type) {
    throw badRequest(
      'Invalid file. The file content does not match a supported PDF, DOCX, or TXT document.',
      'INVALID_FILE_TYPE'
    );
  }

  let rawText;
  if (type === 'pdf') rawText = await extractPdf(buffer);
  else if (type === 'docx') rawText = await extractDocx(buffer);
  else rawText = extractTxt(buffer);

  const text = cleanText(rawText);
  if (!text) {
    throw unprocessable(
      'No readable text was found in this document. Scanned or image-only files are not supported yet.',
      'EMPTY_DOCUMENT'
    );
  }

  return { text, fileType: type };
}
