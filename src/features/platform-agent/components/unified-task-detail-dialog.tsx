"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermission } from "@/hooks/use-permission";
import { PLATFORM_AGENT_PERMISSIONS } from "@/lib/api/contracts/platform-agent";
import {
  useDecideUnifiedTask,
  useResumeUnifiedTask,
  useUnifiedTaskDetail,
} from "../hooks";
import { formatAgentTime } from "../lib/browser-task";
import { AgentAccessDenied, AgentError, AgentJson, AgentLoading } from "./agent-feedback";

const WAITING_STATUSES = new Set([
  "WAITING",
  "PAUSED",
  "WAITING_APPROVAL",
  "AWAITING_APPROVAL",
]);

function statusVariant(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "SUCCEEDED":
    case "DONE":
      return "success" as const;
    case "FAILED":
    case "CANCELLED":
    case "CANCELED":
    case "REJECTED":
      return "destructive" as const;
    case "WAITING":
    case "PAUSED":
    case "WAITING_APPROVAL":
    case "AWAITING_APPROVAL":
    case "APPROVED":
      return "warning" as const;
    case "RUNNING":
      return "info" as const;
    default:
      return "secondary" as const;
  }
}

export function UnifiedTaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canGet = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksGet);
  const canDecide = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksDecide);
  const canResume = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksResume);
  const activeTaskId = open ? taskId : null;
  const detail = useUnifiedTaskDetail(activeTaskId, { enabled: canGet });
  const decide = useDecideUnifiedTask();
  const resume = useResumeUnifiedTask();
  const task = detail.data;
  const status = (task?.status ?? "").toUpperCase();
  const waiting = WAITING_STATUSES.has(status);
  const approved = status === "APPROVED" && task?.agentType === "ENTERPRISE";
  const actionPending = decide.isPending || resume.isPending;
  const actionError = decide.error ?? resume.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[88vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{t("tasks.detailTitle")}</span>
            {task?.status ? (
              <Badge variant={statusVariant(task.status)}>
                {t.has(`statuses.${status}`) ? t(`statuses.${status}`) : task.status}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {task?.title || task?.summary || t("common.loading")}
          </DialogDescription>
        </DialogHeader>

        {!canGet ? (
          <AgentAccessDenied />
        ) : null}
        {canGet && detail.isLoading ? <AgentLoading rows={5} /> : null}
        {canGet && detail.isError ? (
          <AgentError error={detail.error} onRetry={() => void detail.refetch()} />
        ) : null}

        {canGet && task ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg border border-[var(--color-border-secondary)] bg-sunken/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.id")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{task.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.type")}</p>
                <p className="mt-1 text-[11px]">{t(`agentTypes.${task.agentType}`)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.externalTaskId")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{task.externalTaskId || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.updatedAt")}</p>
                <p className="mt-1 font-mono text-[10px]">{formatAgentTime(task.updatedAt ?? task.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.userId")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{task.userId}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.tenantId")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{task.tenantId}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.createdAt")}</p>
                <p className="mt-1 font-mono text-[10px]">{formatAgentTime(task.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("tasks.approvalId")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{task.approvalId || "-"}</p>
              </div>
            </div>

            {task.summary ? (
              <p className="text-muted-foreground text-[12px] leading-5">{task.summary}</p>
            ) : null}
            {task.payload !== undefined && task.payload !== null ? (
              <AgentJson label={t("tasks.payload")} value={task.payload} />
            ) : null}
            {task.runtime !== undefined && task.runtime !== null ? (
              <AgentJson label={t("tasks.runtime")} value={task.runtime} />
            ) : null}

            {waiting ? (
              <div className="border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] rounded-lg border p-3">
                <p className="text-[var(--color-warning-text)] text-[12px] font-semibold">{t("tasks.waitingTitle")}</p>
                <p className="text-muted-foreground mt-1 text-[11px] leading-5">
                  {task.agentType === "ENTERPRISE" ? t("tasks.enterpriseApprovalHint") : t("tasks.approvalHint")}
                </p>
                {!canDecide ? (
                  <p className="text-muted-foreground mt-2 text-[10px]">{t("permissions.tasksDecideRequired")}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!canDecide || task.canDecide !== true || actionPending}
                    onClick={() => decide.mutate({ taskId: task.id, decision: "approve" })}
                  >
                    {decide.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Check />}
                    {t("common.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canDecide || task.canDecide !== true || actionPending}
                    onClick={() => decide.mutate({ taskId: task.id, decision: "reject" })}
                  >
                    <X />
                    {t("common.reject")}
                  </Button>
                </div>
              </div>
            ) : null}

            {approved ? (
              <div className="border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] rounded-lg border p-3">
                <p className="text-[var(--color-warning-text)] text-[12px] font-semibold">{t("tasks.approvedTitle")}</p>
                <p className="text-muted-foreground mt-1 text-[11px] leading-5">{t("tasks.approvedHint")}</p>
                {!canResume ? (
                  <p className="text-muted-foreground mt-2 text-[10px]">{t("permissions.tasksResumeRequired")}</p>
                ) : null}
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!canResume || task.canResume !== true || actionPending}
                  onClick={() => resume.mutate(task.id)}
                >
                  {resume.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : null}
                  {t("common.resume")}
                </Button>
              </div>
            ) : null}

            {actionError ? <AgentError error={actionError} /> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
