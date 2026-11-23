import { useCallback, useEffect, useState } from "react";

import {
  createPlan as createPlanRequest,
  deletePlan as deletePlanRequest,
  listPlans,
} from "./api";
import type { Plan, PlanItemStatus } from "./types";

type CreatePlanInput = {
  conversationId: string;
  sourceMessageId: string;
  title: string;
  outcome: string;
  items: string[];
};

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const loadedPlans = await listPlans();

        if (cancelled) return;

        setPlans(loadedPlans);

        if (loadedPlans.length > 0) {
          setActivePlanId((current) => current ?? loadedPlans[0].id);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load saved plans.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectPlan = useCallback((planId: string) => {
    setActivePlanId(planId);
  }, []);

  const createPlan = useCallback(
    async (input: CreatePlanInput): Promise<Plan> => {
      const plan = await createPlanRequest(input);

      setPlans((current) => [plan, ...current]);
      setActivePlanId(plan.id);

      return plan;
    },
    [],
  );

  const togglePlanItem = useCallback(
    async (planId: string, itemId: string) => {
      const currentPlan = plans.find((plan) => plan.id === planId);

      if (!currentPlan) {
        throw new Error("Selected plan is no longer available.");
      }

      const currentItem = currentPlan.items.find((item) => item.id === itemId);

      if (!currentItem) {
        throw new Error("Plan action is no longer available.");
      }

      const nextStatus: PlanItemStatus =
        currentItem.status === "done" ? "todo" : "done";

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ""}/plans/${planId}/items/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(`Unable to update plan item: ${response.status}`);
      }

      const updatedItem = await response.json();

      setPlans((current) =>
        current.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                items: plan.items.map((item) =>
                  item.id === itemId ? updatedItem : item,
                ),
              }
            : plan,
        ),
      );
    },
    [plans],
  );

  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    setIsDeleting(true);

    try {
      await deletePlanRequest(planId);

      setPlans((current) => {
        const remainingPlans = current.filter((plan) => plan.id !== planId);

        setActivePlanId((currentActivePlanId) => {
          if (currentActivePlanId !== planId) {
            return currentActivePlanId;
          }

          return remainingPlans[0]?.id ?? null;
        });

        return remainingPlans;
      });
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    plans,
    activePlan,
    activePlanId,
    isLoading,
    isDeleting,
    error,
    selectPlan,
    createPlan,
    togglePlanItem,
    deletePlan,
  };
}
