import { Sparkles } from "lucide-react";

import type { ChatMessage } from "../chat/types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isThinking: boolean;
  onContinue: (message: ChatMessage) => void;
  onCreatePlan: (message: ChatMessage) => void;
};

export function ChatMessageList({
  messages,
  isThinking,
  onContinue,
  onCreatePlan,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((message) => (
        <article key={message.id} className={`message message-${message.role}`}>
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

          {message.role === "assistant" && message.truncated && !isThinking && (
            <div className="truncation-notice">
              <p>
                The response reached the output limit and may be incomplete.
              </p>

              <button
                className="continue-button"
                onClick={() => onContinue(message)}
                disabled={!message.partialContent}
              >
                Continue response
              </button>
            </div>
          )}
          {message.role === "assistant" && message.content && (
            <button
              className="create-plan-button"
              onClick={() => onCreatePlan(message)}
              disabled={isThinking || !message.serverId}
            >
              Create plan
            </button>
          )}
        </article>
      ))}
    </>
  );
}
