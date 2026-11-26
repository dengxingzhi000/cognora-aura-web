"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import { toApiError } from "@/lib/api/envelope";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import {
  PLATFORM_AGENT_PERMISSIONS,
  type AgentApprovalDecision,
  AgentChatResponse,
  AssistancePrediction,
} from "@/lib/api/contracts/platform-agent";
import {
  useAgentApprovalDecision,
  useAgentCapabilities,
  useAgentChat,
  useAssistancePrediction,
  useAsyncAgentTask,
  useResumeAgentTask,
  agentStorageKeys,
  isTerminalAgentResponse,
  readAgentRecovery,
} from "../hooks";
import { formatAgentValue } from "../lib/browser-task";
import { recordAssistanceHistory } from "../lib/assistance-behavior";
import { useAssistanceBehavior } from "../hooks/use-assistance-behavior";
import { AgentError, AgentJson } from "./agent-feedback";
import { EnterpriseCapabilities } from "./enterprise-capabilities";
import { AssistancePredictionPanel } from "./assistance-prediction-panel";
import { WorkflowKnowledgePanel } from "./workflow-knowledge-panel";

type ChatEntry = {
  id: number;
  role: "user" | "agent";
  content: string;
  response?: AgentChatResponse;
};

const PAUSED_STATUSES = new Set([
  "PAUSED",
  "WAITING_APPROVAL",
  "AWAITING_APPROVAL",
]);

function isPaused(response?: AgentChatResponse) {
  return PAUSED_STATUSES.has((response?.status ?? "").toUpperCase());
}

function statusVariant(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "SUCCEEDED":
    case "DONE":
      return "success" as const;
    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
      return "destructive" as const;
    case "PAUSED":
    case "WAITING_APPROVAL":
    case "AWAITING_APPROVAL":
    case "APPROVED":
      return "warning" as const;
    case "RUNNING":
      return "info" as const;
    default:
      return "secondary" as const;
  }
}

