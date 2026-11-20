import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Sparkles, Square } from "lucide-react";
import "./App.css";

const prompts = [
  "Help me think through a decision",
  "Explain a complex topic",
  "Create a practical plan",
];

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  truncated?: boolean;
  partialContent?: string | null;
};

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

function createMessage(role: ChatRole, content = ""): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    truncated: false,
    partialContent: null,
  };
}

export default function App() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      feedRef.current?.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const updateAssistantMessage = useCallback(
    (messageId: string, update: Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, ...update } : message,
        ),
      );
    },
    [],
  );

  const streamChat = useCallback(
    async ({
      endpoint,
      payload,
      assistantMessageId,
    }: {
      endpoint: string;
      payload: Record<string, unknown>;
      assistantMessageId: string;
    }) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsThinking(true);
      setError(null);

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
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: message.content + parsedEvent.data.content,
                      }
                    : message,
                ),
              );

              scrollToBottom();
            }

            if (parsedEvent.event === "error") {
              setError(parsedEvent.data.message);
            }

            if (parsedEvent.event === "done") {
              updateAssistantMessage(assistantMessageId, {
                truncated: parsedEvent.data.truncated,
                partialContent: parsedEvent.data.truncated
                  ? parsedEvent.data.partial_assistant_content
                  : null,
              });
            }
          }
        }
      } catch (streamError) {
        if (
          streamError instanceof DOMException &&
          streamError.name === "AbortError"
        ) {
          return;
        }

        setError(
          streamError instanceof Error
            ? streamError.message
            : "Unable to get a response. Please try again.",
        );
      } finally {
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [scrollToBottom, updateAssistantMessage],
  );

  const ask = useCallback(() => {
    const value = query.trim();

    if (!value || isThinking) return;

    const userMessage = createMessage("user", value);
    const assistantMessage = createMessage("assistant");

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setQuery("");
    scrollToBottom();

    void streamChat({
      endpoint: "/",
      payload: { query: value },
      assistantMessageId: assistantMessage.id,
    });
  }, [isThinking, query, scrollToBottom, streamChat]);

  const continueResponse = useCallback(
    (message: ChatMessage) => {
      if (!message.partialContent || isThinking) return;

      const previousUserMessage = [...messages]
        .reverse()
        .find((item) => item.role === "user");

      if (!previousUserMessage) return;

      const continuationMessage = createMessage("assistant");

      setMessages((current) => [...current, continuationMessage]);
      scrollToBottom();

      void streamChat({
        endpoint: "/continue",
        payload: {
          query: previousUserMessage.content,
          partial_assistant_content: message.partialContent,
        },
        assistantMessageId: continuationMessage.id,
      });
    },
    [isThinking, messages, scrollToBottom, streamChat],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hasConversation = messages.length > 0;

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

      <div className="mentor-body">
        <section className="mentor-feed" ref={feedRef}>
          {!hasConversation && !isThinking && (
            <div className="welcome">
              <p className="eyebrow">A clearer way forward</p>
              <h1>What’s on your mind?</h1>
              <p className="subtitle">
                Thoughtful guidance for the decisions, questions, and ideas that
                matter.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`message message-${message.role}`}
            >
              {message.role === "assistant" && (
                <div className="answer-label">
                  <Sparkles size={14} /> Mentor
                </div>
              )}

              <div className="message-copy">
                {message.role === "assistant" && !message.content ? (
                  <span className="thinking">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  message.content
                )}
              </div>

              {message.role === "assistant" &&
                message.truncated &&
                !isThinking && (
                  <div className="truncation-notice">
                    <p>
                      The response reached the output limit and may be
                      incomplete.
                    </p>

                    <button
                      className="continue-button"
                      onClick={() => continueResponse(message)}
                      disabled={!message.partialContent}
                    >
                      <RotateCcw size={14} />
                      Continue response
                    </button>
                  </div>
                )}
            </article>
          ))}

          {error && <div className="error-message">{error}</div>}

          {!hasConversation && !isThinking && (
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

        <div className="composer-bar">
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

          <footer>Mentor offers guidance, not professional advice.</footer>
        </div>
      </div>
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
