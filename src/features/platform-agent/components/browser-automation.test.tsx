import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";

const h = vi.hoisted(() => ({
  permissions: ["agent:capabilities:view", "agent:browser:tasks:list", "agent:browser:tasks:create", "agent:browser:approve", "agent:browser:reject", "agent:browser:cancel"],
  create: vi.fn(),
  createError: null as unknown,
  listParams: undefined as Record<string, unknown> | undefined,
  tasks: {
    data: { records: [] as Array<Record<string, unknown>>, total: 0, limit: 20, offset: 0 },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: () => ({
    hasPermission: (code: string) => h.permissions.includes(code) || h.permissions.includes("*"),
  }),
}));

vi.mock("../hooks", () => ({
  useAgentCapabilities: () => ({
    data: {
      enterprise: { tools: [], knowledge: true, memory: true, workflows: true, mcpInstalled: false },
      browser: {
        tools: [],
        workflows: [
          { name: "supplier_review", description: "Review supplier documents" },
          { name: "invoice_reconcile", description: "Reconcile an invoice" },
        ],
        approvalRequiredForSensitiveActions: true,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBrowserTasks: (query: Record<string, unknown>) => {
    h.listParams = query;
    return h.tasks;
  },
  useCreateBrowserTask: () => ({
    mutateAsync: h.create,
    isPending: false,
    error: h.createError,
  }),
  isActiveBrowserTask: (task: { status?: string }) => ["PENDING", "RUNNING", "WAITING_APPROVAL"].includes(task.status ?? ""),
}));

vi.mock("./browser-task-detail-dialog", () => ({
  BrowserTaskDetailDialog: ({ taskId, open }: { taskId: string | null; open: boolean }) =>
    open ? <div role="dialog">task detail {taskId}</div> : null,
}));

import { BrowserAutomation } from "./browser-automation";

const renderBrowser = () =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <BrowserAutomation canReadCapabilities />
    </NextIntlClientProvider>,
  );

const fillForm = async (input = '{"supplierId":"SUP-1"}') => {
  await userEvent.type(screen.getByLabelText("Target system"), "SRM");
  await userEvent.type(screen.getByLabelText("Target URL"), "https://srm.example.test");
  const inputField = screen.getByLabelText("Task input (JSON)");
  await userEvent.clear(inputField);
  await userEvent.click(inputField);
  await userEvent.paste(input);
};

describe("BrowserAutomation", () => {
  beforeEach(() => {
    h.permissions = ["agent:capabilities:view", "agent:browser:tasks:list", "agent:browser:tasks:create", "agent:browser:approve", "agent:browser:reject", "agent:browser:cancel"];
    h.create.mockReset().mockResolvedValue({ taskId: "task-new", status: "RUNNING" });
    h.createError = null;
    h.listParams = undefined;
    h.tasks = {
      data: { records: [], total: 0, limit: 20, offset: 0 },
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("creates a task with the selected workflow and parsed JSON input", async () => {
    renderBrowser();
    expect(screen.getByText("Review supplier documents")).toBeInTheDocument();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Run task" }));

    await waitFor(() =>
      expect(h.create).toHaveBeenCalledWith({
        request: {
          taskType: "supplier_review",
          target: { system: "SRM", url: "https://srm.example.test" },
          input: { supplierId: "SUP-1" },
          executionMode: "require_approval",
        },
        idempotencyKey: expect.any(String),
      }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent("task-new");
    expect(h.listParams).toMatchObject({ offset: 0, limit: 20 });
  });

  it("rejects invalid JSON before calling the BFF", async () => {
    renderBrowser();
    await fillForm("{broken");
    await userEvent.click(screen.getByRole("button", { name: "Run task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("valid JSON");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("requires a JSON object rather than an array", async () => {
    renderBrowser();
    await fillForm("[]");
    await userEvent.click(screen.getByRole("button", { name: "Run task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("JSON object");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("shows task loading, empty and error states distinctly", () => {
    h.tasks.isLoading = true;
    const { unmount } = renderBrowser();
    expect(screen.queryByText(/No browser tasks yet/)).not.toBeInTheDocument();
    unmount();

    h.tasks.isLoading = false;
    const empty = renderBrowser();
    expect(screen.getByText(/No browser tasks yet/)).toBeInTheDocument();
    empty.unmount();

    h.tasks.isError = true;
    h.tasks.error = new Error("Task service unavailable");
    renderBrowser();
    expect(screen.getByRole("alert")).toHaveTextContent("Task service unavailable");
  });

  it("requests the next offset and opens a task detail", async () => {
    h.tasks.data = {
      records: [{ taskId: "task-1", taskType: "supplier_review", status: "RUNNING", target: { system: "SRM" } }],
      total: 25,
      limit: 20,
      offset: 0,
    };
    renderBrowser();
    expect(screen.getByText("1 active")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(h.listParams).toMatchObject({ offset: 20 });
    await userEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("task-1");
  });

  it("reuses the same idempotency key when a failed create is retried", async () => {
    h.create.mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ taskId: "task-retry", status: "PENDING" });
    renderBrowser();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Run task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("AI Agent request failed");
    await userEvent.click(screen.getByRole("button", { name: "Run task" }));
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(2));
    expect(h.create.mock.calls[0][0].idempotencyKey).toBe(h.create.mock.calls[1][0].idempotencyKey);
  });

  it("disables execution and explains the missing permission", () => {
    h.permissions = ["agent:browser:tasks:list"];
    renderBrowser();
    expect(screen.getByRole("button", { name: "Run task" })).toBeDisabled();
    expect(screen.getByText(/cannot run browser tasks/)).toBeInTheDocument();
  });
});
