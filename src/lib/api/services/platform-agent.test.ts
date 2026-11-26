import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  default: { get: h.get, post: h.post },
}));

import { platformAgentApiService } from "./platform-agent";

const BASE = "/platform-agent/api/v1/agent";

describe("platform agent api service", () => {
  beforeEach(() => {
    h.get.mockReset().mockResolvedValue({ code: 200, data: {} });
    h.post.mockReset().mockResolvedValue({ code: 200, data: {} });
  });

  it("loads capabilities through the gateway prefix", async () => {
    await platformAgentApiService.getCapabilities();
    expect(h.get).toHaveBeenCalledWith(`${BASE}/capabilities`, {
      params: undefined,
    });
  });

  it("sends chat messages without letting callers choose task ids", async () => {
    await platformAgentApiService.chat({ message: "检查库存" });
    expect(h.post).toHaveBeenCalledWith(`${BASE}/chat`, {
      message: "检查库存",
    });
  });

  it("requests a writing suggestion through the dedicated endpoint", async () => {
    h.post.mockResolvedValueOnce({
      code: 200,
      data: { text: "轻便耐用，适合日常通勤。", scene: "PRODUCT_DESCRIPTION" },
    });
    const request = {
      scene: "PRODUCT_DESCRIPTION" as const,
      action: "GENERATE" as const,
      content: "",
      context: { title: "城市通勤双肩包" },
      maxLength: 500,
      language: "zh-CN" as const,
    };

    await expect(platformAgentApiService.generateWriting(request)).resolves.toEqual({
      text: "轻便耐用，适合日常通勤。",
      scene: "PRODUCT_DESCRIPTION",
    });
    expect(h.post).toHaveBeenCalledWith(`${BASE}/writing-assistant`, request, {
      timeout: 60_000,
    });
  });

  it("loads operations status and posts explicit actions", async () => {
    await platformAgentApiService.getOpsStatus("agent");
    expect(h.get).toHaveBeenCalledWith(`${BASE}/ops/status`, {
      params: { profile: "agent" },
    });

    const request = { action: "RESTART" as const, services: ["web"], apply: false };
    await platformAgentApiService.runOpsAction(request);
    expect(h.post).toHaveBeenCalledWith(`${BASE}/ops/actions`, request, {
      timeout: 180_000,
    });
  });

  it("encodes approval and task ids and sends the documented bodies", async () => {
    await platformAgentApiService.decideApproval("approval/1", "approve");
    await platformAgentApiService.resumeChat("task/1");

    expect(h.post).toHaveBeenNthCalledWith(
      1,
      `${BASE}/approvals/approval%2F1/decision`,
      { decision: "approve" },
    );
    expect(h.post).toHaveBeenNthCalledWith(
      2,
      `${BASE}/chat/task%2F1/resume`,
      {},
    );
  });

  it("passes browser task filters as query parameters", async () => {
    await platformAgentApiService.listBrowserTasks({
      status: "RUNNING",
      limit: 20,
      offset: 40,
    });
    expect(h.get).toHaveBeenCalledWith(`${BASE}/browser/tasks`, {
      params: { status: "RUNNING", limit: 20, offset: 40 },
    });
  });

  it("creates a browser task with target, JSON input and execution mode", async () => {
    const request = {
      taskType: "supplier_onboarding",
      target: { system: "SRM", url: "https://srm.example.test" },
      input: { supplier: "Acme" },
      executionMode: "require_approval" as const,
    };
    await platformAgentApiService.createBrowserTask(request, "idem-1");
    expect(h.post).toHaveBeenCalledWith(`${BASE}/browser/tasks`, request, {
      headers: { "Idempotency-Key": "idem-1" },
    });
  });

  it("loads task details and steps using encoded ids", async () => {
    await platformAgentApiService.getBrowserTask("task/1");
    await platformAgentApiService.getBrowserTaskSteps("task/1");
    expect(h.get).toHaveBeenNthCalledWith(
      1,
      `${BASE}/browser/tasks/task%2F1`,
      { params: undefined },
    );
    expect(h.get).toHaveBeenNthCalledWith(
      2,
      `${BASE}/browser/tasks/task%2F1/steps`,
      { params: undefined },
    );
  });

  it.each(["approve", "reject", "cancel"] as const)(
    "posts an empty body to the browser task %s endpoint",
    async (action) => {
      await platformAgentApiService[action === "approve"
        ? "approveBrowserTask"
        : action === "reject"
          ? "rejectBrowserTask"
          : "cancelBrowserTask"]("task-1");
      expect(h.post).toHaveBeenCalledWith(
        `${BASE}/browser/tasks/task-1/${action}`,
        {},
      );
    },
  );

  it("posts assistance predictions and knowledge feedback through the BFF", async () => {
    const prediction = {
      session_id: "session-1",
      signals: {
        module: "platform_agent",
        workflow: "enterprise_chat",
        session_duration_seconds: 60,
        active_seconds: 50,
        idle_seconds: 10,
        event_count: 2,
        error_count: 0,
        unique_error_count: 0,
        repeated_error_count: 0,
        retry_count: 0,
        back_navigation_count: 0,
        context_switch_count: 0,
        validation_failure_count: 0,
        permission_denied_count: 0,
        form_completion_ratio: 1,
        help_open_count: 1,
        previous_task_count: 0,
        previous_success_rate: 0,
        recent_assistance_count: 0,
        explicit_help_request: true,
        high_risk_action: false,
      },
      recent_events: [],
    };
    const feedback = {
      needed_assistance: true,
      assistance_used: true,
      task_succeeded: false,
      source: "OPERATOR" as const,
      knowledge_helpful: true,
      knowledge_article_id: "order-create-server-error",
    };

    await platformAgentApiService.predictAssistance(prediction);
    await platformAgentApiService.submitAssistanceFeedback("prediction/1", feedback);
    await platformAgentApiService.getAssistanceModelStatus();
    await platformAgentApiService.getAssistanceDashboardData();

    expect(h.post).toHaveBeenNthCalledWith(
      1,
      `${BASE}/assistance/predict`,
      prediction,
    );
    expect(h.post).toHaveBeenNthCalledWith(
      2,
      `${BASE}/assistance/predictions/prediction%2F1/feedback`,
      feedback,
    );
    expect(h.get).toHaveBeenNthCalledWith(
      1,
      `${BASE}/assistance/model/status`,
      { params: undefined },
    );
    expect(h.get).toHaveBeenNthCalledWith(
      2,
      `${BASE}/assistance/dashboard/data`,
      { params: undefined },
    );
  });

  it("unwraps the BFF response and rejects an ApiResponse failure", async () => {
    h.get.mockResolvedValueOnce({
      code: 200,
      data: { enterprise: { tools: ["inventory"] } },
    });
    await expect(platformAgentApiService.getCapabilities()).resolves.toEqual({
      enterprise: { tools: ["inventory"] },
    });

    h.get.mockResolvedValueOnce({ code: 403, message: "Forbidden" });
    await expect(platformAgentApiService.getCapabilities()).rejects.toMatchObject({
      code: 403,
      message: "Forbidden",
    });
  });
});
