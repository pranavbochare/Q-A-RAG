import { useRef, useState } from "react";
import FileUpload from "./components/FileUpload.jsx";
import QueryInput from "./components/QueryInput.jsx";
import AnswerDisplay from "./components/AnswerDisplay.jsx";
import { askQuestion, uploadDocument } from "./services/api.js";

export default function App() {
  const [documentInfo, setDocumentInfo] = useState(null); // { docId, fileName, totalChunks }
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [queryError, setQueryError] = useState("");

  // Incremented on every upload so late responses for an older document are ignored.
  const generationRef = useRef(0);

  const handleUpload = async (file) => {
    const generation = ++generationRef.current;

    // A new upload resets everything that belonged to the previous document.
    setDocumentInfo(null);
    setResult(null);
    setQueryError("");
    setUploadError("");
    setAsking(false);
    setUploading(true);

    try {
      const data = await uploadDocument(file);
      if (generation !== generationRef.current) return;
      setDocumentInfo({
        docId: data.docId,
        fileName: data.fileName,
        totalChunks: data.totalChunks,
      });
    } catch (error) {
      if (generation !== generationRef.current) return;
      setUploadError(error.message);
    } finally {
      if (generation === generationRef.current) setUploading(false);
    }
  };

  const handleAsk = async (question) => {
    if (!documentInfo) return;
    const generation = generationRef.current;

    setAsking(true);
    setResult(null);
    setQueryError("");

    try {
      const data = await askQuestion(documentInfo.docId, question);
      if (generation !== generationRef.current) return;
      setResult({ question: data.question, answer: data.answer, sources: data.sources || [] });
    } catch (error) {
      if (generation !== generationRef.current) return;
      setQueryError(error.message);
    } finally {
      if (generation === generationRef.current) setAsking(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark" aria-hidden="true">
              RAG
            </span>
            <span className="logo-text">Q&A</span>
          </div>
          <span className="header-label">Local RAG System</span>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>Chat with your Documents</h1>
          <p>
            Upload your documents and ask questions. Get accurate answers based on your content.
          </p>
        </section>

        <div className="stack">
          <FileUpload
            onUpload={handleUpload}
            uploading={uploading}
            documentInfo={documentInfo}
            error={uploadError}
          />

          <QueryInput disabled={!documentInfo || uploading} loading={asking} onAsk={handleAsk} />

          <AnswerDisplay result={result} error={queryError} />
        </div>
      </main>

      <footer className="footer">
        Runs entirely on your machine with Ollama and Qdrant. Your documents never leave your
        computer.
      </footer>
    </div>
  );
}