export function EnterpriseAgentChat() {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const userId = useAuthStore((state) => state.user?.id);
  const storageKeys = agentStorageKeys(userId);
  const canReadCapabilities = hasPermission(PLATFORM_AGENT_PERMISSIONS.capabilities);
  const canChat = hasPermission(PLATFORM_AGENT_PERMISSIONS.chat)
    || hasPermission(PLATFORM_AGENT_PERMISSIONS.chatAsync);
  const canDecide = hasPermission(PLATFORM_AGENT_PERMISSIONS.enterpriseDecide);
  const canResume = hasPermission(PLATFORM_AGENT_PERMISSIONS.enterpriseResume);
  const canPredict = hasPermission(PLATFORM_AGENT_PERMISSIONS.assistancePredict);
  const capabilities = useAgentCapabilities({ enabled: canReadCapabilities });
  const chat = useAgentChat();
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(() => readAgentRecovery(userId).sessionId);
  const [recoveredTaskId, setRecoveredTaskId] = useState<string | null>(() => readAgentRecovery(userId).taskId);
  const assistance = useAssistancePrediction();
  const behavior = useAssistanceBehavior(userId, sessionId);
  const decide = useAgentApprovalDecision();
  const resume = useResumeAgentTask();
  const recoveredTask = useAsyncAgentTask(recoveredTaskId, userId);
  const currentUserId = useRef(userId);
  const recoveredHandled = useRef(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [chatError, setChatError] = useState<unknown>(null);
  const [decisionError, setDecisionError] = useState<unknown>(null);
  const [resumeError, setResumeError] = useState<unknown>(null);
  const [assistanceResult, setAssistanceResult] = useState<AssistancePrediction | null>(null);
  const [assistanceError, setAssistanceError] = useState<unknown>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    currentUserId.current = userId;
    const recovery = readAgentRecovery(userId);
    recoveredHandled.current = false;
    setEntries([]);
    setSessionId(recovery.sessionId);
    setRecoveredTaskId(recovery.taskId);
  }, [userId]);

  const recordBehaviorEvent = behavior.recordEvent;

  useEffect(() => {
    recordBehaviorEvent("PAGE_VIEW");
  }, [recordBehaviorEvent, userId]);

  const appendAgentResponse = (response: AgentChatResponse) => {
    const entry: ChatEntry = {
      id: ++nextId.current,
      role: "agent",
      content: response.reply,
      response,
    };
    setEntries((current) => [...current, entry]);
  };

  useEffect(() => {
    const task = recoveredTask.data;
    if (!task?.result || recoveredHandled.current || !userId) return;
    if (task.result.user_id !== userId) return;
    if (task.status !== "done" && !PAUSED_STATUSES.has(task.status.toUpperCase())) return;
    recoveredHandled.current = true;
    setEntries((current) => [...current, {
      id: ++nextId.current,
      role: "agent",
      content: task.result!.reply,
      response: task.result ?? undefined,
    }]);
    setSessionId(task.result.session_id ?? null);
    setRecoveredTaskId(null);
    if (isTerminalAgentResponse(task.result)) {
      window.localStorage.removeItem(storageKeys.task);
    }
  }, [recoveredTask.data, storageKeys.task, userId]);

  const requestAssistance = async (explicitHelpRequest: boolean) => {
    if (!canPredict || assistance.isPending) return;
    setAssistanceError(null);
    const latestResponse = entries.at(-1)?.response;
    try {
      const result = await assistance.mutateAsync(
        behavior.snapshot(
          explicitHelpRequest,
          Boolean(latestResponse?.approval_id || latestResponse?.approval_tool),
        ),
      );
      setAssistanceResult(result);
    } catch (error) {
      setAssistanceError(error);
    }
  };

  const useSuggestion = (prompt: string) => {
    setMessage(prompt);
    behavior.setCompletion(Math.min(1, prompt.length / 80));
    inputRef.current?.focus();
  };

  const submitMessage = async () => {
    const text = message.trim();
    if (!text || !canChat || chat.isPending) return;
    setChatError(null);
    recoveredHandled.current = true;
    setRecoveredTaskId(null);
    setMessage("");
    behavior.setCompletion(1);
    setEntries((current) => [
      ...current,
      { id: ++nextId.current, role: "user", content: text },
    ]);
    const requestUserId = userId;
    try {
      const response = await chat.mutateAsync({
        message: text,
        session_id: sessionId ?? undefined,
        ...(assistanceResult
          ? { assistance_prediction_id: assistanceResult.prediction_id }
          : {}),
      });
      if (currentUserId.current !== requestUserId) return;
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      appendAgentResponse(response);
      const status = response.status.toUpperCase();
      if (["DONE", "COMPLETED", "SUCCEEDED"].includes(status)) {
        behavior.recordEvent("TASK_SUCCESS");
        recordAssistanceHistory(userId, "success", Boolean(assistanceResult));
      } else if (["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(status)) {
        behavior.recordEvent("TASK_FAILURE", { severity: 2, errorCode: "UNKNOWN" });
        recordAssistanceHistory(userId, "failure", Boolean(assistanceResult));
        if (canPredict) void requestAssistance(false);
      }
    } catch (error) {
      if (currentUserId.current !== requestUserId) return;
      const failureCode = toApiError(error).code;
      behavior.recordEvent("API_ERROR", {
        severity: 2,
        errorCode: failureCode === 403
          ? "FORBIDDEN"
          : failureCode >= 500
            ? "SERVER_ERROR"
            : "UNKNOWN",
      });
      if (canPredict) void requestAssistance(false);
      // Keep the user's message visible so it can be copied and retried.
      setChatError(error);
    }
  };

  const submitDecision = async (decision: AgentApprovalDecision) => {
    const latest = entries.at(-1)?.response;
    if (!latest?.approval_id || !canDecide || decide.isPending) return;
    const decisionUserId = userId;
    setDecisionError(null);
    try {
      await decide.mutateAsync({
        approvalId: latest.approval_id,
        taskId: latest.task_id ?? "",
        decision,
      });
      if (currentUserId.current !== decisionUserId) return;
      if (decision === "reject") {
        window.localStorage.removeItem(storageKeys.task);
      }
      setEntries((current) =>
        current.map((entry, index) =>
          index === current.length - 1 && entry.response
            ? {
                ...entry,
                response: {
                  ...entry.response,
                  status: decision === "approve" ? "APPROVED" : "REJECTED",
                  approval_id: undefined,
                },
              }
            : entry,
        ),
      );
    } catch (error) {
      if (currentUserId.current !== decisionUserId) return;
      setDecisionError(error);
    }
  };

  const resumeLatest = async () => {
    const latest = entries.at(-1)?.response;
    if (!latest?.task_id || !canResume || resume.isPending) return;
    const resumeUserId = userId;
    setResumeError(null);
    try {
      const response = await resume.mutateAsync(latest.task_id);
      if (currentUserId.current !== resumeUserId) return;
      if (isTerminalAgentResponse(response)) {
        window.localStorage.removeItem(storageKeys.task);
      }
      appendAgentResponse(response);
      const status = response.status.toUpperCase();
      if (["DONE", "COMPLETED", "SUCCEEDED"].includes(status)) {
        behavior.recordEvent("TASK_SUCCESS");
        recordAssistanceHistory(userId, "success", Boolean(assistanceResult));
      } else if (["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(status)) {
        behavior.recordEvent("TASK_FAILURE", { severity: 2, errorCode: "UNKNOWN" });
        recordAssistanceHistory(userId, "failure", Boolean(assistanceResult));
      }
    } catch (error) {
      if (currentUserId.current !== resumeUserId) return;
      setResumeError(error);
    }
  };

  const latest = entries.at(-1)?.response;
  const taskSucceeded = ["DONE", "COMPLETED", "SUCCEEDED"].includes(
    (latest?.status ?? "").toUpperCase(),
  );
  const approvalPanelOpen = Boolean(latest && (isPaused(latest) || latest.status.toUpperCase() === "APPROVED"));
  const suggestions = [
    t("chat.suggestions.inventory"),
    t("chat.suggestions.sales"),
    t("chat.suggestions.supplier"),
  ];

  return (
    <>
      <section
      id="platform-agent-enterprise-panel"
      role="tabpanel"
      aria-labelledby="platform-agent-enterprise-tab"
      className="grid min-h-[640px] overflow-hidden rounded-lg border border-[var(--color-border-secondary)] bg-card xl:grid-cols-[280px_minmax(0,1fr)]"
    >
      <EnterpriseCapabilities
        canRead={canReadCapabilities}
        enterprise={capabilities.data?.enterprise}
        isLoading={capabilities.isLoading}
        isError={capabilities.isError}
        error={capabilities.error}
        onRetry={() => void capabilities.refetch()}
      />

      <div className="flex min-h-[640px] min-w-0 flex-col">
        <div className="border-b border-[var(--color-border-secondary)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{t("chat.title")}</h2>
              <p className="text-muted-foreground mt-0.5 text-[11px]">{t("chat.description")}</p>
            </div>
            {canPredict ? (
              <Button
                size="sm"
                variant="outline"
                disabled={assistance.isPending}
                onClick={() => {
                  behavior.recordEvent("HELP_OPEN");
                  void requestAssistance(true);
                }}
              >
                {assistance.isPending ? (
                  <LoaderCircle className="motion-safe:animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {t("assistance.request")}
              </Button>
            ) : null}
          </div>
        </div>

        {assistanceError || assistance.error ? (
          <div className="px-4 pt-3">
            <AgentError error={assistanceError ?? assistance.error} />
          </div>
        ) : null}
        {assistanceResult ? (
          <div className="px-4 pt-3">
            <AssistancePredictionPanel
              prediction={assistanceResult}
              taskSucceeded={taskSucceeded}
              onUseSuggestion={useSuggestion}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {entries.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
              <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] mb-4 flex size-12 items-center justify-center rounded-xl">
                <Bot className="size-6" />
              </span>
              <h3 className="text-sm font-semibold">{t("chat.emptyTitle")}</h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-[12px] leading-5">{t("chat.emptyDescription")}</p>
              <div className="mt-6 w-full max-w-lg">
                <p className="text-muted-foreground mb-2 text-[9px] font-medium tracking-[0.08em] uppercase">{t("chat.suggestionsTitle")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="bg-card hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-soft)] rounded-full border border-[var(--color-border-secondary)] px-3 py-1.5 text-[10px] transition-colors"
                      onClick={() => {
                        setMessage(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {entries.map((entry) => (
            <article key={entry.id} className={cn("flex gap-3", entry.role === "user" && "flex-row-reverse")}>
              <span className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
                entry.role === "user"
                  ? "bg-card text-muted-foreground border-[var(--color-border-secondary)]"
                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] border-[var(--color-primary)]/20",
              )}>
                {entry.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div className={cn("min-w-0 max-w-[85%]", entry.role === "user" && "text-right")}>
                <div className={cn(
                  "rounded-lg px-3.5 py-3 text-[12px] leading-5 whitespace-pre-wrap break-words",
                  entry.role === "user"
                    ? "bg-[var(--color-primary-soft)] text-foreground"
                    : "bg-sunken text-foreground",
                )}>
                  {entry.content}
                </div>
                {entry.response ? (
                  <div className="mt-2 space-y-2 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(entry.response.status)}>
                        {t.has(`statuses.${entry.response.status.toUpperCase()}`)
                          ? t(`statuses.${entry.response.status.toUpperCase()}`)
                          : entry.response.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-[9px]">{entry.response.trace_id}</span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px]">
                      <span>{t("chat.task")}: {entry.response.task_id}</span>
                      {entry.response.token_usage !== undefined ? (
                        <span>{t("chat.tokens")}: {formatAgentValue(entry.response.token_usage)}</span>
                      ) : null}
                      {entry.response.cost !== undefined ? (
                        <span>{t("chat.cost")}: {formatAgentValue(entry.response.cost)}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}

          {chat.isPending ? (
            <div role="status" className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <LoaderCircle className="motion-safe:animate-spin size-4" />
              {t("chat.sending")}
            </div>
          ) : null}
        </div>

        {latest && approvalPanelOpen ? (
          <div className="border-t border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] px-4 py-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="text-[var(--color-warning-text)] mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[var(--color-warning-text)] text-[12px] font-semibold">{t("chat.pausedTitle")}</h3>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-5">{t("chat.pausedDescription")}</p>
                {latest.approval_tool ? (
                  <p className="mt-2 font-mono text-[11px]"><span className="text-muted-foreground">{t("chat.approvalTool")}: </span>{latest.approval_tool}</p>
                ) : null}
                {latest.approval_args ? <AgentJson label={t("chat.approvalArgs")} value={latest.approval_args} /> : null}
                {decisionError || resumeError || decide.error || resume.error ? (
                  <div className="mt-2"><AgentError error={decisionError ?? resumeError ?? decide.error ?? resume.error} /></div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!canDecide && latest.approval_id ? (
                    <p className="text-muted-foreground text-[10px]">{t("permissions.enterpriseDecideRequired")}</p>
                  ) : null}
                  {!canResume && !latest.approval_id ? (
                    <p className="text-muted-foreground text-[10px]">{t("permissions.enterpriseResumeRequired")}</p>
                  ) : null}
                  {latest.approval_id ? (
                    <>
                      <Button size="sm" disabled={!canDecide || decide.isPending} onClick={() => void submitDecision("approve")}>
                        {decide.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Check />}
                        {t("common.approve")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!canDecide || decide.isPending} onClick={() => void submitDecision("reject")}>
                        {t("common.reject")}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" disabled={!canResume || resume.isPending} onClick={() => void resumeLatest()}>
                      {resume.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : null}
                      {t("common.resume")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-card border-t border-[var(--color-border-secondary)] p-3 sm:p-4">
          {!canChat ? <p className="text-muted-foreground mb-2 text-[10px]">{t("permissions.chatRequired")}</p> : null}
          {chatError || chat.error ? <div className="mb-2"><AgentError error={chatError ?? chat.error} /></div> : null}
          <div className="bg-sunken/60 flex items-end gap-2 rounded-lg border border-[var(--color-border-secondary)] p-2">
            <Textarea
              ref={inputRef}
              value={message}
              rows={2}
              maxLength={8000}
              disabled={!canChat}
              aria-label={t("chat.inputLabel")}
              placeholder={t("chat.placeholder")}
              className="max-h-36 min-h-16 flex-1 resize-y text-[12px]"
              onChange={(event) => {
                setMessage(event.target.value);
                behavior.setCompletion(Math.min(1, event.target.value.length / 80));
                behavior.recordEvent("FORM_EDIT");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0"
              aria-label={t("chat.send")}
              disabled={!canChat || !message.trim() || chat.isPending}
              onClick={() => void submitMessage()}
            >
              {chat.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Send />}
            </Button>
          </div>
          <p className="text-muted-foreground mt-1.5 px-1 text-[9px]">{t("chat.hint")}</p>
        </div>
      </div>
      </section>
      <WorkflowKnowledgePanel />
    </>
  );
}
