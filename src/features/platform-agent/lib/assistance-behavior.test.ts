import { beforeEach, describe, expect, it } from "vitest";

import {
  assistanceEvent,
  buildAssistanceSignals,
  readAssistanceHistory,
  recordAssistanceHistory,
} from "./assistance-behavior";

describe("assistance behavior signals", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("derives aggregate and sequence-safe signals without free text", () => {
    const events = [
      assistanceEvent("PAGE_VIEW", 0),
      assistanceEvent("API_ERROR", 1000, { severity: 2, errorCode: "SERVER_ERROR" }),
      assistanceEvent("RETRY", 2000),
      assistanceEvent("API_ERROR", 3000, { severity: 2, errorCode: "SERVER_ERROR" }),
      assistanceEvent("BACK_NAVIGATION", 4000),
      assistanceEvent("HELP_OPEN", 5000),
      assistanceEvent("TASK_SUCCESS", 6000),
    ];

    const signals = buildAssistanceSignals({
      events,
      startedAt: 0,
      activeMs: 90_000,
      now: 120_000,
      completionRatio: 1.4,
      history: { taskCount: 4, successCount: 3, recentAssistanceCount: 2 },
      explicitHelpRequest: true,
      highRiskAction: false,
    });

    expect(signals).toMatchObject({
      module: "platform_agent",
      workflow: "enterprise_chat",
      session_duration_seconds: 120,
      active_seconds: 90,
      idle_seconds: 30,
      event_count: 7,
      error_count: 2,
      unique_error_count: 1,
      repeated_error_count: 1,
      retry_count: 1,
      back_navigation_count: 1,
      help_open_count: 1,
      form_completion_ratio: 1,
      previous_task_count: 4,
      previous_success_rate: 0.75,
      recent_assistance_count: 2,
      explicit_help_request: true,
    });
    expect(JSON.stringify(signals)).not.toContain("message");
  });

  it("keeps outcome history scoped by user", () => {
    recordAssistanceHistory("user-a", "success", true);
    recordAssistanceHistory("user-a", "failure", false);
    recordAssistanceHistory("user-b", "success", false);

    expect(readAssistanceHistory("user-a")).toEqual({
      taskCount: 2,
      successCount: 1,
      recentAssistanceCount: 1,
    });
    expect(readAssistanceHistory("user-b")).toEqual({
      taskCount: 1,
      successCount: 1,
      recentAssistanceCount: 0,
    });
  });

  it("clamps event offsets, duration and severity", () => {
    expect(
      assistanceEvent("API_ERROR", -10, {
        durationMs: -1,
        severity: 9,
        errorCode: "SERVER_ERROR",
      }),
    ).toEqual({
      type: "API_ERROR",
      offset_ms: 0,
      duration_ms: 0,
      severity: 3,
      error_code: "SERVER_ERROR",
    });
  });
});
