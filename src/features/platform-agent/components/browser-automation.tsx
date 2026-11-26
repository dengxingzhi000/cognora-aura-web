"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmpty, TableLoading, TablePanel, TableToolbar, TableToolbarEnd } from "@/components/ui/table-shell";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PLATFORM_AGENT_PERMISSIONS,
  type BrowserExecutionMode,
  type CreateBrowserTaskRequest,
} from "@/lib/api/contracts/platform-agent";
import { usePermission } from "@/hooks/use-permission";
import {
  useAgentCapabilities,
  useBrowserTasks,
  useCreateBrowserTask,
  isActiveBrowserTask,
} from "../hooks";
import {
  browserTaskId,
  browserTaskType,
  browserTargetSystem,
  formatAgentTime,
} from "../lib/browser-task";
import { AgentError } from "./agent-feedback";
import { BrowserTaskDetailDialog } from "./browser-task-detail-dialog";

const PAGE_SIZE = 20;
const ALL_STATUS = "__all__";
const STATUS_FILTERS = ["PENDING", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"];

function statusVariant(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
    case "SUCCEEDED":
      return "success" as const;
    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
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

export function BrowserAutomation({ canReadCapabilities }: { canReadCapabilities: boolean }) {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserCreate);
  const canApprove = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserApprove);
  const canReject = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserReject);
  const canCancel = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserCancel);
  const capabilities = useAgentCapabilities({ enabled: canReadCapabilities });
  const [workflow, setWorkflow] = useState("");
  const [system, setSystem] = useState("");
  const [url, setUrl] = useState("");
  const [input, setInput] = useState("{}");
  const [executionMode, setExecutionMode] = useState<BrowserExecutionMode>("require_approval");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState(ALL_STATUS);
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const idempotency = useRef<{ key: string; fingerprint: string } | null>(null);

  const workflows = capabilities.data?.browser.workflows ?? [];
  const selectedWorkflow = workflow || workflows[0]?.name || "";
  const workflowDescription = workflows.find((item) => item.name === selectedWorkflow)?.description;
  const query = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    status: status === ALL_STATUS ? undefined : status,
  };
  const tasks = useBrowserTasks(query);
  const createTask = useCreateBrowserTask();
  const records = tasks.data?.records ?? [];
  const total = tasks.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = records.filter(isActiveBrowserTask).length;

  const submit = async () => {
    setFormError(null);
    setCreatedTaskId(null);
    const taskType = selectedWorkflow.trim();
    if (!taskType || !system.trim() || !url.trim()) {
      setFormError(t("errors.requiredFields"));
      return;
    }
    try {
      const parsedUrl = new URL(url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("invalid protocol");
      }
    } catch {
      setFormError(t("errors.invalidUrl"));
      return;
    }

    let parsedInput: Record<string, unknown>;
    try {
      const value: unknown = input.trim() ? JSON.parse(input) : {};
      if (value === null || Array.isArray(value) || typeof value !== "object") {
        setFormError(t("errors.jsonObjectRequired"));
        return;
      }
      parsedInput = value as Record<string, unknown>;
    } catch {
      setFormError(t("errors.invalidJson"));
      return;
    }

    try {
      const request: CreateBrowserTaskRequest = {
        taskType,
        target: { system: system.trim(), url: url.trim() },
        input: parsedInput,
        executionMode,
      };
      const fingerprint = JSON.stringify(request);
      if (idempotency.current?.fingerprint !== fingerprint) {
        idempotency.current = { key: crypto.randomUUID(), fingerprint };
      }
      const task = await createTask.mutateAsync({
        request,
        idempotencyKey: idempotency.current.key,
      });
      const taskId = browserTaskId(task);
      if (!taskId) {
        setFormError(t("errors.missingTaskId"));
        return;
      }
      setCreatedTaskId(taskId);
      setSelectedTaskId(taskId);
      setPage(1);
      setStatus(ALL_STATUS);
      setInput("{}");
      idempotency.current = null;
    } catch {
      setFormError(t("errors.requestFailed"));
    }
  };

  return (
    <section
      id="platform-agent-browser-panel"
      role="tabpanel"
      aria-labelledby="platform-agent-browser-tab"
      className="space-y-4"
    >
      <div className="grid items-start gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[var(--color-border-secondary)] bg-card">
          <div className="border-b border-[var(--color-border-secondary)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="bg-[var(--color-info-soft)] text-[var(--color-info-text)] flex size-8 items-center justify-center rounded-md">
                <Globe2 className="size-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold">{t("browser.formTitle")}</h2>
                <p className="text-muted-foreground text-[10px]">{t("browser.formDescription")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {canReadCapabilities && capabilities.isError ? (
              <AgentError error={capabilities.error} onRetry={() => void capabilities.refetch()} />
            ) : null}
            {!canReadCapabilities ? (
              <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px] leading-4">
                {t("permissions.agentRequired")}
              </p>
            ) : null}

            <div>
              <Label htmlFor="agent-workflow" className="mb-1.5 text-[11px]">{t("browser.workflow")}</Label>
              {workflows.length ? (
                <Select value={selectedWorkflow} onValueChange={setWorkflow}>
                  <SelectTrigger id="agent-workflow" className="w-full">
                    <SelectValue placeholder={t("browser.workflow")} />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((item) => (
                      <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="agent-workflow"
                  value={selectedWorkflow}
                  placeholder={t("browser.workflowPlaceholder")}
                  onChange={(event) => setWorkflow(event.target.value)}
                />
              )}
              {workflowDescription ? (
                <p className="text-muted-foreground mt-1.5 text-[10px] leading-4">{workflowDescription}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div>
                <Label htmlFor="agent-target-system" className="mb-1.5 text-[11px]">{t("browser.targetSystem")}</Label>
                <Input
                  id="agent-target-system"
                  value={system}
                  placeholder={t("browser.targetSystemPlaceholder")}
                  onChange={(event) => setSystem(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="agent-target-url" className="mb-1.5 text-[11px]">{t("browser.targetUrl")}</Label>
                <Input
                  id="agent-target-url"
                  type="url"
                  value={url}
                  placeholder="https://"
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="agent-input" className="mb-1.5 text-[11px]">{t("browser.inputJson")}</Label>
              <Textarea
                id="agent-input"
                value={input}
                rows={6}
                className="font-mono text-[11px] leading-5"
                spellCheck={false}
                onChange={(event) => setInput(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="agent-execution-mode" className="mb-1.5 text-[11px]">{t("browser.executionMode")}</Label>
              <Select value={executionMode} onValueChange={(value) => setExecutionMode(value as BrowserExecutionMode)}>
                <SelectTrigger id="agent-execution-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("browser.modes.auto")}</SelectItem>
                  <SelectItem value="require_approval">{t("browser.modes.require_approval")}</SelectItem>
                </SelectContent>
              </Select>
              {capabilities.data?.browser.approvalRequiredForSensitiveActions ? (
                <p className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-[10px] leading-4">
                  <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                  {t("browser.sensitiveApprovalHint")}
                </p>
              ) : null}
            </div>

            {formError ? <p role="alert" className="text-[var(--color-error-text)] text-[11px]">{formError}</p> : null}
            {createTask.error ? <AgentError error={createTask.error} /> : null}
            {createdTaskId ? (
              <p role="status" className="text-[var(--color-success-text)] text-[11px]">
                {t("browser.created", { taskId: createdTaskId })}
              </p>
            ) : null}
            {!canCreate ? (
              <p className="text-muted-foreground text-[10px]">{t("permissions.browserCreateRequired")}</p>
            ) : null}

            <Button className="w-full" disabled={!canCreate || createTask.isPending} onClick={() => void submit()}>
              {createTask.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Play />}
              {createTask.isPending ? t("browser.creating") : t("browser.create")}
            </Button>
          </div>
        </div>

        <TablePanel>
          <TableToolbar>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold">{t("browser.tasksTitle")}</h2>
              {activeCount ? (
                <Badge variant="info">
                  <LoaderCircle className="motion-safe:animate-spin" />
                  {t("browser.activeCount", { count: activeCount })}
                </Badge>
              ) : null}
            </div>
            <TableToolbarEnd>
              <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                <SelectTrigger size="sm" className="w-36 text-[11px]" aria-label={t("browser.statusFilter")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>{t("browser.allStatuses")}</SelectItem>
                  {STATUS_FILTERS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.has(`statuses.${value}`) ? t(`statuses.${value}`) : value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("common.refresh")}
                disabled={tasks.isFetching}
                onClick={() => void tasks.refetch()}
              >
                <RefreshCw className={cn(tasks.isFetching && "motion-safe:animate-spin")} />
              </Button>
            </TableToolbarEnd>
          </TableToolbar>

          {tasks.isLoading ? <TableLoading /> : null}
          {tasks.isError ? (
            <div className="p-3"><AgentError error={tasks.error} onRetry={() => void tasks.refetch()} /></div>
          ) : null}
          {!tasks.isLoading && !tasks.isError && records.length === 0 ? (
            <TableEmpty>{t("browser.emptyTasks")}</TableEmpty>
          ) : null}
          {!tasks.isLoading && !tasks.isError && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">{t("browser.taskId")}</TableHead>
                  <TableHead>{t("browser.workflow")}</TableHead>
                  <TableHead>{t("browser.targetSystem")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("browser.executionMode")}</TableHead>
                  <TableHead>{t("browser.createdAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((task, index) => {
                  const id = browserTaskId(task);
                  return (
                    <TableRow key={id || `${browserTaskType(task)}-${index}`}>
                      <TableCell className="font-mono text-[10px] break-all">{id || "-"}</TableCell>
                      <TableCell className="text-[11px]">{browserTaskType(task)}</TableCell>
                      <TableCell className="text-[11px]">{browserTargetSystem(task)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(task.status)}>
                          {task.status
                            ? t.has(`statuses.${task.status}`) ? t(`statuses.${task.status}`) : task.status
                            : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {task.executionMode ?? task.execution_mode
                          ? t(`browser.modes.${task.executionMode ?? task.execution_mode}`)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-[10px]">{formatAgentTime(task.createdAt ?? task.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" disabled={!id} onClick={() => setSelectedTaskId(id)}>
                          {t("common.details")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}

          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-secondary)] px-3 py-2 text-[10px]">
            <span>{t("browser.total", { count: total })}</span>
            <div className="flex items-center gap-2">
              <span>{t("browser.page", { page, pages: pageCount })}</span>
              <Button size="icon" variant="ghost" className="size-7" aria-label={t("common.previous")} disabled={page <= 1 || tasks.isFetching} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft />
              </Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label={t("common.next")} disabled={page >= pageCount || tasks.isFetching} onClick={() => setPage((current) => current + 1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        </TablePanel>
      </div>

      <BrowserTaskDetailDialog
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        canApprove={canApprove}
        canReject={canReject}
        canCancel={canCancel}
      />
    </section>
  );
}
