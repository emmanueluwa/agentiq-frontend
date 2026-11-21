import type { StreamEvent } from "./types";

export function parseSSEEvent(rawEvent: string): StreamEvent | null {
  const lines = rawEvent.split("\n");
  let eventName: string | null = null;
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.replace("event:", "").trim();
    }

    if (line.startsWith("data:")) {
      data += line.replace("data:", "").trim();
    }
  }

  if (!eventName || !data) return null;

  try {
    return {
      event: eventName,
      data: JSON.parse(data),
    } as StreamEvent;
  } catch {
    return null;
  }
}
