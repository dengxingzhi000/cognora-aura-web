import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";

const h = vi.hoisted(() => ({
  permissions: ["agent:chat:run", "agent:browser:tasks:list", "agent:tasks:list"],
  loading: false,
}));

vi.mock("@/hooks/use-permission", () => ({
  usePermission: () => ({
    hasPermission: (code: string) => h.permissions.includes(code) || h.permissions.includes("*"),
  }),
}));

vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector: (state: { isLoading: boolean }) => unknown) =>
    selector({ isLoading: h.loading }),
}));

vi.mock("./agent-overview", () => ({
  AgentOverview: () => <div>agent overview</div>,
}));

vi.mock("./enterprise-agent-chat", () => ({
  EnterpriseAgentChat: () => <div>enterprise panel</div>,
}));

vi.mock("./browser-automation", () => ({
  BrowserAutomation: () => <div>browser panel</div>,
}));

vi.mock("./task-center", () => ({
  TaskCenter: () => <div>task center panel</div>,
}));

vi.mock("./assistance-dashboard", () => ({
  AssistanceDashboard: () => <div>assistance dashboard panel</div>,
}));

import { PlatformAgentWorkbench } from "./platform-agent-workbench";

const renderWorkbench = () =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <PlatformAgentWorkbench />
    </NextIntlClientProvider>,
  );

describe("PlatformAgentWorkbench", () => {
  beforeEach(() => {
    h.permissions = ["agent:chat:run", "agent:browser:tasks:list", "agent:tasks:list"];
    h.loading = false;
  });

  it("switches between enterprise, browser and task center tabs", async () => {
    renderWorkbench();
    expect(screen.getByText("enterprise panel")).toBeInTheDocument();
    expect(screen.getByText("agent overview")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Browser Automation" }));
    expect(screen.getByText("browser panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Browser Automation" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Task Center" }));
    expect(screen.getByText("task center panel")).toBeInTheDocument();
  });

  it("opens the permitted browser tab when enterprise chat is not allowed", () => {
    h.permissions = ["agent:browser:tasks:list"];
    renderWorkbench();
    expect(screen.getByText("browser panel")).toBeInTheDocument();
  });

  it("opens the task center for task-only permissions", () => {
    h.permissions = ["agent:tasks:list"];
    renderWorkbench();
    expect(screen.getByText("task center panel")).toBeInTheDocument();
  });

  it("opens the assistance dashboard for dashboard-only permissions", () => {
    h.permissions = ["agent:assistance:dashboard:view"];
    renderWorkbench();
    expect(screen.getByText("assistance dashboard panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "AI Assistance Loop" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("explains missing access without exposing permission codes", () => {
    h.permissions = [];
    renderWorkbench();
    expect(screen.getByRole("heading", { name: "AI Agent access denied" })).toBeInTheDocument();
    expect(screen.getByText(/Your account does not have access to this workbench/)).toBeInTheDocument();
    expect(screen.queryByText(/agent:chat:run/)).not.toBeInTheDocument();
  });

  it("shows a loading state while the session permissions initialize", () => {
    h.loading = true;
    renderWorkbench();
    expect(screen.getByRole("status", { name: "Loading AI Agent data" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
