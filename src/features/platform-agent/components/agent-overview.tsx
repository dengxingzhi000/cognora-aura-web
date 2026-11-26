"use client";

import type { ReactNode } from "react";
import {
  CircleCheck,
  CircleX,
  ListTodo,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/use-permission";
import { PLATFORM_AGENT_PERMISSIONS } from "@/lib/api/contracts/platform-agent";
import { cn } from "@/lib/utils";
import {
  useAgentCapabilities,
  useUnifiedApprovals,
  useUnifiedTasks,
} from "../hooks";

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="bg-card relative min-w-0 overflow-hidden rounded-lg border border-[var(--color-border-secondary)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
            {label}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[22px] leading-none font-semibold tabular-nums">
            {value}
          </div>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            tone === "success" && "border-[var(--color-success)]/20 bg-[var(--color-success-soft)] text-[var(--color-success-text)]",
            tone === "warning" && "border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]",
            tone === "neutral" && "border-[var(--color-border-secondary)] bg-sunken text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="text-muted-foreground mt-3 truncate text-[10px]">{detail}</p>
    </div>
  );
}

export function AgentOverview() {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canViewTasks = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksList);
  const canViewApprovals = hasPermission(PLATFORM_AGENT_PERMISSIONS.approvalsList);
  const canReadCapabilities = hasPermission(PLATFORM_AGENT_PERMISSIONS.capabilities);
  const capabilities = useAgentCapabilities({ enabled: canReadCapabilities });
  const tasks = useUnifiedTasks({ limit: 1 }, { enabled: canViewTasks });
  const approvals = useUnifiedApprovals({ limit: 1 }, { enabled: canViewApprovals });
  const runtimeOnline = canReadCapabilities && capabilities.isSuccess;
  const runtimeLoading = canReadCapabilities && capabilities.isLoading;
  const tools = capabilities.data?.enterprise.tools.length ?? 0;

  return (
    <section aria-label={t("overview.title")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={!canReadCapabilities ? <LockKeyhole className="size-4" /> : runtimeOnline ? <CircleCheck className="size-4" /> : runtimeLoading ? <LoaderCircle className="size-4 motion-safe:animate-spin" /> : <CircleX className="size-4" />}
        label={t("overview.runtime")}
        value={!canReadCapabilities ? t("overview.restricted") : runtimeLoading ? "—" : runtimeOnline ? t("overview.online") : t("overview.offline")}
        detail={!canReadCapabilities ? t("permissions.capabilitiesRequired") : runtimeOnline ? t("overview.tools", { count: tools }) : t("overview.runtimeHint")}
        tone={!canReadCapabilities ? "neutral" : runtimeOnline ? "success" : runtimeLoading ? "neutral" : "warning"}
      />
      {canViewTasks ? (
        <MetricCard
          icon={<ListTodo className="size-4" />}
          label={t("overview.tasks")}
          value={tasks.isLoading ? "—" : tasks.data?.total ?? 0}
          detail={t("overview.tasksHint")}
        />
      ) : null}
      {canViewApprovals ? (
        <MetricCard
          icon={<ShieldCheck className="size-4" />}
          label={t("overview.approvals")}
          value={approvals.isLoading ? "—" : approvals.data?.total ?? 0}
          detail={t("overview.approvalsHint")}
          tone={(approvals.data?.total ?? 0) > 0 ? "warning" : "success"}
        />
      ) : null}
      <MetricCard
        icon={<Wrench className="size-4" />}
        label={t("overview.security")}
        value={<span className="text-[15px] leading-6">{t("overview.humanApproval")}</span>}
        detail={t("overview.securityHint")}
      />
    </section>
  );
}
