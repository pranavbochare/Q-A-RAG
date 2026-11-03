const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api").replace(
  /\/+$/,
  "",
);

/**
 * Shared fetch wrapper. Always resolves to the parsed JSON on success and
 * throws an Error with a user-friendly message on any failure.
 */
async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error("Cannot reach the backend. Make sure it is running on port 5000.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON response, handled below
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}

/** Upload a PDF, DOCX or TXT file. Resolves to { docId, fileName, totalChunks, message }. */
export function uploadDocument(file) {
  const formData = new FormData();
  formData.append("document", file);
  return request("/documents/upload", { method: "POST", body: formData });
}

/** Ask a question about an uploaded document. Resolves to { question, answer, sources }. */
export function askQuestion(docId, question) {
  return request("/query/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, question }),
  });
}
