import type { Plan, PlanItemStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function listPlans(): Promise<Plan[]> {
  const response = await fetch(`${API_BASE_URL}/plans`);

  if (!response.ok) {
    throw new Error(`Unable to load plans: ${response.status}`);
  }

  return response.json();
}

export async function createPlan({
  conversationId,
  sourceMessageId,
  title,
  outcome,
  items,
}: {
  conversationId: string;
  sourceMessageId: string;
  title: string;
  outcome: string;
  items: string[];
}): Promise<Plan> {
  const response = await fetch(`${API_BASE_URL}/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      source_message_id: sourceMessageId,
      title,
      outcome,
      items: items.map((title) => ({
        title,
        details: "",
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to create plan: ${response.status}`);
  }

  return response.json();
}

export type PlanDraftApiResponse = {
  title: string;
  outcome: string;
  items: Array<{
    title: string;
    details: string;
  }>;
};

export async function createPlanDraft({
  conversationId,
  sourceMessageId,
}: {
  conversationId: string;
  sourceMessageId: string;
}): Promise<PlanDraftApiResponse> {
  const response = await fetch(`${API_BASE_URL}/plans/drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      source_message_id: sourceMessageId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to create a plan draft: ${response.status}`);
  }

  return response.json();
}

export async function updatePlanItemStatus({
  planId,
  itemId,
  status,
}: {
  planId: string;
  itemId: string;
  status: PlanItemStatus;
}): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/plans/${planId}/items/${itemId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to update plan item: ${response.status}`);
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Unable to delete plan: ${response.status}`);
  }
}
