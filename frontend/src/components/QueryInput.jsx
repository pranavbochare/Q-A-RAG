import { useState } from "react";

const MAX_QUESTION_LENGTH = 1000;

export default function QueryInput({ disabled, loading, onAsk }) {
  const [question, setQuestion] = useState("");

  const trimmed = question.trim();
  const canSubmit = !disabled && !loading && trimmed.length > 0;

  const submit = (event) => {
    event?.preventDefault();
    if (canSubmit) onAsk(trimmed);
  };

  const handleKeyDown = (event) => {
    // Enter sends, Shift+Enter inserts a new line
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section className={`card${disabled ? " card-muted" : ""}`} aria-labelledby="ask-title">
      <div className="card-header">
        <span className="step-badge">2</span>
        <h2 id="ask-title">Ask a question</h2>
      </div>

      <form onSubmit={submit}>
        <textarea
          className="textarea"
          rows={4}
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder={
            disabled
              ? "Upload and process a document first..."
              : "e.g. What is the company’s leave policy?"
          }
          aria-label="Your question"
        />
        <div className="form-footer">
          <span className="char-count">
            {question.length}/{MAX_QUESTION_LENGTH} &middot; Enter to send, Shift+Enter for a new
            line
          </span>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {loading ? (
              <>
                <span className="spinner spinner-light" aria-hidden="true" />
                Thinking...
              </>
            ) : (
              "Ask AI"
            )}
          </button>
        </div>
      </form>

      {loading && (
        <p className="loading-note" role="status">
          Searching the document and generating an answer. A local model on CPU can take a little
          while.
        </p>
      )}
    </section>
  );
}
