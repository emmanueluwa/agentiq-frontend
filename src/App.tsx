import { useCallback, useRef, useState } from "react";
import {
  ArrowUp,
  ListChecks,
  MessageSquare,
  PanelsTopLeft,
  Sparkles,
} from "lucide-react";
import "./App.css";

import type { ChatMessage } from "./chat/types";
import { ChatMessageList } from "./components/ChatMessageList";
import { Composer } from "./components/Composer";
import { useChat } from "./chat/useChat";

import { PlanDraft } from "./components/PlanDraft";
import { PlanView } from "./components/PlanView";
import { createPlanDraft } from "./plans/api";
import { usePlans } from "./plans/usePlans";
import type { PlanDraft as PlanDraftData } from "./plans/types";

type WorkspaceView = "chat" | "both" | "plan";

const prompts = [
  "Help me think through a decision",
  "Explain a complex topic",
  "Create a practical plan",
];

export default function App() {
  const [query, setQuery] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("both");

  const {
    conversationId,
    messages,
    isThinking,
    error,
    ask,
    continueResponse,
    stop,
  } = useChat();

  const {
    plans,
    activePlan,
    activePlanId,
    isLoading: isLoadingPlans,
    error: plansError,
    selectPlan,
    createPlan,
    togglePlanItem,
  } = usePlans();

  const [planSourceMessage, setPlanSourceMessage] =
    useState<ChatMessage | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraftData | null>(null);
  const [isLoadingPlanDraft, setIsLoadingPlanDraft] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement | null>(null);

  const draftRequestInFlight = useRef(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      feedRef.current?.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const hasConversation = messages.length > 0;

  const openPlanDraft = async (message: ChatMessage) => {
    if (
      !conversationId ||
      !message.serverId ||
      draftRequestInFlight.current ||
      isSavingPlan
    ) {
      return;
    }

    draftRequestInFlight.current = true;
    setPlanDraft(null);
    setPlanSourceMessage(message);
    setPlanError(null);
    setIsLoadingPlanDraft(true);
    setWorkspaceView("both");

    try {
      const draft = await createPlanDraft({
        conversationId,
        sourceMessageId: message.serverId,
      });

      setPlanDraft({
        title: draft.title ?? "",
        outcome: draft.outcome ?? "",
        items: (draft.items ?? [])
          .map((item) => item?.title ?? "")
          .filter((item) => item.trim().length > 0),
      });
    } catch (draftError) {
      setPlanSourceMessage(null);
      setPlanError(
        draftError instanceof Error
          ? draftError.message
          : "Unable to create a plan draft.",
      );
    } finally {
      draftRequestInFlight.current = false;
      setIsLoadingPlanDraft(false);
    }
  };

  const savePlan = async (draft: PlanDraftData) => {
    if (!conversationId || !planSourceMessage?.serverId) return;

    setIsSavingPlan(true);
    setPlanError(null);

    try {
      await createPlan({
        conversationId,
        sourceMessageId: planSourceMessage.serverId,
        title: draft.title,
        outcome: draft.outcome,
        items: draft.items,
      });

      setPlanSourceMessage(null);
      setPlanDraft(null);
      setWorkspaceView("both");
    } catch (saveError) {
      setPlanError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the plan.",
      );
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleTogglePlanItem = async (itemId: string) => {
    if (!activePlan) return;

    setIsUpdatingPlan(true);
    setPlanError(null);

    try {
      await togglePlanItem(activePlan.id, itemId);
    } catch (updateError) {
      setPlanError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the plan item.",
      );
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const showChat = workspaceView !== "plan";
  const showPlan = workspaceView !== "chat";

  return (
    <main className="mentor-shell">
      <nav className="topbar" aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={15} />
          </span>
          <span>Mentor</span>
        </div>

        <div className="workspace-controls" aria-label="Workspace layout">
          <button
            className={workspaceView === "chat" ? "active" : ""}
            onClick={() => setWorkspaceView("chat")}
            aria-pressed={workspaceView === "chat"}
          >
            <MessageSquare size={14} />
            Chat
          </button>

          <button
            className={workspaceView === "both" ? "active" : ""}
            onClick={() => setWorkspaceView("both")}
            aria-pressed={workspaceView === "both"}
          >
            <PanelsTopLeft size={14} />
            Both
          </button>

          <button
            className={workspaceView === "plan" ? "active" : ""}
            onClick={() => setWorkspaceView("plan")}
            aria-pressed={workspaceView === "plan"}
          >
            <ListChecks size={14} />
            Plan
          </button>
        </div>

        <span className="status-dot">Private workspace</span>
      </nav>

      <div className="mentor-body">
        <aside className="workspace-sidebar" aria-label="Workspace navigation">
          <div className="sidebar-section">
            <h3>Chats</h3>

            <button
              type="button"
              className={`sidebar-item ${workspaceView === "chat" ? "active" : ""}`}
              onClick={() => setWorkspaceView("chat")}
            >
              <MessageSquare size={14} />
              Current chat
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Plans</h3>

            {isLoadingPlans && <p className="sidebar-empty">Loading plans…</p>}

            {!isLoadingPlans && plans.length === 0 && (
              <p className="sidebar-empty">No saved plans yet</p>
            )}

            {plans.map((plan) => (
              <button
                key={plan.id}
                className={`sidebar-item ${
                  plan.id === activePlanId ? "active" : ""
                }`}
                onClick={() => {
                  selectPlan(plan.id);
                  setPlanSourceMessage(null);
                  setPlanDraft(null);
                  setWorkspaceView("both");
                }}
                disabled={
                  isLoadingPlanDraft || isSavingPlan || planDraft !== null
                }
              >
                <ListChecks size={14} />
                <span>{plan.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className={`workspace-main workspace-main--${workspaceView}`}>
          {showChat && (
            <section className="chat-pane">
              <div className="mentor-feed" ref={feedRef}>
                {!hasConversation && !isThinking && (
                  <div className="welcome">
                    <p className="eyebrow">A clearer way forward</p>
                    <h1>What’s on your mind?</h1>
                    <p className="subtitle">
                      Thoughtful guidance for the decisions, questions, and
                      ideas that matter.
                    </p>
                  </div>
                )}

                <ChatMessageList
                  messages={messages}
                  isThinking={isThinking}
                  onContinue={(message) => {
                    continueResponse(message);
                    scrollToBottom();
                  }}
                  onCreatePlan={openPlanDraft}
                />

                {error && <div className="error-message">{error}</div>}

                {!hasConversation && !isThinking && (
                  <div className="prompt-list" aria-label="Suggested prompts">
                    {prompts.map((prompt) => (
                      <button key={prompt} onClick={() => setQuery(prompt)}>
                        {prompt}
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Composer
                query={query}
                isThinking={isThinking}
                onQueryChange={setQuery}
                onSubmit={() => {
                  ask(query);
                  setQuery("");
                  scrollToBottom();
                }}
                onStop={stop}
              />
            </section>
          )}

          {showPlan && (
            <section className="plan-panel">
              {isLoadingPlanDraft ? (
                <div className="plan-loading" role="status" aria-live="polite">
                  <span className="loading-indicator" aria-hidden="true" />
                  <h2>Creating your plan</h2>
                  <p>Turning this response into actionable next steps.</p>
                </div>
              ) : planSourceMessage && planDraft ? (
                <PlanDraft
                  key={planSourceMessage.id}
                  initialDraft={planDraft}
                  sourceMessage={planSourceMessage}
                  isSaving={isSavingPlan}
                  error={planError}
                  onSave={savePlan}
                  onCancel={() => {
                    setPlanSourceMessage(null);
                    setPlanDraft(null);
                  }}
                />
              ) : activePlan ? (
                <PlanView
                  plan={activePlan}
                  isUpdating={isUpdatingPlan}
                  onToggleItem={handleTogglePlanItem}
                />
              ) : (
                <div className="plan-empty">
                  <ListChecks size={22} />
                  <h2>No plan selected</h2>
                  <p>
                    Create a plan from an assistant response, or select an
                    existing plan from the sidebar.
                  </p>
                </div>
              )}

              {(planError || plansError) && !planDraft && (
                <div className="error-message">{planError ?? plansError}</div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
