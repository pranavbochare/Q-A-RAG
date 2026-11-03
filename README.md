# DocuMind AI - Local Document Q&A (RAG)

## Prerequisites (Windows 11)

1. Node.js 18 or newer (https://nodejs.org)
2. Ollama (https://ollama.com/download), then in PowerShell:

   ```powershell
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ollama list
   ```

3. Docker Desktop (https://www.docker.com/products/docker-desktop/), then:

   ```powershell
   docker pull qdrant/qdrant
   docker run -d --name qdrant -p 127.0.0.1:6333:6333 -p 127.0.0.1:6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant
   ```

   Dashboard: http://localhost:6333/dashboard

   If the container already exists later, start it with `docker start qdrant`.

## Run the backend

```powershell
cd document-qa-rag\backend
npm install
npm run dev
```

Expected output:

```
DocuMind AI backend listening on http://localhost:5000
[vectorService] Created collection "document_chunks" (768 dims, Cosine)
[server] Qdrant collection is ready
```

## Run the frontend

Open a second PowerShell terminal:

```powershell
cd document-qa-rag\frontend
npm install
npm run dev
```

Open http://localhost:5173. The API address is set in `frontend\.env` (`VITE_API_BASE_URL`).
Restart `npm run dev` after changing it.

## Start order each day

1. Docker Desktop, then `docker start qdrant`
2. Ollama (it normally runs in the background after install), to run the model `ollama run qwen2.5:1.5b` or `ollama run`
3. Backend terminal: `npm run dev` in `backend`
4. Frontend terminal: `npm run dev` in `frontend`

## Quick API test (PowerShell)

```powershell
curl.exe -F "document=@C:\path\to\company_policy.pdf" http://127.0.0.1:5000/api/documents/upload

curl.exe -X POST http://127.0.0.1:5000/api/query/ask -H "Content-Type: application/json" -d "{\"docId\":\"PASTE_DOC_ID\",\"question\":\"What is the leave policy?\"}"
```

## Tuning SIMILARITY_THRESHOLD

The backend logs `top similarity=... threshold=...` for every question.

1. Ask 5 questions you know are answered in your document and note the top similarity.
2. Ask 5 unrelated questions and note the top similarity.
3. Set `SIMILARITY_THRESHOLD` in `.env` between the two groups (closer to the unrelated group's highest value).

Too high: real answers get "not available". Too low: irrelevant chunks reach the LLM.
Restart the backend after changing `.env`.
