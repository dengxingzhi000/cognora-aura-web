"use client";

import { useCallback, useEffect, useRef } from "react";

import type {
  AssistanceErrorCode,
  AssistanceEvent,
  AssistanceEventType,
  AssistancePredictRequest,
} from "@/lib/api/contracts/platform-agent";
import {
  assistanceEvent,
  buildAssistanceSignals,
  newAssistanceSessionId,
  readAssistanceHistory,
} from "../lib/assistance-behavior";

export function useAssistanceBehavior(
  userId: string | null | undefined,
  sessionId: string | null,
) {
  const startedAt = useRef(0);
  const lastActiveAt = useRef(0);
  const activeMs = useRef(0);
  const events = useRef<AssistanceEvent[]>([]);
  const completion = useRef(0);
  const fallbackSessionId = useRef<string | null>(null);
  const lastRecordedAt = useRef<Partial<Record<AssistanceEventType, number>>>({});

  const reset = useCallback(() => {
    startedAt.current = Date.now();
    lastActiveAt.current = startedAt.current;
    activeMs.current = 0;
    events.current = [];
    completion.current = 0;
    fallbackSessionId.current = newAssistanceSessionId();
    lastRecordedAt.current = {};
  }, []);

  useEffect(() => {
    reset();
  }, [reset, userId]);

  const markActive = useCallback(() => {
    const now = Date.now();
    if (lastActiveAt.current === 0) {
      lastActiveAt.current = now;
      return;
    }
    activeMs.current += Math.min(5000, Math.max(0, now - lastActiveAt.current));
    lastActiveAt.current = now;
  }, []);

  const recordEvent = useCallback(
    (
      type: AssistanceEventType,
      options: {
        durationMs?: number;
        severity?: number;
        errorCode?: AssistanceErrorCode | null;
      } = {},
    ) => {
      const now = Date.now();
      markActive();
      const previous = lastRecordedAt.current[type] ?? 0;
      if (now - previous < 400 && !["API_ERROR", "TASK_FAILURE"].includes(type)) return;
      lastRecordedAt.current[type] = now;
      const item = assistanceEvent(type, now - startedAt.current, options);
      events.current = [...events.current.slice(-59), item];
    },
    [markActive],
  );

  const setCompletion = useCallback(
    (value: number) => {
      completion.current = Math.max(0, Math.min(1, value));
    },
    [],
  );

  useEffect(() => {
    const onPopState = () => recordEvent("BACK_NAVIGATION");
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") recordEvent("CONTEXT_SWITCH");
    };
    const onActivity = () => markActive();
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [markActive, recordEvent]);

  const snapshot = useCallback(
    (explicitHelpRequest: boolean, highRiskAction: boolean): AssistancePredictRequest => {
      markActive();
      if (startedAt.current === 0) startedAt.current = Date.now();
      if (fallbackSessionId.current === null) fallbackSessionId.current = newAssistanceSessionId();
      return {
        session_id: sessionId ?? fallbackSessionId.current,
        signals: buildAssistanceSignals({
          events: events.current,
          startedAt: startedAt.current,
          activeMs: activeMs.current,
          now: Date.now(),
          completionRatio: completion.current,
          history: readAssistanceHistory(userId),
          explicitHelpRequest,
          highRiskAction: highRiskAction,
        }),
        recent_events: events.current,
      };
    },
    [markActive, sessionId, userId],
  );

  return { recordEvent, markActive, setCompletion, snapshot, reset };
}
