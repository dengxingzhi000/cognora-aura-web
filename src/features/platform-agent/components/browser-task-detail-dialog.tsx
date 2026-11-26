"use client";

import {
  Check,
  Download,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
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
import {
  PLATFORM_AGENT_PERMISSIONS,
  type BrowserTaskArtifact,
} from "@/lib/api/contracts/platform-agent";
import {
  useApproveBrowserTask,
  useBrowserTaskArtifacts,
  useBrowserTaskDetail,
  useBrowserTaskSteps,
  useCancelBrowserTask,
  useDownloadBrowserTaskArtifact,
  useRejectBrowserTask,
  isActiveBrowserTask,
} from "../hooks";
import {
  browserApprovalId,
  browserTaskId,
  browserTaskType,
  browserTargetSystem,
  downloadAgentArtifact,
  formatAgentBytes,
  formatAgentTime,
  formatAgentValue,
  normalizeBrowserSteps,
} from "../lib/browser-task";
import { AgentError, AgentJson, AgentLoading } from "./agent-feedback";

function ArtifactIcon({ artifact }: { artifact: BrowserTaskArtifact }) {
  if (artifact.kind === "screenshot" || artifact.mediaType.startsWith("image/")) return <FileImage className="size-4" />;
  if (artifact.mediaType.includes("csv") || artifact.mediaType.includes("spreadsheet")) return <FileSpreadsheet className="size-4" />;
  if (artifact.mediaType.includes("json")) return <FileJson className="size-4" />;
  return <FileText className="size-4" />;
}

function statusVariant(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "SUCCEEDED":
    case "APPROVED":
      return "success" as const;
    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
      return "destructive" as const;
    case "WAITING_APPROVAL":
    case "PAUSED":
      return "warning" as const;
    case "RUNNING":
      return "info" as const;
    default:
      return "secondary" as const;
  }
}

