function similarityLevel(score) {
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export default function AnswerDisplay({ result, error }) {
  if (error) {
    return (
      <section className="card" aria-live="polite">
        <div className="status status-error" role="alert">
          {error}
        </div>
      </section>
    );
  }

  if (!result) return null;

  const { question, answer, sources } = result;

  return (
    <section className="card" aria-live="polite">
      <div className="answer-block">
        <p className="label">Your question</p>
        <p className="question-text">{question}</p>

        <p className="label label-accent">Answer</p>
        <div className="answer-text">{answer}</div>
      </div>

      <hr className="divider" />

      <div className="sources-block">
        <div className="sources-header">
          <h3>Supporting sources</h3>
          <span className="pill pill-accent">
            {sources.length} {sources.length === 1 ? "source" : "sources"} retrieved
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="muted">
            No sufficiently relevant passages were found in the document, so no answer was
            generated.
          </p>
        ) : (
          <ul className="source-list">
            {sources.map((source, i) => (
              <li key={`${source.chunkIndex}-${i}`} className="source-item">
                <div className="source-meta">
                  <span className="pill">Chunk #{source.chunkIndex}</span>
                  <span
                    className={`pill similarity similarity-${similarityLevel(source.similarity)}`}>
                    Similarity {(source.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="source-text">{source.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
