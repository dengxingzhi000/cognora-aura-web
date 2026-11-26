import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  capabilities: vi.fn(),
  chat: vi.fn(),
  decide: vi.fn(),
  resume: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  task: vi.fn(),
  steps: vi.fn(),
  approveTask: vi.fn(),
  rejectTask: vi.fn(),
  cancelTask: vi.fn(),
}));

vi.mock("@/lib/api/services/platform-agent", () => ({
  platformAgentApiService: {
    getCapabilities: h.capabilities,
    chat: h.chat,
    decideApproval: h.decide,
    resumeChat: h.resume,
    listBrowserTasks: h.listTasks,
    createBrowserTask: h.createTask,
    getBrowserTask: h.task,
    getBrowserTaskSteps: h.steps,
    approveBrowserTask: h.approveTask,
    rejectBrowserTask: h.rejectTask,
    cancelBrowserTask: h.cancelTask,
  },
}));

import {
  agentStorageKeys,
  isTerminalAgentResponse,
  platformAgentKeys,
  useAgentApprovalDecision,
  useAgentCapabilities,
  useApproveBrowserTask,
  useBrowserTaskDetail,
  useBrowserTasks,
} from "./use-platform-agent";

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

const taskPage = (status: string) => ({
  records: [{ taskId: "task-1", status }],
  total: 1,
  limit: 20,
  offset: 0,
});

describe("platform agent hooks", () => {
  beforeEach(() => {
    Object.values(h).forEach((mock) => mock.mockReset());
    h.capabilities.mockResolvedValue({ enterprise: {}, browser: {} });
    h.listTasks.mockResolvedValue(taskPage("COMPLETED"));
    h.task.mockResolvedValue({ taskId: "task-1", status: "COMPLETED" });
    h.approveTask.mockResolvedValue(undefined);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("retains recovery state for paused and approved business results", () => {
    expect(isTerminalAgentResponse({ status: "PAUSED" })).toBe(false);
    expect(isTerminalAgentResponse({ status: "APPROVED" })).toBe(false);
    expect(isTerminalAgentResponse({ status: "COMPLETED" })).toBe(true);
    expect(isTerminalAgentResponse({ status: "REJECTED" })).toBe(true);
  });

  it("namespaces recovered task and session keys by account", () => {
    expect(agentStorageKeys("user-a").task).not.toBe(agentStorageKeys("user-b").task);
    expect(agentStorageKeys("user-a").session).not.toBe(agentStorageKeys("user-b").session);
  });

  it("does not request capabilities without agent:capabilities:view", () => {
    renderHook(() => useAgentCapabilities({ enabled: false }), { wrapper });
    expect(h.capabilities).not.toHaveBeenCalled();
  });

  it("loads capabilities when enabled", async () => {
    const { result } = renderHook(() => useAgentCapabilities(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(h.capabilities).toHaveBeenCalledOnce();
  });

  it.each(["PENDING", "RUNNING", "WAITING_APPROVAL"])(
    "polls the browser task list while a task is %s",
    async (status) => {
      h.listTasks.mockResolvedValue(taskPage(status));
      const query = { status: "RUNNING", limit: 20, offset: 0 };
      const { result } = renderHook(() => useBrowserTasks(query), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cached = queryClient.getQueryCache().find({
        queryKey: platformAgentKeys.browserTasks(query),
      });
      const interval = (cached?.options as { refetchInterval?: unknown })
        ?.refetchInterval;
      expect(typeof interval).toBe("function");
      if (typeof interval === "function") {
        expect(interval(cached!)).toBe(3000);
      }
    },
  );

  it("stops polling once all browser tasks are terminal", async () => {
    const query = { limit: 20, offset: 0 };
    const { result } = renderHook(() => useBrowserTasks(query), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryCache().find({
      queryKey: platformAgentKeys.browserTasks(query),
    });
    const interval = (cached?.options as { refetchInterval?: unknown })
      ?.refetchInterval;
    if (typeof interval !== "function") throw new Error("Expected interval callback");
    expect(interval(cached!)).toBe(false);
  });

  it("polls an open task detail only while it is active", async () => {
    h.task.mockResolvedValue({ taskId: "task-1", status: "WAITING_APPROVAL" });
    const { result } = renderHook(() => useBrowserTaskDetail("task-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryCache().find({
      queryKey: platformAgentKeys.browserTask("task-1"),
    });
    const interval = (cached?.options as { refetchInterval?: unknown })
      ?.refetchInterval;
    if (typeof interval !== "function") throw new Error("Expected interval callback");
    expect(interval(cached!)).toBe(3000);
  });

  it("records an enterprise approval decision without executing it", async () => {
    h.decide.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAgentApprovalDecision(), { wrapper });

    await result.current.mutateAsync({
      approvalId: "approval-1",
      taskId: "task-1",
      decision: "approve",
    });

    expect(h.decide).toHaveBeenCalledWith("approval-1", "approve");
    expect(h.resume).not.toHaveBeenCalled();
  });

  it("does not resume a rejected enterprise task", async () => {
    h.decide.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAgentApprovalDecision(), { wrapper });
    await result.current.mutateAsync({
      approvalId: "approval-1",
      taskId: "task-1",
      decision: "reject",
    });
    expect(h.resume).not.toHaveBeenCalled();
  });

  it("invalidates browser task queries after an approval", async () => {
    queryClient.setQueryData(platformAgentKeys.browserTasks({ limit: 20 }), taskPage("WAITING_APPROVAL"));
    const { result } = renderHook(() => useApproveBrowserTask(), { wrapper });
    await result.current.mutateAsync("task-1");

    expect(h.approveTask).toHaveBeenCalledWith("task-1");
    await waitFor(() => {
      const cached = queryClient.getQueryCache().find({
        queryKey: platformAgentKeys.browserTasks({ limit: 20 }),
      });
      expect(cached?.state.isInvalidated).toBe(true);
    });
  });
});
