"use client";

import { useState } from "react";
import { Activity, Bot, Globe2, ListTodo, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { usePermission } from "@/hooks/use-permission";
import { PLATFORM_AGENT_PERMISSIONS } from "@/lib/api/contracts/platform-agent";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { AgentAccessDenied, AgentLoading } from "./agent-feedback";
import { AgentOverview } from "./agent-overview";
import { AssistanceDashboard } from "./assistance-dashboard";
import { BrowserAutomation } from "./browser-automation";
import { EnterpriseAgentChat } from "./enterprise-agent-chat";
import { TaskCenter } from "./task-center";

type AgentTab = "enterprise" | "browser" | "tasks" | "assistance";

const TABS = [
  { key: "enterprise" as const, icon: Bot },
  { key: "browser" as const, icon: Globe2 },
  { key: "tasks" as const, icon: ListTodo },
  { key: "assistance" as const, icon: Activity },
];

export function PlatformAgentWorkbench() {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const authLoading = useAuthStore((state) => state.isLoading);
  const [selectedTab, setSelectedTab] = useState<AgentTab | null>(null);
  const canViewAgent = hasPermission(PLATFORM_AGENT_PERMISSIONS.chat);
  const canViewBrowser = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserList);
  const canViewTasks =
    hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksList) ||
    hasPermission(PLATFORM_AGENT_PERMISSIONS.approvalsList);
  const canViewAssistance = hasPermission(PLATFORM_AGENT_PERMISSIONS.assistanceDashboardView);
  const canReadCapabilities = hasPermission(PLATFORM_AGENT_PERMISSIONS.capabilities);
  const access: Record<AgentTab, boolean> = {
    enterprise: canViewAgent,
    browser: canViewBrowser,
    tasks: canViewTasks,
    assistance: canViewAssistance,
  };
  const tab =
    selectedTab ??
    (canViewAgent ? "enterprise" : canViewBrowser ? "browser" : canViewTasks ? "tasks" : "assistance");
  const hasAccess = Object.values(access).some(Boolean);

  const selectTab = (next: AgentTab) => setSelectedTab(next);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="max-w-3xl"
        actions={
          <Badge variant="outline">
            <ShieldCheck />
            {t("securityMode")}
          </Badge>
        }
      />

      {authLoading ? <AgentLoading rows={5} /> : null}

      {!authLoading && !hasAccess ? (
        <AgentAccessDenied />
      ) : null}

      {!authLoading && hasAccess ? (
        <>
          <AgentOverview />
          <div
            role="tablist"
            aria-label={t("title")}
            className="bg-card sticky top-[calc(var(--header-height)+12px)] z-30 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--color-border-secondary)] p-1 shadow-xs"
          >
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  id={`platform-agent-${item.key}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`platform-agent-${item.key}-panel`}
                  disabled={!access[item.key]}
                  tabIndex={active ? 0 : -1}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-md px-3 text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:ring-[var(--color-ring)]/50 focus-visible:ring-[3px] focus-visible:outline-none sm:px-4",
                    active
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] border border-[var(--color-primary)]/15"
                      : "text-muted-foreground hover:bg-sunken hover:text-foreground border border-transparent",
                  )}
                  onClick={() => selectTab(item.key)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const currentIndex = TABS.findIndex((candidate) => candidate.key === tab);
                    const direction = event.key === "ArrowRight" ? 1 : -1;
                    for (let step = 1; step <= TABS.length; step += 1) {
                      const next =
                        TABS[(currentIndex + direction * step + TABS.length) % TABS.length];
                      if (!access[next.key]) continue;
                      selectTab(next.key);
                      document.getElementById(`platform-agent-${next.key}-tab`)?.focus();
                      break;
                    }
                  }}
                >
                  <Icon className="size-4" />
                  {t(`tabs.${item.key}`)}
                </button>
              );
            })}
          </div>

          {tab === "enterprise" ? (
            canViewAgent ? (
              <EnterpriseAgentChat />
            ) : (
              <AgentAccessDenied />
            )
          ) : tab === "browser" ? (
            canViewBrowser ? (
              <BrowserAutomation canReadCapabilities={canReadCapabilities} />
            ) : (
              <AgentAccessDenied />
            )
          ) : tab === "tasks" ? (
            canViewTasks ? (
              <TaskCenter />
            ) : (
              <AgentAccessDenied />
            )
          ) : canViewAssistance ? (
            <AssistanceDashboard />
          ) : (
            <AgentAccessDenied />
          )}
        </>
      ) : null}
    </div>
  );
}
