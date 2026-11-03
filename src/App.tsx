import { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import "./App.css";

const prompts = [
  "Help me think through a decision",
  "Explain a complex topic",
  "Create a practical plan",
];

export default function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ask = async () => {
    const value = query.trim();
    if (!value || isThinking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsThinking(true);
    setAnswer("");
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ""}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        setAnswer(
          (current) => current + decoder.decode(chunk, { stream: true }),
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to get a response");
      setAnswer("");
    } finally {
      setIsThinking(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <main className="mentor-shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={15} />
          </span>
          <span>Mentor</span>
        </div>
        <span className="status-dot">Private workspace</span>
      </nav>

      <section className={`mentor-content ${answer ? "has-answer" : ""}`}>
        {!answer && !isThinking && (
          <div className="welcome">
            <p className="eyebrow">A clearer way forward</p>
            <h1>What’s on your mind?</h1>
            <p className="subtitle">
              Thoughtful guidance for the decisions, questions, and ideas that
              matter.
            </p>
          </div>
        )}

        {(answer || isThinking) && (
          <article className="answer-card">
            <div className="answer-label">
              <Sparkles size={14} /> Mentor
            </div>
            <div className="answer-copy">
              {answer || (
                <span className="thinking">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </div>
          </article>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="composer-wrap">
          <textarea
            aria-label="Your question"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                ask();
              }
            }}
            placeholder="Ask anything..."
            rows={3}
            disabled={isThinking}
          />
          <div className="composer-footer">
            <span className="hint">
              Press Enter to ask · Shift + Enter for a new line
            </span>
            <button
              className="send-button"
              onClick={isThinking ? stop : ask}
              disabled={!query.trim() && !isThinking}
              aria-label={isThinking ? "Stop" : "Ask Mentor"}
            >
              {isThinking ? (
                <Square size={16} fill="currentColor" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
        </div>

        {!answer && !isThinking && (
          <div className="prompt-list" aria-label="Suggested prompts">
            {prompts.map((prompt) => (
              <button key={prompt} onClick={() => setQuery(prompt)}>
                {prompt}
                <ArrowUp size={14} />
              </button>
            ))}
          </div>
        )}
      </section>

      <footer>Mentor offers guidance, not professional advice.</footer>
    </main>
  );
}
