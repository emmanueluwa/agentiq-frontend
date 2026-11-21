import { parseSSEEvent } from "./sse";
import type { ConversationResponse, StreamEvent } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getConversation(
  conversationId: string,
): Promise<ConversationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}`,
  );

  if (!response.ok) {
    throw new Error(`Unable to load conversation: ${response.status}`);
  }

  return response.json();
}

export async function streamChatRequest({
  endpoint,
  payload,
  signal,
  onEvent,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("The server returned no response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const parsedEvent = parseSSEEvent(rawEvent);

      if (parsedEvent) {
        onEvent(parsedEvent);
      }
    }
  }
}
