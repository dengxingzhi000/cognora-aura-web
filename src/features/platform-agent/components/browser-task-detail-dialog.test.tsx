import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";

const h = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
  download: vi.fn(),
  permissions: ["agent:browser:artifacts:list", "agent:browser:artifacts:view"],
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: () => ({
    hasPermission: (code: string) => h.permissions.includes(code) || h.permissions.includes("*"),
  }),
}));

vi.mock("../lib/browser-task", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/browser-task")>();
  return { ...actual, downloadAgentArtifact: vi.fn() };
});

vi.mock("../hooks", () => ({
  useBrowserTaskDetail: () => ({
    data: {
      taskId: "task-1",
      taskType: "supplier_review",
      status: "WAITING_APPROVAL",
      executionMode: "require_approval",
      target: { system: "SRM", url: "https://srm.example.test" },
      pendingApproval: {
        stepIndex: 3,
        action: "click",
        targetName: "Submit supplier",
        args: { supplierId: "SUP-1" },
      },
      approvals: [{ approvalId: "approval-old", tool: "supplier.read", status: "APPROVED" }],
      error: { message: "Target page timed out" },
      totals: { steps: 2, retries: 1 },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBrowserTaskSteps: () => ({
    data: [
      { stepId: "step-1", name: "Open target", status: "COMPLETED" },
      { stepId: "step-2", name: "Submit supplier", status: "WAITING_APPROVAL" },
    ],
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBrowserTaskArtifacts: () => ({
    data: {
      artifacts: [{
        artifactId: "a".repeat(64),
        kind: "screenshot",
        fileName: "approval.png",
        mediaType: "image/png",
        sizeBytes: 1024,
        modifiedAt: "2026-11-25T10:00:00Z",
        downloadUrl: "/artifact",
      }],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useDownloadBrowserTaskArtifact: () => ({ mutateAsync: h.download, isPending: false, error: null }),
  useApproveBrowserTask: () => ({ mutate: h.approve, isPending: false, error: null }),
  useRejectBrowserTask: () => ({ mutate: h.reject, isPending: false, error: null }),
  useCancelBrowserTask: () => ({ mutate: h.cancel, isPending: false, error: null }),
  isActiveBrowserTask: (task: { status?: string }) => task?.status === "WAITING_APPROVAL",
}));

import { BrowserTaskDetailDialog } from "./browser-task-detail-dialog";

const renderDetail = (canApprove = true, canReject = true, canCancel = true) =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <BrowserTaskDetailDialog
        taskId="task-1"
        open
        onOpenChange={vi.fn()}
        canApprove={canApprove}
        canReject={canReject}
        canCancel={canCancel}
      />
    </NextIntlClientProvider>,
  );

describe("BrowserTaskDetailDialog", () => {
  beforeEach(() => {
    h.approve.mockReset();
    h.reject.mockReset();
    h.cancel.mockReset();
    h.download.mockReset().mockResolvedValue(new Blob(["png"]));
    h.permissions = ["agent:browser:artifacts:list", "agent:browser:artifacts:view"];
  });

  it("shows steps, approval history, pending arguments, errors and totals", () => {
    renderDetail();
    expect(screen.getByText("Browser task details")).toBeInTheDocument();
    expect(screen.getByText("Open target")).toBeInTheDocument();
    expect(screen.getAllByText("Submit supplier").length).toBeGreaterThan(0);
    expect(screen.getByText("supplier.read")).toBeInTheDocument();
    expect(screen.getAllByText(/Target page timed out/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/retries/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Submit supplier").length).toBeGreaterThan(0);
  });

  it("lists and downloads opaque task artifacts", async () => {
    renderDetail();
    expect(screen.getByText("approval.png")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(h.download).toHaveBeenCalledWith({
      taskId: "task-1",
      artifact: expect.objectContaining({ artifactId: "a".repeat(64), fileName: "approval.png" }),
    });
  });

  it("posts approve, reject and cancel actions for the open task", async () => {
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(h.approve).toHaveBeenCalledWith("task-1");
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(h.reject).toHaveBeenCalledWith("task-1");
    await userEvent.click(screen.getByRole("button", { name: "Cancel task" }));
    expect(h.cancel).toHaveBeenCalledWith("task-1");
  });

  it("disables protected actions and explains the missing permissions", () => {
    renderDetail(false, false, false);
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel task" })).toBeDisabled();
    expect(screen.getByText(/cannot approve or reject this step/)).toBeInTheDocument();
    expect(screen.getByText(/cannot cancel tasks/)).toBeInTheDocument();
  });
});
