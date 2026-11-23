import { useCallback, useEffect, useRef, useState } from "react";

import { getConversation, streamChatRequest } from "./api";
import type { ChatMessage, StreamEvent } from "./types";

const CONVERSATION_ID_KEY = "agentiq:conversation-id";

function createMessage(role: ChatMessage["role"], content = ""): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    truncated: false,
    partialContent: null,
  };
}

export function useChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const updateAssistantMessage = useCallback(
    (messageId: string, update: Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, ...update } : message,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    const storedConversationId = localStorage.getItem(CONVERSATION_ID_KEY);

    if (!storedConversationId) return;

    let cancelled = false;

    const loadConversation = async () => {
      try {
        const conversation = await getConversation(storedConversationId);

        if (cancelled) return;

        setConversationId(conversation.id);
        setMessages(
          conversation.messages.map((message) => ({
            id: message.id,
            serverId: message.id,
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
            truncated: message.truncated ?? false,
            partialContent: message.truncated ? message.content : null,
          })),
        );
      } catch {
        localStorage.removeItem(CONVERSATION_ID_KEY);
      }
    };

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, []);

  const streamResponse = useCallback(
    async ({
      endpoint,
      payload,
      assistantMessageId,
    }: {
      endpoint: string;
      payload: Record<string, unknown>;
      assistantMessageId: string;
    }) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsThinking(true);
      setError(null);

      const handleEvent = (event: StreamEvent) => {
        if (event.event === "status") {
          if (event.data.conversation_id) {
            setConversationId(event.data.conversation_id);
            localStorage.setItem(
              CONVERSATION_ID_KEY,
              event.data.conversation_id,
            );
          }

          if (event.data.assistant_message_id) {
            updateAssistantMessage(assistantMessageId, {
              serverId: event.data.assistant_message_id,
            });
          }
        }

        if (event.event === "token") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: message.content + event.data.content,
                  }
                : message,
            ),
          );
        }

        if (event.event === "error") {
          setError(event.data.message);
        }

        if (event.event === "done") {
          updateAssistantMessage(assistantMessageId, {
            truncated: event.data.truncated,
            partialContent: event.data.truncated
              ? event.data.partial_assistant_content
              : null,
          });
        }
      };

      try {
        await streamChatRequest({
          endpoint,
          payload,
          signal: controller.signal,
          onEvent: handleEvent,
        });
      } catch (streamError) {
        if (
          streamError instanceof DOMException &&
          streamError.name === "AbortError"
        ) {
          return;
        }

        setError(
          streamError instanceof Error
            ? streamError.message
            : "Unable to get a response. Please try again.",
        );
      } finally {
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [updateAssistantMessage],
  );

  const ask = useCallback(
    (query: string) => {
      const value = query.trim();

      if (!value || isThinking) return;

      const userMessage = createMessage("user", value);
      const assistantMessage = createMessage("assistant");

      setMessages((current) => [...current, userMessage, assistantMessage]);

      void streamResponse({
        endpoint: "/",
        payload: {
          query: value,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        },
        assistantMessageId: assistantMessage.id,
      });
    },
    [conversationId, isThinking, streamResponse],
  );

  const continueResponse = useCallback(
    (message: ChatMessage) => {
      if (
        !message.partialContent ||
        !conversationId ||
        !message.serverId ||
        isThinking
      ) {
        return;
      }

      const continuationMessage = createMessage("assistant");

      setMessages((current) => [...current, continuationMessage]);

      void streamResponse({
        endpoint: "/continue",
        payload: {
          conversation_id: conversationId,
          assistant_message_id: message.serverId,
        },
        assistantMessageId: continuationMessage.id,
      });
    },
    [conversationId, isThinking, streamResponse],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    conversationId,
    messages,
    isThinking,
    error,
    ask,
    continueResponse,
    stop,
  };
}
