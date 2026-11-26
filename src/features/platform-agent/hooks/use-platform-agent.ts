"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { platformAgentApiService } from "@/lib/api/services/platform-agent";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  AgentApprovalDecisionRequest,
  AgentChatResponse,
  AgentWorkflowRunRequest,
  AssistanceFeedbackRequest,
  AssistancePredictRequest,
  AssistancePrediction,
  BrowserTaskArtifact,
  BrowserTaskQuery,
  BrowserTaskSummary,
  CreateBrowserTaskRequest,
  CreateKnowledgeDocumentRequest,
  KnowledgeDocumentQuery,
  KnowledgeSearchQuery,
  OpsActionRequest,
  OpsProfile,
  UnifiedTaskPageQuery,
  UnifiedTaskQuery,
  WritingRequest,
} from "@/lib/api/contracts/platform-agent";

export const platformAgentKeys = {
  all: ["platform-agent"] as const,
  capabilities: [...["platform-agent"], "capabilities"] as const,
  tasks: [...["platform-agent"], "tasks"] as const,
  unifiedTasks: (query: UnifiedTaskQuery) =>
    [...["platform-agent"], "tasks", "list", query] as const,
  unifiedTask: (taskId: string) =>
    [...["platform-agent"], "tasks", "task", taskId] as const,
  approvals: (query: UnifiedTaskPageQuery) =>
    [...["platform-agent"], "tasks", "approvals", query] as const,
  workflows: [...["platform-agent"], "workflows"] as const,
  knowledge: [...["platform-agent"], "knowledge"] as const,
  assistance: [...["platform-agent"], "assistance"] as const,
  assistanceDashboard: [...["platform-agent"], "assistance", "dashboard"] as const,
  knowledgeDocuments: (query: KnowledgeDocumentQuery) =>
    [...["platform-agent"], "knowledge", "documents", query] as const,
  ops: [...["platform-agent"], "ops"] as const,
  opsStatus: (profile: OpsProfile) =>
    [...["platform-agent"], "ops", "status", profile] as const,
  browser: [...["platform-agent"], "browser"] as const,
  browserTasks: (query: BrowserTaskQuery) =>
    [...["platform-agent"], "browser", "tasks", query] as const,
  browserTask: (taskId: string) =>
    [...["platform-agent"], "browser", "task", taskId] as const,
  browserTaskSteps: (taskId: string) =>
    [...["platform-agent"], "browser", "task", taskId, "steps"] as const,
  browserTaskArtifacts: (taskId: string) =>
    [...["platform-agent"], "browser", "task", taskId, "artifacts"] as const,
};

export const BROWSER_POLL_INTERVAL = 3000;
export const TASK_POLL_INTERVAL = BROWSER_POLL_INTERVAL;
const ACTIVE_BROWSER_STATUSES = new Set(["PENDING", "RUNNING", "WAITING_APPROVAL"]);
const ACTIVE_UNIFIED_STATUSES = new Set([
  "PENDING",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "PAUSED",
  "WAITING_APPROVAL",
  "AWAITING_APPROVAL",
  "APPROVED",
]);
const TERMINAL_AGENT_STATUSES = new Set([
  "DONE", "COMPLETED", "SUCCEEDED", "FAILED", "REJECTED", "CANCELLED", "CANCELED",
]);

export function isTerminalAgentResponse(response?: { status?: string } | null) {
  return TERMINAL_AGENT_STATUSES.has((response?.status ?? "").toUpperCase());
}

export function agentStorageKeys(userId?: string | null) {
  const scope = userId ? `:${encodeURIComponent(userId)}` : ":anonymous";
  return {
    task: `platform-agent:last-async-task${scope}`,
    session: `platform-agent:last-session${scope}`,
  };
}

export function readAgentRecovery(userId?: string | null) {
  if (typeof window === "undefined") return { taskId: null, sessionId: null };
  const keys = agentStorageKeys(userId);
  return {
    taskId: window.localStorage.getItem(keys.task),
    sessionId: window.localStorage.getItem(keys.session),
  };
}

export function isActiveBrowserTask(task?: { status?: string } | null) {
  return ACTIVE_BROWSER_STATUSES.has((task?.status ?? "").toUpperCase());
}

export function isActiveUnifiedTask(task?: { status?: string } | null) {
  return ACTIVE_UNIFIED_STATUSES.has((task?.status ?? "").toUpperCase());
}

function hasActiveBrowserTask(tasks?: BrowserTaskSummary[]) {
  return tasks?.some(isActiveBrowserTask) ?? false;
}

function invalidateTaskQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: platformAgentKeys.tasks });
  void queryClient.invalidateQueries({
    queryKey: [...["platform-agent"], "tasks", "approvals"],
  });
}

export function useAgentCapabilities(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformAgentKeys.capabilities,
    queryFn: () => platformAgentApiService.getCapabilities(),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useAssistancePrediction() {
  return useMutation({
    mutationFn: (request: AssistancePredictRequest): Promise<AssistancePrediction> =>
      platformAgentApiService.predictAssistance(request),
  });
}

export function useAssistanceFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: {
      predictionId: string;
      feedback: AssistanceFeedbackRequest;
    }) =>
      platformAgentApiService.submitAssistanceFeedback(
        request.predictionId,
        request.feedback,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformAgentKeys.assistanceDashboard,
      });
    },
  });
}

export function useAssistanceDashboard(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformAgentKeys.assistanceDashboard,
    queryFn: () => platformAgentApiService.getAssistanceDashboardData(),
    enabled: options.enabled ?? true,
    refetchInterval: 30_000,
  });
}

export function useAgentChat() {
  const userId = useAuthStore((state) => state.user?.id);
  const keys = agentStorageKeys(userId);
  return useMutation({
    mutationFn: async (request: Parameters<typeof platformAgentApiService.chat>[0]): Promise<AgentChatResponse> => {
      const submitted = await platformAgentApiService.chatAsync(request);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(keys.task, submitted.task_id);
      }
      const deadline = Date.now() + 140_000;
      while (Date.now() < deadline) {
        const task = await platformAgentApiService.getAsyncTask(submitted.task_id);
        if (task.status === "done" && task.result) {
          if (typeof window !== "undefined") {
            if (isTerminalAgentResponse(task.result)) {
              window.localStorage.removeItem(keys.task);
            }
            if (task.result.session_id) {
              window.localStorage.setItem(keys.session, task.result.session_id);
            }
          }
          return task.result;
        }
        if (task.status === "failed") {
          throw new Error(task.error ?? "Agent task failed");
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error("Agent task timed out");
    },
  });
}

export function useAsyncAgentTask(taskId: string | null, userId?: string | null) {
  return useQuery({
    queryKey: [...platformAgentKeys.tasks, "async", userId ?? "anonymous", taskId],
    queryFn: () => platformAgentApiService.getAsyncTask(taskId!),
    enabled: Boolean(taskId),
    refetchInterval: (query) =>
      query.state.data?.status === "done" || query.state.data?.status === "failed"
        ? false
        : 1000,
  });
}

export function useAgentWriting() {
  return useMutation({
    mutationFn: platformAgentApiService.generateWriting,
  });
}

export function useOpsStatus(profile: OpsProfile) {
  return useQuery({
    queryKey: platformAgentKeys.opsStatus(profile),
    queryFn: () => platformAgentApiService.getOpsStatus(profile),
    refetchInterval: 15_000,
  });
}

export function useOpsAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: platformAgentApiService.runOpsAction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformAgentKeys.ops });
    },
  });
}

export function useAgentApprovalDecision() {
  return useMutation({
    mutationFn: (request: AgentApprovalDecisionRequest) =>
      platformAgentApiService.decideApproval(
        request.approvalId,
        request.decision,
      ),
  });
}

export function useResumeAgentTask() {
  return useMutation({
    mutationFn: platformAgentApiService.resumeChat,
  });
}

export function useUnifiedTasks(
  query: UnifiedTaskQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.unifiedTasks(query),
    queryFn: () => platformAgentApiService.listUnifiedTasks(query),
    enabled: options.enabled ?? true,
    refetchInterval: (activeQuery) =>
      options.enabled === false
        ? false
        : activeQuery.state.data?.records.some(isActiveUnifiedTask)
          ? TASK_POLL_INTERVAL
          : false,
  });
}

export function useUnifiedApprovals(
  query: UnifiedTaskPageQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.approvals(query),
    queryFn: () => platformAgentApiService.listUnifiedApprovals(query),
    enabled: options.enabled ?? true,
    refetchInterval: (activeQuery) =>
      options.enabled === false
        ? false
        : activeQuery.state.data?.records.some(isActiveUnifiedTask)
          ? TASK_POLL_INTERVAL
          : false,
  });
}

export function useUnifiedTaskDetail(
  taskId: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.unifiedTask(taskId ?? ""),
    queryFn: () => platformAgentApiService.getUnifiedTask(taskId!),
    enabled: Boolean(taskId) && (options.enabled ?? true),
    refetchInterval: (activeQuery) =>
      options.enabled === false || !taskId
        ? false
        : isActiveUnifiedTask(activeQuery.state.data)
          ? TASK_POLL_INTERVAL
          : false,
  });
}

