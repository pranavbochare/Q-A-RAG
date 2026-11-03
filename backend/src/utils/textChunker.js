/**
 * Split text into overlapping chunks of roughly `chunkSize` characters.
 *
 * The splitter prefers to end a chunk at a natural boundary (paragraph break,
 * then line break, then sentence end, then space) found in the last 30% of the
 * window, so sentences are less likely to be cut in half. The next chunk starts
 * `overlap` characters before the end of the previous one.
 *
 * @param {string} text        cleaned text
 * @param {object} options
 * @param {number} options.chunkSize  target chunk length in characters
 * @param {number} options.overlap    characters shared between neighbouring chunks
 * @returns {{ index: number, text: string }[]}
 */
export function chunkText(text, { chunkSize = 1000, overlap = 100 } = {}) {
  if (!Number.isInteger(chunkSize) || chunkSize < 100) {
    throw new Error('chunkSize must be an integer of at least 100');
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be an integer between 0 and chunkSize - 1');
  }

  const source = String(text || '').trim();
  if (!source) return [];

  const chunks = [];
  const minBreakOffset = Math.floor(chunkSize * 0.7);
  let start = 0;

  while (start < source.length) {
    let end = Math.min(start + chunkSize, source.length);

    if (end < source.length) {
      const window = source.slice(start, end);
      const boundary = findBoundary(window, minBreakOffset);
      if (boundary > 0) end = start + boundary;
    }

    const piece = source.slice(start, end).trim();
    if (piece) chunks.push({ index: chunks.length, text: piece });

    if (end >= source.length) break;

    // Step forward, keeping `overlap` characters. Math.max guarantees progress.
    const nextStart = end - overlap;
    start = Math.max(nextStart, start + 1);
  }

  return chunks;
}

function findBoundary(window, minOffset) {
  const candidates = ['\n\n', '\n', '. ', '? ', '! ', '; ', ' '];
  for (const separator of candidates) {
    const position = window.lastIndexOf(separator);
    if (position >= minOffset) {
      return position + separator.length;
    }
  }
  return -1;
}
