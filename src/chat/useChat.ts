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

  const [isLoadingConversation, setIsLoadingConversation] = useState(() =>
    Boolean(localStorage.getItem(CONVERSATION_ID_KEY)),
  );

  const [conversationLoadFailed, setConversationLoadFailed] = useState(false);

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

        const restoredMessages: ChatMessage[] = conversation.messages.map(
          (message) => ({
            id: message.id,
            serverId: message.id,
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
            truncated: message.truncated ?? false,
            partialContent: message.truncated ? message.content : null,
            sources: message.sources ?? [],
            citedSourceIds: message.cited_source_ids ?? [],
            invalidSourceIds: message.invalid_source_ids ?? [],
            grounded: message.grounded ?? undefined,
          }),
        );

        setConversationId(conversation.id);
        setMessages(restoredMessages);
        setConversationLoadFailed(false);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;

        setConversationLoadFailed(true);
        setError(
          loadError instanceof Error
            ? `${loadError.message}. Your saved conversation has been kept. Refresh to retry.`
            : "Unable to load the saved conversation. Your saved conversation has been kept. Refresh to retry.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingConversation(false);
        }
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
      if (abortRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;

      setIsThinking(true);
      setError(null);

      const handleEvent = (event: StreamEvent) => {
        if (controller.signal.aborted || abortRef.current !== controller) {
          return;
        }

        if (event.event === "status" || event.event === "done") {
          const {
            conversation_id: nextConversationId,
            assistant_message_id: serverMessageId,
          } = event.data;

          if (nextConversationId) {
            setConversationId(nextConversationId);
            localStorage.setItem(CONVERSATION_ID_KEY, nextConversationId);
          }

          if (serverMessageId) {
            updateAssistantMessage(assistantMessageId, {
              serverId: serverMessageId,
            });
          }
        }

        switch (event.event) {
          case "status":
            break;

          case "token":
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
            break;

          case "error":
            setError(event.data.message);
            break;

          case "grounding":
            updateAssistantMessage(assistantMessageId, {
              sources: event.data.sources,
              citedSourceIds: event.data.cited_source_ids,
              invalidSourceIds: event.data.invalid_source_ids,
              grounded: event.data.grounded,
            });
            break;

          case "done":
            updateAssistantMessage(assistantMessageId, {
              truncated: event.data.truncated,
              partialContent: event.data.truncated
                ? event.data.partial_assistant_content
                : null,
            });
            break;
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
        if (controller.signal.aborted || abortRef.current !== controller) {
          return;
        }

        setError(
          streamError instanceof Error
            ? streamError.message
            : "Unable to get a response. Please try again.",
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsThinking(false);
        }
      }
    },
    [updateAssistantMessage],
  );

  const ask = useCallback(
    (query: string) => {
      const value = query.trim();

      if (
        !value ||
        isThinking ||
        isLoadingConversation ||
        conversationLoadFailed ||
        abortRef.current
      ) {
        return;
      }

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
    [
      conversationId,
      isThinking,
      isLoadingConversation,
      conversationLoadFailed,
      streamResponse,
    ],
  );

  const continueResponse = useCallback(
    (message: ChatMessage) => {
      if (
        !message.partialContent ||
        !conversationId ||
        !message.serverId ||
        isThinking ||
        isLoadingConversation ||
        conversationLoadFailed ||
        abortRef.current
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
    [
      conversationId,
      isThinking,
      isLoadingConversation,
      conversationLoadFailed,
      streamResponse,
    ],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      const controller = abortRef.current;
      abortRef.current = null;
      controller?.abort();
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
    isLoadingConversation,
    conversationLoadFailed,
  };
}
