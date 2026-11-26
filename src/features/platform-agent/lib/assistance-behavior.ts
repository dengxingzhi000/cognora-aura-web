import { createRandomId } from "@/lib/api/request-id";
import type {
  AssistanceErrorCode,
  AssistanceEvent,
  AssistanceEventType,
  AssistanceSignals,
} from "@/lib/api/contracts/platform-agent";

export interface AssistanceHistory {
  taskCount: number;
  successCount: number;
  recentAssistanceCount: number;
}

export interface AssistanceBehaviorInput {
  events: AssistanceEvent[];
  startedAt: number;
  activeMs: number;
  now: number;
  completionRatio: number;
  history: AssistanceHistory;
  explicitHelpRequest: boolean;
  highRiskAction: boolean;
}

const EMPTY_HISTORY: AssistanceHistory = {
  taskCount: 0,
  successCount: 0,
  recentAssistanceCount: 0,
};

function historyKey(userId?: string | null) {
  return `platform-agent:assistance-history:${userId ?? "anonymous"}`;
}

export function newAssistanceSessionId() {
  return createRandomId();
}

export function readAssistanceHistory(userId?: string | null): AssistanceHistory {
  if (typeof window === "undefined") return { ...EMPTY_HISTORY };
  try {
    const raw = window.localStorage.getItem(historyKey(userId));
    if (!raw) return { ...EMPTY_HISTORY };
    const value = JSON.parse(raw) as Partial<AssistanceHistory>;
    return {
      taskCount: Math.max(0, Number(value.taskCount) || 0),
      successCount: Math.max(0, Number(value.successCount) || 0),
      recentAssistanceCount: Math.max(0, Number(value.recentAssistanceCount) || 0),
    };
  } catch {
    return { ...EMPTY_HISTORY };
  }
}

export function recordAssistanceHistory(
  userId: string | null | undefined,
  outcome: "success" | "failure",
  assistanceOffered: boolean,
) {
  const history = readAssistanceHistory(userId);
  history.taskCount += 1;
  if (outcome === "success") history.successCount += 1;
  if (assistanceOffered) history.recentAssistanceCount += 1;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(historyKey(userId), JSON.stringify(history));
  } catch {
    // Storage is optional; the current session still works without it.
  }
}

export function assistanceEvent(
  type: AssistanceEventType,
  offsetMs: number,
  options: {
    durationMs?: number;
    severity?: number;
    errorCode?: AssistanceErrorCode | null;
  } = {},
): AssistanceEvent {
  return {
    type,
    offset_ms: Math.max(0, offsetMs),
    duration_ms: Math.max(0, options.durationMs ?? 0),
    severity: Math.max(0, Math.min(3, options.severity ?? 0)),
    error_code: options.errorCode ?? null,
  };
}

export function buildAssistanceSignals(input: AssistanceBehaviorInput): AssistanceSignals {
  const durationSeconds = Math.max(0, Math.floor((input.now - input.startedAt) / 1000));
  const activeSeconds = Math.min(
    durationSeconds,
    Math.max(0, Math.floor(input.activeMs / 1000)),
  );
  const errorEvents = input.events.filter((item) =>
    ["API_ERROR", "VALIDATION_ERROR", "PERMISSION_DENIED"].includes(item.type),
  );
  const errorCodes = new Set(
    errorEvents.map((item) => item.error_code).filter((code): code is AssistanceErrorCode => Boolean(code)),
  );
  const count = (type: AssistanceEventType) =>
    input.events.filter((item) => item.type === type).length;
  const taskCount = Math.max(0, input.history.taskCount);
  const successCount = Math.min(taskCount, Math.max(0, input.history.successCount));

  return {
    module: "platform_agent",
    workflow: "enterprise_chat",
    session_duration_seconds: durationSeconds,
    active_seconds: activeSeconds,
    idle_seconds: Math.max(0, durationSeconds - activeSeconds),
    event_count: input.events.length,
    error_count: errorEvents.length,
    unique_error_count: errorCodes.size,
    repeated_error_count: Math.max(0, errorEvents.length - errorCodes.size),
    retry_count: count("RETRY"),
    back_navigation_count: count("BACK_NAVIGATION"),
    context_switch_count: count("CONTEXT_SWITCH"),
    validation_failure_count: count("VALIDATION_ERROR"),
    permission_denied_count: count("PERMISSION_DENIED"),
    form_completion_ratio: Math.max(0, Math.min(1, input.completionRatio)),
    help_open_count: count("HELP_OPEN"),
    previous_task_count: taskCount,
    previous_success_rate: taskCount ? successCount / taskCount : 0,
    recent_assistance_count: Math.max(0, input.history.recentAssistanceCount),
    explicit_help_request: input.explicitHelpRequest,
    high_risk_action: input.highRiskAction,
  };
}
