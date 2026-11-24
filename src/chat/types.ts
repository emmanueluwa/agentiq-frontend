export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  serverId?: string;
  role: ChatRole;
  content: string;
  truncated?: boolean;
  partialContent?: string | null;
  sources?: ResearchSource[];
  citedSourceIds?: string[];
  invalidSourceIds?: string[];
  grounded?: boolean | null;
};

export type StreamEvent =
  | {
      event: "status";
      data: {
        state: string;
        request_id: string;
        conversation_id: string | null;
        assistant_message_id: string | null;
      };
    }
  | { event: "token"; data: { content: string } }
  | {
      event: "done";
      data: {
        request_id: string;
        conversation_id: string | null;
        assistant_message_id: string | null;
        finish_reason: string | null;
        truncated: boolean;
        usage: Record<string, unknown> | null;
        partial_assistant_content: string | null;
      };
    }
  | {
      event: "error";
      data: {
        code: string;
        message: string;
        retryable: boolean;
      };
    }
  | {
      event: "grounding";
      data: GroundingData;
    };

export type ConversationResponse = {
  id: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    truncated?: boolean;
    cited_source_ids?: string[];
    invalid_source_ids?: string[];
    grounded?: boolean | null;
    sources?: ResearchSource[];
  }>;
};

export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  source_type: string;
  published_at: string | null;
  excerpt: string;
};

export type GroundingData = {
  cited_source_ids: string[];
  invalid_source_ids: string[];
  grounded: boolean;
  sources: ResearchSource[];
};