export function BrowserTaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  canApprove,
  canReject,
  canCancel,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
}) {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canListArtifacts = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserArtifactsList);
  const canViewArtifacts = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserArtifactsView);
  const activeTaskId = open ? taskId : null;
  const detail = useBrowserTaskDetail(activeTaskId);
  const stepsQuery = useBrowserTaskSteps(activeTaskId, {
    polling: isActiveBrowserTask(detail.data),
  });
  const artifactsQuery = useBrowserTaskArtifacts(activeTaskId, {
    enabled: canListArtifacts,
    polling: isActiveBrowserTask(detail.data),
  });
  const approve = useApproveBrowserTask();
  const reject = useRejectBrowserTask();
  const cancel = useCancelBrowserTask();
  const downloadArtifact = useDownloadBrowserTaskArtifact();

  const task = detail.data;
  const steps = stepsQuery.data
    ? normalizeBrowserSteps(stepsQuery.data)
    : task?.steps ?? [];
  const approvals = task?.approvals ?? [];
  const pending = task?.pendingApproval;
  const pendingId = browserApprovalId(pending);
  const waiting = ["WAITING_APPROVAL", "PAUSED", "AWAITING_APPROVAL"].includes(
    (task?.status ?? "").toUpperCase(),
  ) || Boolean(pending);
  const terminal = ["COMPLETED", "SUCCEEDED", "FAILED", "CANCELLED", "REJECTED"].includes(
    (task?.status ?? "").toUpperCase(),
  );
  const actionPending = approve.isPending || reject.isPending || cancel.isPending;
  const actionError = approve.error ?? reject.error ?? cancel.error;
  const artifacts = artifactsQuery.data?.artifacts ?? [];

  const act = (action: "approve" | "reject" | "cancel") => {
    if (!taskId || actionPending) return;
    const mutation = action === "approve" ? approve : action === "reject" ? reject : cancel;
    mutation.mutate(taskId);
  };

  const download = async (artifact: BrowserTaskArtifact) => {
    if (!taskId || !canViewArtifacts || downloadArtifact.isPending) return;
    try {
      const blob = await downloadArtifact.mutateAsync({ taskId, artifact });
      downloadAgentArtifact(blob, artifact.fileName);
    } catch {
      // The mutation error is rendered with the artifact list.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[88vh] max-w-4xl overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{t("browser.detailsTitle")}</span>
            {task?.status ? (
              <Badge variant={statusVariant(task.status)}>
                {t.has(`statuses.${task.status}`) ? t(`statuses.${task.status}`) : task.status}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {task ? `${browserTaskType(task)} · ${browserTargetSystem(task)}` : t("common.loading")}
          </DialogDescription>
        </DialogHeader>

        {detail.isLoading ? <AgentLoading rows={5} /> : null}
        {detail.isError ? (
          <AgentError error={detail.error} onRetry={() => void detail.refetch()} />
        ) : null}

        {task ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg border border-[var(--color-border-secondary)] bg-sunken/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("browser.taskId")}</p>
                <p className="mt-1 font-mono text-[10px] break-all">{browserTaskId(task) || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("browser.workflow")}</p>
                <p className="mt-1 text-[11px]">{browserTaskType(task)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("browser.targetSystem")}</p>
                <p className="mt-1 text-[11px]">{browserTargetSystem(task)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] tracking-[0.08em] uppercase">{t("browser.createdAt")}</p>
                <p className="mt-1 font-mono text-[10px]">{formatAgentTime(task.createdAt ?? task.created_at)}</p>
              </div>
            </div>

            {pending || waiting ? (
              <section className="border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="text-[var(--color-warning-text)] mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[var(--color-warning-text)] text-[12px] font-semibold">{t("browser.pendingApproval")}</h3>
                    {pending ? (
                      <>
                        <p className="mt-1 font-mono text-[11px]">{pending.targetName ?? pending.action ?? pending.tool ?? pendingId ?? "-"}</p>
                        <AgentJson label={t("browser.approvalArgs")} value={pending.args ?? pending} />
                      </>
                    ) : (
                      <p className="text-muted-foreground mt-1 text-[11px]">{t("browser.noPendingApproval")}</p>
                    )}
                    {!canApprove || !canReject ? (
                      <p className="text-muted-foreground mt-2 text-[10px]">{t("permissions.browserDecisionRequired")}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={!canApprove || !waiting || actionPending}
                        onClick={() => act("approve")}
                      >
                        {approve.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Check />}
                        {t("common.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canReject || !waiting || actionPending}
                        onClick={() => act("reject")}
                      >
                        <X />
                        {t("common.reject")}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {actionError ? <AgentError error={actionError} /> : null}

            {task.error !== undefined && task.error !== null && task.error !== "" ? (
              <AgentJson label={t("browser.error")} value={task.error} />
            ) : null}

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold">{t("browser.steps")}</h3>
                <Badge variant="secondary">{steps.length}</Badge>
              </div>
              {stepsQuery.isError ? (
                <AgentError error={stepsQuery.error} onRetry={() => void stepsQuery.refetch()} />
              ) : null}
              {steps.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-6 text-center text-[11px]">
                  {t("browser.noSteps")}
                </p>
              ) : (
                <ol className="space-y-3 border-l border-[var(--color-border-strong)] pl-4">
                  {steps.map((step, index) => (
                    <li key={step.stepId ?? step.id ?? index} className="relative">
                      <span className="bg-card absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-[var(--color-primary)]" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium">
                          {step.title ?? step.name ?? step.description ?? step.action ?? step.tool ?? `${t("browser.step")} ${index + 1}`}
                        </span>
                        {step.status ? (
                          <Badge variant={statusVariant(step.status)}>
                            {t.has(`statuses.${step.status}`) ? t(`statuses.${step.status}`) : step.status}
                          </Badge>
                        ) : null}
                        <span className="text-muted-foreground ml-auto font-mono text-[9px]">
                          {formatAgentTime(step.startedAt)}
                        </span>
                      </div>
                      {step.error !== undefined && step.error !== null && step.error !== "" ? (
                        <pre className="bg-[var(--color-error-soft)] text-[var(--color-error-text)] mt-1.5 max-h-32 overflow-auto rounded p-2 text-[10px] whitespace-pre-wrap break-all">
                          {formatAgentValue(step.error)}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold">{t("browser.approvals")}</h3>
                <Badge variant="secondary">{approvals.length}</Badge>
              </div>
              {approvals.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-6 text-center text-[11px]">
                  {t("browser.noApprovals")}
                </p>
              ) : (
                <div className="space-y-2">
                  {approvals.map((approval, index) => (
                    <div key={browserApprovalId(approval) || index} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border-secondary)] px-3 py-2">
                      <span className="font-mono text-[10px]">{approval.tool ?? browserApprovalId(approval) ?? "-"}</span>
                      {approval.status ? (
                        <Badge variant={statusVariant(approval.status)}>
                          {t.has(`statuses.${approval.status}`) ? t(`statuses.${approval.status}`) : approval.status}
                        </Badge>
                      ) : null}
                      <span className="text-muted-foreground ml-auto text-[9px]">{formatAgentTime(approval.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold">{t("browser.artifacts")}</h3>
                <Badge variant="secondary">{artifacts.length}</Badge>
              </div>
              {!canListArtifacts ? (
                <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px]">{t("permissions.browserArtifactsListRequired")}</p>
              ) : null}
              {canListArtifacts && artifactsQuery.isLoading ? <AgentLoading rows={2} /> : null}
              {canListArtifacts && artifactsQuery.isError ? (
                <AgentError error={artifactsQuery.error} onRetry={() => void artifactsQuery.refetch()} />
              ) : null}
              {downloadArtifact.error ? <AgentError error={downloadArtifact.error} /> : null}
              {canListArtifacts && !artifactsQuery.isLoading && !artifactsQuery.isError && artifacts.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed border-[var(--color-border-strong)] px-3 py-5 text-center text-[11px]">{t("browser.noArtifacts")}</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {artifacts.map((artifact) => (
                  <div key={artifact.artifactId} className="bg-card flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border-secondary)] p-3 transition-colors hover:border-[var(--color-primary)]/30">
                    <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex size-9 shrink-0 items-center justify-center rounded-md">
                      <ArtifactIcon artifact={artifact} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{artifact.fileName}</p>
                      <p className="text-muted-foreground mt-0.5 truncate text-[9px]">{artifact.kind} · {formatAgentBytes(artifact.sizeBytes)}</p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[8px]">{artifact.mediaType}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      aria-label={t("browser.downloadArtifact")}
                      disabled={!canViewArtifacts || downloadArtifact.isPending}
                      onClick={() => void download(artifact)}
                    >
                      {downloadArtifact.isPending ? <LoaderCircle className="size-4 motion-safe:animate-spin" /> : <Download className="size-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {task.totals ? <AgentJson label={t("browser.totals")} value={task.totals} /> : null}

            <details className="rounded-lg border border-[var(--color-border-secondary)]">
              <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-[11px]">{t("browser.payload")}</summary>
              <pre className="bg-sunken max-h-64 overflow-auto rounded-b-lg p-3 font-mono text-[10px] leading-5 whitespace-pre-wrap break-all">
                {formatAgentValue(task)}
              </pre>
            </details>
          </div>
        ) : null}

        <DialogFooter>
          {!canCancel ? (
            <span className="text-muted-foreground mr-auto text-[10px]">{t("permissions.browserCancelRequired")}</span>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
          <Button
            variant="destructive"
            disabled={!canCancel || !task || terminal || actionPending}
            onClick={() => act("cancel")}
          >
            {cancel.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : null}
            {t("browser.cancelTask")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