export function useDecideUnifiedTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { taskId: string; decision: "approve" | "reject" }) =>
      platformAgentApiService.decideUnifiedTask(request.taskId, {
        decision: request.decision,
      }),
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useResumeUnifiedTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => platformAgentApiService.resumeUnifiedTask(taskId),
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useCancelUnifiedTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => platformAgentApiService.cancelUnifiedTask(taskId),
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useWorkflows(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformAgentKeys.workflows,
    queryFn: () => platformAgentApiService.listWorkflows(),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { name: string; input: Record<string, unknown> }) =>
      platformAgentApiService.runWorkflow(request.name, { input: request.input }),
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useKnowledgeDocuments(
  query: KnowledgeDocumentQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.knowledgeDocuments(query),
    queryFn: () => platformAgentApiService.listKnowledgeDocuments(query),
    enabled: options.enabled ?? true,
  });
}

export function useCreateKnowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateKnowledgeDocumentRequest) =>
      platformAgentApiService.createKnowledgeDocument(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformAgentKeys.knowledge });
    },
  });
}

export function useSearchKnowledge() {
  return useMutation({
    mutationFn: (query: KnowledgeSearchQuery) =>
      platformAgentApiService.searchKnowledge(query),
  });
}

export function useBrowserTasks(
  query: BrowserTaskQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.browserTasks(query),
    queryFn: () => platformAgentApiService.listBrowserTasks(query),
    enabled: options.enabled ?? true,
    refetchInterval: (activeQuery) =>
      options.enabled === false
        ? false
        : hasActiveBrowserTask(activeQuery.state.data?.records)
          ? BROWSER_POLL_INTERVAL
          : false,
  });
}

export function useCreateBrowserTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      request: CreateBrowserTaskRequest;
      idempotencyKey: string;
    }) =>
      platformAgentApiService.createBrowserTask(
        variables.request,
        variables.idempotencyKey,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformAgentKeys.browser,
      });
    },
  });
}

export function useBrowserTaskDetail(
  taskId: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.browserTask(taskId ?? ""),
    queryFn: () => platformAgentApiService.getBrowserTask(taskId!),
    enabled: Boolean(taskId) && (options.enabled ?? true),
    refetchInterval: (activeQuery) =>
      options.enabled === false || !taskId
        ? false
        : isActiveBrowserTask(activeQuery.state.data)
          ? BROWSER_POLL_INTERVAL
          : false,
  });
}

export function useBrowserTaskSteps(
  taskId: string | null,
  options: { enabled?: boolean; polling?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.browserTaskSteps(taskId ?? ""),
    queryFn: () => platformAgentApiService.getBrowserTaskSteps(taskId!),
    enabled: Boolean(taskId) && (options.enabled ?? true),
    refetchInterval:
      Boolean(taskId) && options.enabled !== false && options.polling
        ? BROWSER_POLL_INTERVAL
        : false,
  });
}

export function useBrowserTaskArtifacts(
  taskId: string | null,
  options: { enabled?: boolean; polling?: boolean } = {},
) {
  return useQuery({
    queryKey: platformAgentKeys.browserTaskArtifacts(taskId ?? ""),
    queryFn: () => platformAgentApiService.listBrowserTaskArtifacts(taskId!),
    enabled: Boolean(taskId) && (options.enabled ?? true),
    refetchInterval:
      Boolean(taskId) && options.enabled !== false && options.polling
        ? BROWSER_POLL_INTERVAL
        : false,
  });
}

export function useDownloadBrowserTaskArtifact() {
  return useMutation({
    mutationFn: (request: { taskId: string; artifact: BrowserTaskArtifact }) =>
      platformAgentApiService.downloadBrowserTaskArtifact(
        request.taskId,
        request.artifact.artifactId,
      ),
  });
}

function useBrowserTaskAction(
  action:
    | "approveBrowserTask"
    | "rejectBrowserTask"
    | "cancelBrowserTask",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      platformAgentApiService[action](taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformAgentKeys.browser,
      });
    },
  });
}

export function useApproveBrowserTask() {
  return useBrowserTaskAction("approveBrowserTask");
}

export function useRejectBrowserTask() {
  return useBrowserTaskAction("rejectBrowserTask");
}

export function useCancelBrowserTask() {
  return useBrowserTaskAction("cancelBrowserTask");
}
