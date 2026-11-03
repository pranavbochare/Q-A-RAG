import { useRef, useState } from "react";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_SIZE_MB = 10;

function validateFile(file) {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Unsupported file type. Please choose a PDF, DOCX, or TXT file.";
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File is too large. The limit is ${MAX_SIZE_MB} MB.`;
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  return null;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ onUpload, uploading, documentInfo, error }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setSelectedFile(null);
      setLocalError(problem);
      return;
    }
    setLocalError("");
    setSelectedFile(file);
    onUpload(file);
  };

  const handleChange = (event) => {
    handleFile(event.target.files?.[0]);
    // allow choosing the same file again later
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    handleFile(event.dataTransfer.files?.[0]);
  };

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const shownError = localError || error;

  return (
    <section className="card" aria-labelledby="upload-title">
      <div className="card-header">
        <span className="step-badge">1</span>
        <h2 id="upload-title">Upload document</h2>
      </div>

      <div
        className={`dropzone${dragging ? " dragging" : ""}${uploading ? " disabled" : ""}`}
        onClick={openPicker}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openPicker())
        }
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleChange}
          hidden
          disabled={uploading}
        />
        <div className="dropzone-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
        </div>
        <p className="dropzone-title">
          <strong>Click to choose a file</strong> or drag it here
        </p>
        <p className="dropzone-hint">PDF, DOCX or TXT, up to {MAX_SIZE_MB} MB</p>
      </div>

      {selectedFile && (
        <div className="file-chip">
          <span className="file-chip-name" title={selectedFile.name}>
            {selectedFile.name}
          </span>
          <span className="file-chip-size">{formatSize(selectedFile.size)}</span>
        </div>
      )}

      {uploading && (
        <div className="status status-info" role="status">
          <span className="spinner" aria-hidden="true" />
          Processing document: extracting text, creating embeddings and indexing. This can take a
          minute on CPU...
        </div>
      )}

      {!uploading && shownError && (
        <div className="status status-error" role="alert">
          {shownError}
        </div>
      )}

      {!uploading && !shownError && documentInfo && (
        <div className="status status-success" role="status">
          <strong>Document processed successfully.</strong>
          <span className="success-meta">
            <span className="pill">{documentInfo.fileName}</span>
            <span className="pill">
              {documentInfo.totalChunks} {documentInfo.totalChunks === 1 ? "chunk" : "chunks"}
            </span>
          </span>
        </div>
      )}
    </section>
  );
}
