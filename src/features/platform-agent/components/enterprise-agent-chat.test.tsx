import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";
import type { AgentChatResponse, AssistancePrediction } from "@/lib/api/contracts/platform-agent";

const h = vi.hoisted(() => ({
  chat: vi.fn(),
  predict: vi.fn(),
  feedback: vi.fn(),
  decide: vi.fn(),
  resume: vi.fn(),
  decisionResult: null as AgentChatResponse | null,
  chatError: null as unknown,
  decisionError: null as unknown,
  permissions: [
    "agent:capabilities:view",
    "agent:chat:run",
    "agent:approval:enterprise-decide",
    "agent:approval:enterprise-resume",
  ],
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: () => ({
    hasPermission: (code: string) => h.permissions.includes(code) || h.permissions.includes("*"),
  }),
}));

vi.mock("../hooks", () => ({
  agentStorageKeys: (userId?: string | null) => ({
    task: `platform-agent:last-async-task:${userId ?? "anonymous"}`,
    session: `platform-agent:last-session:${userId ?? "anonymous"}`,
  }),
  readAgentRecovery: () => ({ taskId: null, sessionId: null }),
  isTerminalAgentResponse: (response?: { status?: string }) =>
    ["DONE", "COMPLETED", "FAILED", "REJECTED", "CANCELLED"].includes(response?.status ?? ""),
  useAgentCapabilities: () => ({
    data: {
      enterprise: {
        tools: ["inventory.query"],
        knowledge: true,
        memory: true,
        workflows: false,
        mcpInstalled: true,
      },
      browser: { tools: [], workflows: [], approvalRequiredForSensitiveActions: true },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAgentChat: () => ({
    mutateAsync: h.chat,
    isPending: false,
    error: h.chatError,
  }),
  useAssistancePrediction: () => ({
    mutateAsync: h.predict,
    isPending: false,
    error: null,
  }),
  useAssistanceFeedback: () => ({
    mutate: h.feedback,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
  useAsyncAgentTask: () => ({ data: undefined }),
  useAgentApprovalDecision: () => ({
    mutateAsync: h.decide,
    isPending: false,
    error: h.decisionError,
  }),
  useResumeAgentTask: () => ({
    mutateAsync: h.resume,
    isPending: false,
    error: null,
  }),
  useWorkflows: () => ({ data: { workflows: [] }, isLoading: false }),
  useRunWorkflow: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useKnowledgeDocuments: () => ({ data: { documents: [] }, isLoading: false }),
  useCreateKnowledgeDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSearchKnowledge: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { EnterpriseAgentChat } from "./enterprise-agent-chat";

const paused: AgentChatResponse = {
  reply: "I need approval to adjust the inventory record.",
  status: "PAUSED",
  user_id: "user-1",
  task_id: "task-1",
  trace_id: "trace-1",
  approval_id: "approval-1",
  approval_tool: "inventory.adjust",
  approval_args: { skuId: "SKU-1", quantity: 5 },
  token_usage: 120,
  cost: 0.01,
};

const assistancePrediction: AssistancePrediction = {
  prediction_id: "prediction-1",
  probability: 0.91,
  threshold: 0.49,
  decision: "OFFER_ASSISTANCE",
  suggested_action: "OPEN_ASSISTANT",
  model_version: "bootstrap-v2",
  feature_version: 2,
  training_source: "synthetic_bootstrap",
  created_at: "2026-11-25T00:00:00+00:00",
  requires_human_confirmation: false,
  knowledge_count: 1,
  context_summary: { recent_events: 1, server_outcomes: 0, history_predictions_7d: 0 },
  knowledge: [
    {
      article_id: "order-create-server-error",
      version: "v1",
      title: "Order 5xx runbook",
      summary: "Confirm whether the order was created before retrying.",
      steps: ["Check the order list.", "Inspect server logs."],
      permission: "employee",
      requires_human_confirmation: false,
      approval_hint: null,
      source: "curated-runbook",
      updated_at: "2026-11-25T00:00:00+00:00",
    },
  ],
};

const renderChat = () =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <EnterpriseAgentChat />
    </NextIntlClientProvider>,
  );

const sendMessage = async () => {
  await userEvent.type(screen.getByLabelText("Message to the Agent"), "Check stock");
  await userEvent.click(screen.getByRole("button", { name: "Send message" }));
};

describe("EnterpriseAgentChat", () => {
  beforeEach(() => {
    h.chat.mockReset().mockResolvedValue(paused);
    h.predict.mockReset().mockResolvedValue(assistancePrediction);
    h.feedback.mockReset().mockResolvedValue(undefined);
    h.decide.mockReset().mockImplementation(async () => h.decisionResult);
    h.resume.mockReset().mockImplementation(async () => h.decisionResult);
    h.decisionResult = {
      reply: "Inventory updated after approval.",
      status: "COMPLETED",
      user_id: "user-1",
      task_id: "task-1",
      trace_id: "trace-2",
    };
    h.permissions = [
      "agent:capabilities:view",
      "agent:chat:run",
      "agent:approval:enterprise-decide",
      "agent:approval:enterprise-resume",
    ];
    h.chatError = null;
    h.decisionError = null;
  });

  it("renders capabilities and the paused tool approval", async () => {
    renderChat();
    expect(screen.getAllByText("inventory.query").length).toBeGreaterThan(0);
    await sendMessage();

    expect(await screen.findByText("Task waiting for approval")).toBeInTheDocument();
    expect(screen.getByText("inventory.adjust")).toBeInTheDocument();
    expect(screen.getByText(/SKU-1/)).toBeInTheDocument();
    expect(h.chat).toHaveBeenCalledWith({ message: "Check stock" });
  });

  it("records approval and resumes only after an explicit resume action", async () => {
    renderChat();
    await sendMessage();
    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(h.decide).toHaveBeenCalledWith({
        approvalId: "approval-1",
        taskId: "task-1",
        decision: "approve",
      }),
    );
    expect(h.resume).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Resume task" }));
    expect(h.resume).toHaveBeenCalledWith("task-1");
    expect(await screen.findByText("Inventory updated after approval.")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("rejects without executing the paused action", async () => {
    h.decisionResult = null;
    renderChat();
    await sendMessage();
    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Rejected")).toBeInTheDocument();
    expect(h.decide).toHaveBeenCalledWith({
      approvalId: "approval-1",
      taskId: "task-1",
      decision: "reject",
    });
    expect(h.resume).not.toHaveBeenCalled();
  });

  it("disables approval actions without the decision permission", async () => {
    h.permissions = ["agent:capabilities:view", "agent:chat:run"];
    renderChat();
    await sendMessage();
    expect(await screen.findByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    expect(screen.getByText(/cannot decide this approval/)).toBeInTheDocument();
  });

  it("requests intervention knowledge and records usefulness feedback", async () => {
    h.permissions.push("agent:assistance:predict", "agent:assistance:feedback");
    renderChat();

    await userEvent.click(screen.getByRole("button", { name: "Request AI assistance" }));

    expect(await screen.findByRole("region", { name: "AI intervention prediction and knowledge" })).toBeInTheDocument();
    expect(screen.getByText("Order 5xx runbook")).toBeInTheDocument();
    expect(h.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        signals: expect.objectContaining({
          module: "platform_agent",
          workflow: "enterprise_chat",
          explicit_help_request: true,
        }),
      }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Order 5xx runbook: Helpful" }),
    );

    expect(h.feedback).toHaveBeenCalledWith(
      {
        predictionId: "prediction-1",
        feedback: {
          needed_assistance: true,
          assistance_used: true,
          task_succeeded: false,
          source: "OPERATOR",
          knowledge_helpful: true,
          knowledge_article_id: "order-create-server-error",
        },
      },
      expect.any(Object),
    );
  });

  it("keeps the user message and shows a request error when chat fails", async () => {
    h.chat.mockRejectedValue(new Error("BFF unavailable"));
    renderChat();
    await sendMessage();

    expect(await screen.findByRole("alert")).toHaveTextContent("BFF unavailable");
    expect(screen.getByText("Check stock")).toBeInTheDocument();
  });

  it("shows approval errors without losing the pending action", async () => {
    h.decide.mockRejectedValue(new Error("Approval service unavailable"));
    renderChat();
    await sendMessage();
    await userEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Approval service unavailable");
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });
});
