import 'dotenv/config';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ollamaConfig = {
  baseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
  embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
  llmModel: process.env.LLM_MODEL || 'qwen2.5:3b',
  temperature: toNumber(process.env.LLM_TEMPERATURE, 0.2),
  numCtx: toNumber(process.env.LLM_NUM_CTX, 4096),
  maxTokens: toNumber(process.env.LLM_MAX_TOKENS, 512),
  embeddingTimeoutMs: toNumber(process.env.EMBEDDING_TIMEOUT_MS, 60000),
  llmTimeoutMs: toNumber(process.env.LLM_TIMEOUT_MS, 180000),
};
