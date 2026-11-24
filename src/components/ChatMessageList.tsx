import { Fragment, useState } from "react";
import { AlertTriangle, ExternalLink, Sparkles } from "lucide-react";

import type { ChatMessage, ResearchSource } from "../chat/types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isThinking: boolean;
  onContinue: (message: ChatMessage) => void;
  onCreatePlan: (message: ChatMessage) => void;
};

const CITATION_PATTERN = /\[(?:source:)?(\d+)\]/g;

function renderContent(
  content: string,
  sources: ResearchSource[],
  onSelectSource: (source: ResearchSource) => void,
) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CITATION_PATTERN)) {
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      nodes.push(content.slice(lastIndex, startIndex));
    }

    const sourceNumber = match[1];
    const source = sources.find(
      (candidate) => candidate.id === `source:${sourceNumber}`,
    );

    if (source) {
      nodes.push(
        <button
          key={`${source.id}-${startIndex}`}
          type="button"
          className="citation-chip"
          onClick={() => onSelectSource(source)}
          aria-label={`View source: ${source.title}`}
        >
          {sourceNumber}
        </button>,
      );
    } else {
      nodes.push(
        <span
          key={`invalid-${sourceNumber}-${startIndex}`}
          className="citation-chip invalid"
        >
          {sourceNumber}
        </span>,
      );
    }

    lastIndex = startIndex + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return <Fragment>{nodes}</Fragment>;
}

export function ChatMessageList({
  messages,
  isThinking,
  onContinue,
  onCreatePlan,
}: ChatMessageListProps) {
  const [selectedSource, setSelectedSource] = useState<ResearchSource | null>(
    null,
  );

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
              isThinking && message.id === messages[messages.length - 1]?.id ? (
                <span className="thinking">
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <span className="incomplete-response">
                  No response text was saved for this message.
                </span>
              )
            ) : message.role === "assistant" && message.sources ? (
              renderContent(message.content, message.sources, setSelectedSource)
            ) : (
              message.content
            )}
          </div>

          {message.role === "assistant" &&
            message.sources &&
            message.invalidSourceIds &&
            message.invalidSourceIds.length > 0 && (
              <div className="grounding-warning">
                <AlertTriangle size={15} />
                <span>
                  Some citations could not be verified and were removed.
                </span>
              </div>
            )}

          {message.role === "assistant" &&
            message.sources &&
            message.sources.length > 0 && (
              <section className="sources-panel" aria-label="Sources">
                <h3>Sources</h3>

                <ul>
                  {message.sources.map((source) => (
                    <li key={source.id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="source-title">{source.title}</span>
                        <ExternalLink size={13} />
                      </a>

                      <p className="source-meta">
                        {source.source_type}
                        {source.published_at
                          ? ` · ${new Date(
                              source.published_at,
                            ).toLocaleDateString()}`
                          : ""}
                      </p>

                      {source.excerpt && (
                        <blockquote>{source.excerpt}</blockquote>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

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

      {selectedSource && (
        <div
          className="source-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Source: ${selectedSource.title}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSource(null);
            }
          }}
        >
          <div className="source-detail">
            <header>
              <p className="eyebrow">{selectedSource.source_type}</p>
              <h2>{selectedSource.title}</h2>
            </header>

            <a
              className="source-link"
              href={selectedSource.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source <ExternalLink size={14} />
            </a>

            {selectedSource.excerpt && (
              <blockquote>{selectedSource.excerpt}</blockquote>
            )}

            <button
              type="button"
              onClick={() => setSelectedSource(null)}
              className="source-close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
