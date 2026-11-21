import { useCallback, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import "./App.css";

import { ChatMessageList } from "./components/ChatMessageList";
import { Composer } from "./components/Composer";
import { useChat } from "./chat/useChat";

const prompts = [
  "Help me think through a decision",
  "Explain a complex topic",
  "Create a practical plan",
];

export default function App() {
  const [query, setQuery] = useState("");

  const { messages, isThinking, error, ask, continueResponse, stop } =
    useChat();

  const feedRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      feedRef.current?.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
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

          <ChatMessageList
            messages={messages}
            isThinking={isThinking}
            onContinue={(message) => {
              continueResponse(message);
              scrollToBottom();
            }}
          />

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

        <Composer
          query={query}
          isThinking={isThinking}
          onQueryChange={setQuery}
          onSubmit={() => {
            ask(query);
            setQuery("");
            scrollToBottom();
          }}
          onStop={stop}
        />
      </div>
    </main>
  );
}
