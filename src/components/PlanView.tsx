import { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";

import type { Plan } from "../plans/types";

type PlanViewProps = {
  plan: Plan;
  isUpdating: boolean;
  isDeleting: boolean;
  onToggleItem: (itemId: string) => void;
  onDelete: (planId: string) => void;
};

export function PlanView({
  plan,
  isUpdating,
  isDeleting,
  onToggleItem,
  onDelete,
}: PlanViewProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const completedCount = plan.items.filter(
    (item) => item.status === "done",
  ).length;

  return (
    <article className="plan-card">
      <header className="plan-card-header">
        <div className="plan-card-title">
          <div>
            <p className="plan-eyebrow">Action plan</p>
            <h2>{plan.title}</h2>
            <p className="plan-outcome">{plan.outcome}</p>
          </div>

          <button
            type="button"
            className="delete-plan-button"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isDeleting || isUpdating}
            aria-haspopup="dialog"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </header>

      <div className="plan-progress">
        <span>
          {completedCount} of {plan.items.length} complete
        </span>

        <div
          className="plan-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={plan.items.length}
          aria-valuenow={completedCount}
        >
          <div
            className="plan-progress-fill"
            style={{
              width: `${
                plan.items.length
                  ? (completedCount / plan.items.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <ul className="plan-items">
        {plan.items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`plan-item ${item.status === "done" ? "done" : ""}`}
              onClick={() => onToggleItem(item.id)}
              disabled={isUpdating || isDeleting}
            >
              {item.status === "done" ? (
                <CheckCircle2 size={17} />
              ) : (
                <Circle size={17} />
              )}

              <span>{item.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {isConfirmingDelete && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsConfirmingDelete(false);
            }
          }}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
            aria-describedby="delete-plan-description"
          >
            <h2 id="delete-plan-title">Delete plan?</h2>
            <p id="delete-plan-description">
              “{plan.title}” and all of its actions will be permanently removed.
              This cannot be undone.
            </p>

            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  onDelete(plan.id);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
