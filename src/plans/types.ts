export type PlanItemStatus = "todo" | "in_progress" | "done" | "skipped";

export type PlanItem = {
  id: string;
  title: string;
  details: string;
  status: PlanItemStatus;
  position: number;
  due_at: string | null;
};

export type Plan = {
  id: string;
  conversation_id: string;
  source_message_id: string;
  title: string;
  outcome: string;
  status: string;
  items: PlanItem[];
};

export type PlanDraft = {
  title: string;
  outcome: string;
  items: string[];
};
