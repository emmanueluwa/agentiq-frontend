import { useState } from "react";
import { Check, X } from "lucide-react";

import type { ChatMessage } from "../chat/types";
import type { PlanDraft } from "../plans/types";

type PlanDraftProps = {
  initialDraft: PlanDraft;
  sourceMessage: ChatMessage;
  isSaving: boolean;
  error: string | null;
  onSave: (draft: PlanDraft) => void;
  onCancel: () => void;
};

export function PlanDraft({
  initialDraft,
  sourceMessage,
  isSaving,
  error,
  onSave,
  onCancel,
}: PlanDraftProps) {
  const [title, setTitle] = useState(initialDraft.title ?? "");
  const [outcome, setOutcome] = useState(initialDraft.outcome ?? "");
  const [items, setItems] = useState<string[]>(
    (initialDraft.items ?? []).map((item) => item ?? ""),
  );

  const addItem = () => {
    setItems((current) => [...current, ""]);
  };

  const updateItem = (index: number, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const save = () => {
    const cleanedItems = items
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!title.trim() || !outcome.trim() || cleanedItems.length === 0) {
      return;
    }

    onSave({
      title: title.trim(),
      outcome: outcome.trim(),
      items: cleanedItems,
    });
  };

  return (
    <section className="plan-draft">
      <header>
        <h2>Create plan</h2>
        <p>
          Review and edit this plan before saving it. It will become a separate
          workspace object, not another chat message.
        </p>
      </header>

      <label>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSaving}
        />
      </label>

      <label>
        Outcome
        <textarea
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          placeholder="What should be true when this plan is complete?"
          rows={3}
          disabled={isSaving}
        />
      </label>

      <div className="plan-items">
        <h3>Next actions</h3>

        {items.map((item, index) => (
          <div key={index} className="plan-item-row">
            <input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder="Define one concrete next action"
              disabled={isSaving}
            />

            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={isSaving || items.length === 1}
              aria-label="Remove action"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button type="button" onClick={addItem} disabled={isSaving}>
          Add action
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <footer>
        <button onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>

        <button
          onClick={save}
          disabled={
            isSaving ||
            !title.trim() ||
            !outcome.trim() ||
            !items.some(
              (item) => typeof item === "string" && item.trim().length > 0,
            )
          }
        >
          <Check size={14} />
          Save plan
        </button>
      </footer>

      <p className="plan-source">
        Source: assistant response from{" "}
        {sourceMessage.serverId ? "this conversation" : "an unsaved message"}
      </p>
    </section>
  );
}
