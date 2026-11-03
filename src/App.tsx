import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

function App() {
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startStream = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput("");
    setError(null);
    setStatus("streaming");

    try {
      const response = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + chunk);
      }

      setStatus("done");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, [query]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      startStream();
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="app">
      <header>
        <h1>Finance Research</h1>
        <p>Minimal research assistant</p>
      </header>

      <main>
        <div className="input-group">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. What is the best way to invest £100,000?"
            disabled={status === "streaming"}
            rows={3}
          />
        </div>

        <div className="controls">
          <button
            onClick={startStream}
            disabled={status === "streaming" || !query.trim()}
          >
            {status === "streaming" ? "Generating…" : "Generate Report"}
          </button>

          {status === "streaming" && (
            <button className="secondary" onClick={stopStream}>
              Stop
            </button>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <pre ref={outputRef} className="output">
          {output ||
            (status === "idle" ? "Enter a query and generate a report." : "")}
        </pre>
      </main>
    </div>
  );
}

export default App;
