import { randomUUID } from 'node:crypto';
import { qdrantClient, qdrantConfig } from '../config/qdrant.js';
import { serviceUnavailable } from '../utils/errors.js';

const UPSERT_BATCH_SIZE = 64;
let collectionReady = null;

function wrapQdrantError(error, context) {
  console.error(`[vectorService] ${context}:`, error.message);
  return serviceUnavailable(
    'Cannot reach the Qdrant vector database. Make sure the Qdrant Docker container is running.',
    'QDRANT_UNAVAILABLE'
  );
}

async function createCollectionIfNeeded() {
  const { collectionName, vectorSize, distance } = qdrantConfig;

  const { exists } = await qdrantClient.collectionExists(collectionName);

  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: vectorSize, distance },
    });
    console.log(`[vectorService] Created collection "${collectionName}" (${vectorSize} dims, ${distance})`);
  } else {
    // Make sure an existing collection matches the configured vector size.
    const info = await qdrantClient.getCollection(collectionName);
    const existingSize = info?.config?.params?.vectors?.size;
    if (existingSize !== undefined && existingSize !== vectorSize) {
      throw new Error(
        `Collection "${collectionName}" has vector size ${existingSize} but VECTOR_SIZE is ${vectorSize}. ` +
          'Delete the collection or use a different QDRANT_COLLECTION.'
      );
    }
  }

  // Index the docId field so filtered searches stay fast.
  await qdrantClient.createPayloadIndex(collectionName, {
    field_name: 'docId',
    field_schema: 'keyword',
    wait: true,
  });
}

/**
 * Create the collection (and docId index) if needed.
 * Safe to call repeatedly; on failure it will retry on the next call.
 */
export function initializeCollection() {
  if (!collectionReady) {
    collectionReady = createCollectionIfNeeded().catch((error) => {
      collectionReady = null; // allow a retry later (e.g. Qdrant started after the backend)
      throw error;
    });
  }
  return collectionReady;
}

async function ensureReady() {
  try {
    await initializeCollection();
  } catch (error) {
    throw wrapQdrantError(error, 'Collection initialization failed');
  }
}

/**
 * Store chunks and their vectors.
 * @param {{docId: string, fileName: string, chunks: {index:number,text:string}[], vectors: number[][]}} params
 */
export async function insertChunks({ docId, fileName, chunks, vectors }) {
  await ensureReady();

  const points = chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    payload: {
      docId,
      fileName,
      chunkIndex: chunk.index,
      text: chunk.text,
    },
  }));

  try {
    for (let i = 0; i < points.length; i += UPSERT_BATCH_SIZE) {
      await qdrantClient.upsert(qdrantConfig.collectionName, {
        wait: true,
        points: points.slice(i, i + UPSERT_BATCH_SIZE),
      });
    }
  } catch (error) {
    // Best effort cleanup so a half-indexed document does not linger.
    await deleteDocument(docId).catch(() => {});
    throw wrapQdrantError(error, 'Upsert failed');
  }
}

/**
 * Semantic search restricted to one document.
 * Returns [{ chunkIndex, fileName, text, similarity }] sorted best-first.
 */
export async function searchChunks({ docId, vector, limit }) {
  await ensureReady();

  try {
    const response = await qdrantClient.query(qdrantConfig.collectionName, {
      query: vector,
      limit,
      with_payload: true,
      filter: { must: [{ key: 'docId', match: { value: docId } }] },
    });

    return (response.points || []).map((point) => ({
      chunkIndex: point.payload?.chunkIndex,
      fileName: point.payload?.fileName,
      text: point.payload?.text,
      // With Cosine distance, Qdrant's score is the cosine similarity.
      similarity: point.score,
    }));
  } catch (error) {
    throw wrapQdrantError(error, 'Search failed');
  }
}

/** Remove every chunk that belongs to a document. */
export async function deleteDocument(docId) {
  await qdrantClient.delete(qdrantConfig.collectionName, {
    wait: true,
    filter: { must: [{ key: 'docId', match: { value: docId } }] },
  });
}
