import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Sparkles, Square, RotateCcw } from "lucide-react";
import "./App.css";

const prompts = [
  "Help me think through a decision",
  "Explain a complex topic",
  "Create a practical plan",
];

type StreamEvent =
  | { event: "status"; data: { state: string; request_id: string } }
  | { event: "token"; data: { content: string } }
  | {
      event: "done";
      data: {
        request_id: string;
        finish_reason: string | null;
        truncated: boolean;
        usage: Record<string, unknown> | null;
        partial_assistant_content: string | null;
      };
    }
  | {
      event: "error";
      data: {
        code: string;
        message: string;
        retryable: boolean;
      };
    };

export default function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [partialContent, setPartialContent] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setAnswer("");
    setError(null);
    setTruncated(false);
    setPartialContent(null);
  }, []);

  const streamChat = useCallback(
    async ({
      endpoint,
      payload,
    }: {
      endpoint: string;
      payload: Record<string, unknown>;
    }) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsThinking(true);
      setError(null);
      setTruncated(false);
      setPartialContent(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? ""}${endpoint}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error("The server returned no response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const parsedEvent = parseSSEEvent(rawEvent);

            if (!parsedEvent) continue;

            if (parsedEvent.event === "token") {
              setAnswer((current) => current + parsedEvent.data.content);
            }

            if (parsedEvent.event === "error") {
              setError(parsedEvent.data.message);
            }

            if (parsedEvent.event === "done") {
              const { truncated, partial_assistant_content } = parsedEvent.data;

              setTruncated(truncated);
              setPartialContent(truncated ? partial_assistant_content : null);
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to get a response. Please try again.",
        );
      } finally {
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const ask = useCallback(() => {
    const value = query.trim();

    if (!value || isThinking) return;

    reset();
    setQuery("");

    void streamChat({
      endpoint: "/",
      payload: { query: value },
    });
  }, [query, isThinking, reset, streamChat]);

  const continueResponse = useCallback(() => {
    if (!partialContent || isThinking) return;

    const currentQuery = query.trim();

    void streamChat({
      endpoint: "/continue",
      payload: {
        query: currentQuery,
        partial_assistant_content: partialContent,
      },
    });
  }, [partialContent, isThinking, query, streamChat]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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

            {truncated && !isThinking && (
              <div className="truncation-notice">
                <p>
                  The response reached the output limit and may be incomplete.
                </p>

                <button
                  className="continue-button"
                  onClick={continueResponse}
                  disabled={!partialContent}
                >
                  <RotateCcw size={14} />
                  Continue response
                </button>
              </div>
            )}
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

function parseSSEEvent(rawEvent: string): StreamEvent | null {
  const lines = rawEvent.split("\n");

  let eventName: string | null = null;
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.replace("event:", "").trim();
    }

    if (line.startsWith("data:")) {
      data += line.replace("data:", "").trim();
    }
  }

  if (!eventName || !data) return null;

  try {
    return {
      event: eventName,
      data: JSON.parse(data),
    } as StreamEvent;
  } catch {
    return null;
  }
}
