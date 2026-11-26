import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";
import type { UnifiedTaskDetail } from "@/lib/api/contracts/platform-agent";

const h = vi.hoisted(() => ({
  task: null as UnifiedTaskDetail | null,
  permissions: ["agent:tasks:get", "agent:tasks:decide", "agent:tasks:resume"],
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: () => ({
    hasPermission: (code: string) => h.permissions.includes(code) || h.permissions.includes("*"),
  }),
}));

vi.mock("../hooks", () => ({
  useUnifiedTaskDetail: () => ({
    data: h.task,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useDecideUnifiedTask: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useResumeUnifiedTask: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

import { UnifiedTaskDetailDialog } from "./unified-task-detail-dialog";

const baseTask: UnifiedTaskDetail = {
  id: "task-1",
  tenantId: "tenant-1",
  userId: "owner-1",
  agentType: "ENTERPRISE",
  externalTaskId: "runtime-1",
  status: "WAITING_APPROVAL",
  approvalId: "approval-1",
};

const renderDetail = () =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <UnifiedTaskDetailDialog taskId="task-1" open onOpenChange={vi.fn()} />
    </NextIntlClientProvider>,
  );

describe("UnifiedTaskDetailDialog", () => {
  beforeEach(() => {
    h.permissions = ["agent:tasks:get", "agent:tasks:decide", "agent:tasks:resume"];
    h.task = { ...baseTask, canDecide: true, canResume: false };
  });

  it("honors the server-side self-approval guard", () => {
    h.task = { ...baseTask, canDecide: false, canResume: false };
    renderDetail();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("only enables resume for an approved task owned by the caller", () => {
    h.task = { ...baseTask, status: "APPROVED", approvalId: null, canDecide: false, canResume: false };
    const first = renderDetail();
    expect(screen.getByRole("button", { name: "Resume task" })).toBeDisabled();
    first.unmount();

    h.task = { ...baseTask, status: "APPROVED", approvalId: null, canDecide: false, canResume: true };
    renderDetail();
    expect(screen.getByRole("button", { name: "Resume task" })).toBeEnabled();
  });
});
