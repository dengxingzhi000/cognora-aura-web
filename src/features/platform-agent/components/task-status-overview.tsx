"use client";

import { useTranslations } from "next-intl";

import type { UnifiedTask } from "@/lib/api/contracts/platform-agent";
import { cn } from "@/lib/utils";

const GROUPS: ReadonlyArray<{ key: string; statuses: readonly string[]; color: string }> = [
  { key: "running", statuses: ["PENDING", "QUEUED", "RUNNING"], color: "bg-[var(--color-info)]" },
  { key: "waiting", statuses: ["WAITING", "PAUSED", "WAITING_APPROVAL", "AWAITING_APPROVAL"], color: "bg-[var(--color-warning)]" },
  { key: "approved", statuses: ["APPROVED"], color: "bg-[var(--color-primary)]" },
  { key: "completed", statuses: ["COMPLETED", "SUCCEEDED", "DONE"], color: "bg-[var(--color-success)]" },
  { key: "failed", statuses: ["FAILED", "CANCELLED", "CANCELED", "REJECTED"], color: "bg-[var(--color-error)]" },
] as const;
export function TaskStatusOverview({ tasks }: { tasks: UnifiedTask[] }) {
  const t = useTranslations("platformAgent");
  if (tasks.length === 0) return null;

  const counts = GROUPS.map((group) => ({
    ...group,
    count: tasks.filter((task) => group.statuses.includes(task.status.toUpperCase())).length,
  }));
  const knownTotal = counts.reduce((total, item) => total + item.count, 0);
  const denominator = Math.max(tasks.length, knownTotal);

  return (
    <section className="bg-card rounded-lg border border-[var(--color-border-secondary)] p-4" aria-label={t("tasks.distribution")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[12px] font-semibold">{t("tasks.distribution")}</h2>
        <span className="text-muted-foreground text-[10px]">{t("tasks.currentPage", { count: tasks.length })}</span>
      </div>
      <div className="bg-sunken mt-3 flex h-2 overflow-hidden rounded-full" role="img" aria-label={t("tasks.distribution")}>
        {counts.filter((item) => item.count > 0).map((item) => (
          <span
            key={item.key}
            className={cn("h-full", item.color)}
            style={{ width: `${(item.count / denominator) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {counts.map((item) => (
          <span key={item.key} className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
            <span className={cn("size-1.5 rounded-full", item.color)} />
            {t.has(`statuses.${item.key.toUpperCase()}`) ? t(`statuses.${item.key.toUpperCase()}`) : item.key}
            <span className="text-foreground font-medium tabular-nums">{item.count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
