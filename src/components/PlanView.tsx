import { CheckCircle2, Circle } from "lucide-react";

import type { Plan } from "../plans/types";

type PlanViewProps = {
  plan: Plan;
  isUpdating: boolean;
  onToggleItem: (itemId: string) => void;
};

export function PlanView({ plan, isUpdating, onToggleItem }: PlanViewProps) {
  const completedCount = plan.items.filter(
    (item) => item.status === "done",
  ).length;

  return (
    <article className="plan-card">
      <header className="plan-card-header">
        <p className="plan-eyebrow">Action plan</p>
        <h2>{plan.title}</h2>
        <p className="plan-outcome">{plan.outcome}</p>
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
              disabled={isUpdating}
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
    </article>
  );
}
