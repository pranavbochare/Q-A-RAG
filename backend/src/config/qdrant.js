import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const qdrantConfig = {
  url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
  collectionName: process.env.QDRANT_COLLECTION || 'document_chunks',
  vectorSize: toNumber(process.env.VECTOR_SIZE, 768),
  distance: 'Cosine',
};

// checkCompatibility is disabled so the client does not print a version-mismatch
// warning if your Docker image is slightly newer or older than the client.
export const qdrantClient = new QdrantClient({
  url: qdrantConfig.url,
  checkCompatibility: false,
});
