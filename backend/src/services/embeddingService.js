import { ollamaConfig } from '../config/ollama.js';
import { qdrantConfig } from '../config/qdrant.js';
import { serviceUnavailable } from '../utils/errors.js';

// nomic-embed-text is trained with task prefixes. Using them noticeably improves
// retrieval quality. The SAME model is still used for documents and questions.
const DOCUMENT_PREFIX = 'search_document: ';
const QUERY_PREFIX = 'search_query: ';

const EMBED_BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE) || 8;
const EMBED_CONCURRENCY = Number(process.env.EMBED_CONCURRENCY) || 2;

/** Call Ollama's /api/embed for a list of input strings. Returns number[][] */
async function requestEmbeddings(inputs) {
  const url = `${ollamaConfig.baseUrl}/api/embed`;
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaConfig.embeddingModel, input: inputs }),
      signal: AbortSignal.timeout(ollamaConfig.embeddingTimeoutMs),
    });
  } catch (error) {
    console.error('[embeddingService] Ollama request failed:', error.message);
    throw serviceUnavailable(
      'Cannot reach Ollama. Make sure Ollama is running on the configured address.',
      'OLLAMA_UNAVAILABLE'
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[embeddingService] Ollama returned ${response.status}: ${body}`);
    if (response.status === 404) {
      throw serviceUnavailable(
        `Embedding model "${ollamaConfig.embeddingModel}" is not installed. Run: ollama pull ${ollamaConfig.embeddingModel}`,
        'EMBEDDING_MODEL_MISSING'
      );
    }
    throw serviceUnavailable('The embedding service returned an error.', 'EMBEDDING_FAILED');
  }

  const data = await response.json();
  const embeddings = data?.embeddings;

  if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) {
    console.error('[embeddingService] Unexpected embedding response shape');
    throw serviceUnavailable('The embedding service returned an unexpected response.', 'EMBEDDING_FAILED');
  }

  for (const vector of embeddings) {
    if (!Array.isArray(vector) || vector.length !== qdrantConfig.vectorSize) {
      console.error(
        `[embeddingService] Expected ${qdrantConfig.vectorSize} dimensions but got ${vector?.length}`
      );
      throw serviceUnavailable(
        `Embedding size mismatch: expected ${qdrantConfig.vectorSize} dimensions. Check EMBEDDING_MODEL and VECTOR_SIZE.`,
        'EMBEDDING_DIMENSION_MISMATCH'
      );
    }
  }

  return embeddings;
}

/** Embed a single user question. Returns number[] */
export async function embedQuery(question) {
  const [vector] = await requestEmbeddings([`${QUERY_PREFIX}${question}`]);
  return vector;
}

/**
 * Embed many document chunks in small batches with limited concurrency,
 * so a large document does not overwhelm a CPU-only Ollama instance.
 * Returns number[][] in the same order as `texts`.
 */
export async function embedDocuments(texts) {
  const batches = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    batches.push({ offset: i, items: texts.slice(i, i + EMBED_BATCH_SIZE) });
  }

  const results = new Array(texts.length);
  let nextBatch = 0;

  async function worker() {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      const vectors = await requestEmbeddings(batch.items.map((text) => `${DOCUMENT_PREFIX}${text}`));
      vectors.forEach((vector, i) => {
        results[batch.offset + i] = vector;
      });
    }
  }

  const workerCount = Math.min(EMBED_CONCURRENCY, batches.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
