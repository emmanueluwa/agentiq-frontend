import { ArrowUp, Square } from "lucide-react";

type ComposerProps = {
  query: string;
  isThinking: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
};

export function Composer({
  query,
  isThinking,
  onQueryChange,
  onSubmit,
  onStop,
}: ComposerProps) {
  return (
    <div className="composer-bar">
      <div className="composer-wrap">
        <textarea
          aria-label="Your question"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              onSubmit();
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
            onClick={isThinking ? onStop : onSubmit}
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
  );
}
