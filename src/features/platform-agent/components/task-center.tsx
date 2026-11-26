"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListTodo,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  TableEmpty,
  TableLoading,
  TablePanel,
  TableToolbar,
  TableToolbarEnd,
} from "@/components/ui/table-shell";
import { usePermission } from "@/hooks/use-permission";
import {
  PLATFORM_AGENT_PERMISSIONS,
  type UnifiedTask,
  type UnifiedTaskAgentType,
  type UnifiedTaskQuery,
} from "@/lib/api/contracts/platform-agent";
import { cn } from "@/lib/utils";
import {
  isActiveUnifiedTask,
  useUnifiedApprovals,
  useUnifiedTasks,
} from "../hooks";
import { formatAgentTime } from "../lib/browser-task";
import { AgentAccessDenied, AgentError } from "./agent-feedback";
import { BrowserTaskDetailDialog } from "./browser-task-detail-dialog";
import { TaskStatusOverview } from "./task-status-overview";
import { UnifiedTaskDetailDialog } from "./unified-task-detail-dialog";

const PAGE_SIZE = 20;
const ALL = "__all__";
const STATUS_FILTERS = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "WAITING_APPROVAL",
  "APPROVED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
];
const AGENT_TYPES: UnifiedTaskAgentType[] = ["ENTERPRISE", "WORKFLOW", "BROWSER"];

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

export function TaskCenter() {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canListTasks = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksList);
  const canListApprovals = hasPermission(PLATFORM_AGENT_PERMISSIONS.approvalsList);
  const canGet = hasPermission(PLATFORM_AGENT_PERMISSIONS.tasksGet);
  const [source, setSource] = useState<"tasks" | "approvals">(
    canListTasks ? "tasks" : "approvals",
  );
  const [agentType, setAgentType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);

  const query: UnifiedTaskQuery = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    agentType: source === "tasks" && agentType !== ALL
      ? agentType as UnifiedTaskAgentType
      : undefined,
    status: source === "tasks" && status !== ALL ? status : undefined,
  };
  const tasks = useUnifiedTasks(query, { enabled: canListTasks && source === "tasks" });
  const approvals = useUnifiedApprovals(
    { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    { enabled: canListApprovals && source === "approvals" },
  );
  const current = source === "tasks" ? tasks : approvals;
  const records = current.data?.records ?? [];
  const total = current.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = records.filter(isActiveUnifiedTask).length;
  const canBrowserApprove = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserApprove);
  const canBrowserReject = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserReject);
  const canBrowserCancel = hasPermission(PLATFORM_AGENT_PERMISSIONS.browserCancel);

  if (!canListTasks && !canListApprovals) {
    return <AgentAccessDenied />;
  }

  return (
    <section
      id="platform-agent-tasks-panel"
      role="tabpanel"
      aria-labelledby="platform-agent-tasks-tab"
      className="space-y-4"
    >
      <TaskStatusOverview tasks={records} />
      <TablePanel>
        <TableToolbar>
          <div className="flex flex-wrap items-center gap-2">
            <ListTodo className="text-muted-foreground size-4" />
            <h2 className="text-[13px] font-semibold">{t("tasks.title")}</h2>
            {activeCount ? (
              <Badge variant="info">
                <LoaderCircle className="motion-safe:animate-spin" />
                {t("tasks.activeCount", { count: activeCount })}
              </Badge>
            ) : null}
          </div>
          <TableToolbarEnd>
            {canListTasks && canListApprovals ? (
              <div className="bg-sunken inline-flex gap-1 rounded-md border border-[var(--color-border-secondary)] p-0.5">
                {(["tasks", "approvals"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant="ghost"
                    className={cn("h-7 px-2 text-[10px]", source === value && "bg-card border border-[var(--color-border-secondary)]")}
                    aria-pressed={source === value}
                    onClick={() => {
                      setSource(value);
                      setPage(1);
                      setSelectedTask(null);
                    }}
                  >
                    {t(`tasks.sources.${value}`)}
                  </Button>
                ))}
              </div>
            ) : null}
            {source === "tasks" ? (
              <>
                <Select
                  value={agentType}
                  onValueChange={(value) => {
                    setAgentType(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-36 text-[11px]" aria-label={t("tasks.typeFilter")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{t("tasks.allTypes")}</SelectItem>
                    {AGENT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>{t(`agentTypes.${value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-40 text-[11px]" aria-label={t("tasks.statusFilter")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{t("tasks.allStatuses")}</SelectItem>
                    {STATUS_FILTERS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t.has(`statuses.${value}`) ? t(`statuses.${value}`) : value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              aria-label={t("common.refresh")}
              disabled={current.isFetching}
              onClick={() => void current.refetch()}
            >
              <RefreshCw className={cn(current.isFetching && "motion-safe:animate-spin")} />
            </Button>
          </TableToolbarEnd>
        </TableToolbar>

        {current.isLoading ? <TableLoading /> : null}
        {current.isError ? (
          <div className="p-3"><AgentError error={current.error} onRetry={() => void current.refetch()} /></div>
        ) : null}
        {!current.isLoading && !current.isError && records.length === 0 ? (
          <TableEmpty>
            {source === "tasks" ? t("tasks.empty") : t("tasks.emptyApprovals")}
          </TableEmpty>
        ) : null}
        {!current.isLoading && !current.isError && records.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">{t("tasks.titleColumn")}</TableHead>
                <TableHead>{t("tasks.type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("tasks.createdAt")}</TableHead>
                <TableHead>{t("tasks.updatedAt")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="text-[11px] font-medium">{task.title || task.externalTaskId || task.id}</p>
                    <p className="text-muted-foreground mt-0.5 font-mono text-[9px] break-all">{task.id}</p>
                    {task.summary ? <p className="text-muted-foreground mt-1 text-[10px]">{task.summary}</p> : null}
                  </TableCell>
                  <TableCell className="text-[11px]">{t(`agentTypes.${task.agentType}`)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(task.status)}>
                      {t.has(`statuses.${task.status}`) ? t(`statuses.${task.status}`) : task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px]">{formatAgentTime(task.createdAt)}</TableCell>
                  <TableCell className="text-[10px]">{formatAgentTime(task.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canGet}
                      onClick={() => setSelectedTask(task)}
                    >
                      {t("common.details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-secondary)] px-3 py-2 text-[10px]">
          <span>{t("tasks.total", { count: total })}</span>
          {!canGet ? <span>{t("permissions.tasksGetRequired")}</span> : null}
          <div className="flex items-center gap-2">
            <span>{t("tasks.page", { page, pages: pageCount })}</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t("common.previous")}
              disabled={page <= 1 || current.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t("common.next")}
              disabled={page >= pageCount || current.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </TablePanel>

      {selectedTask?.agentType === "BROWSER" ? (
        <BrowserTaskDetailDialog
          taskId={selectedTask.externalTaskId || selectedTask.id}
          open={Boolean(selectedTask)}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          canApprove={canBrowserApprove}
          canReject={canBrowserReject}
          canCancel={canBrowserCancel}
        />
      ) : (
        <UnifiedTaskDetailDialog
          taskId={selectedTask?.id ?? null}
          open={Boolean(selectedTask)}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}
    </section>
  );
}
