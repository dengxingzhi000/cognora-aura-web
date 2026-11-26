import type { AxiosRequestConfig } from "axios";
import apiClient from "../client";
import { unwrap } from "../envelope";
import type {
  AgentApprovalDecision,
  AgentAsyncTask,
  AgentCapabilities,
  AgentChatRequest,
  AgentChatResponse,
  AssistanceDashboardData,
  AssistanceFeedbackRequest,
  AssistanceModelStatus,
  AssistancePredictRequest,
  AssistancePrediction,
  AgentWorkflowCatalog,
  AgentWorkflowRun,
  AgentWorkflowRunRequest,
  BrowserTaskArtifactList,
  BrowserTaskDetail,
  BrowserTaskPage,
  BrowserTaskQuery,
  BrowserTaskSteps,
  BrowserTaskSummary,
  CreateBrowserTaskRequest,
  CreateKnowledgeDocumentRequest,
  KnowledgeDocumentPage,
  KnowledgeDocumentQuery,
  KnowledgeSearchQuery,
  KnowledgeSearchResponse,
  OpsActionRequest,
  OpsProfile,
  OpsStatusResponse,
  UnifiedTaskDecisionRequest,
  UnifiedTaskDetail,
  UnifiedTaskPage,
  UnifiedTaskPageQuery,
  UnifiedTaskQuery,
  WritingRequest,
  WritingResponse,
} from "../contracts/platform-agent";

const AGENT_BASE = "/platform-agent/api/v1/agent";

const get = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.get(url, { params }));

const post = <T>(url: string, body?: object, config?: AxiosRequestConfig) =>
  unwrap<T>(
    config
      ? apiClient.post(url, body, config)
      : apiClient.post(url, body),
  );

const browserTaskPath = (taskId: string) =>
  `${AGENT_BASE}/browser/tasks/${encodeURIComponent(taskId)}`;

const unifiedTaskPath = (taskId: string) =>
  `${AGENT_BASE}/tasks/${encodeURIComponent(taskId)}`;

export const platformAgentApiService = {
  getCapabilities: () => get<AgentCapabilities>(`${AGENT_BASE}/capabilities`),
  chat: (request: AgentChatRequest) =>
    post<AgentChatResponse>(`${AGENT_BASE}/chat`, request),
  predictAssistance: (request: AssistancePredictRequest) =>
    post<AssistancePrediction>(`${AGENT_BASE}/assistance/predict`, request),
  submitAssistanceFeedback: (
    predictionId: string,
    request: AssistanceFeedbackRequest,
  ) =>
    post<void>(
      `${AGENT_BASE}/assistance/predictions/${encodeURIComponent(predictionId)}/feedback`,
      request,
    ),
  getAssistanceModelStatus: () =>
    get<AssistanceModelStatus>(`${AGENT_BASE}/assistance/model/status`),
  getAssistanceDashboardData: () =>
    get<AssistanceDashboardData>(`${AGENT_BASE}/assistance/dashboard/data`),
  chatAsync: (request: AgentChatRequest) =>
    post<AgentAsyncTask>(`${AGENT_BASE}/chat/async`, request),
  getAsyncTask: (taskId: string) =>
    get<AgentAsyncTask>(`${AGENT_BASE}/chat/tasks/${encodeURIComponent(taskId)}`),
  getChatHistory: (sessionId: string) =>
    get<{ messages: { role: string; content: string; created_at: number }[] }>(
      `${AGENT_BASE}/chat/sessions/${encodeURIComponent(sessionId)}`,
    ),
  generateWriting: (request: WritingRequest) =>
    post<WritingResponse>(`${AGENT_BASE}/writing-assistant`, request, {
      timeout: 60_000,
    }),
  getOpsStatus: (profile: OpsProfile = "agent") =>
    get<OpsStatusResponse>(`${AGENT_BASE}/ops/status`, { profile }),
  runOpsAction: (request: OpsActionRequest) =>
    post<OpsStatusResponse>(`${AGENT_BASE}/ops/actions`, request, {
      timeout: 180_000,
    }),
  decideApproval: (approvalId: string, decision: AgentApprovalDecision) =>
    post<void>(
      `${AGENT_BASE}/approvals/${encodeURIComponent(approvalId)}/decision`,
      { decision },
    ),
  resumeChat: (taskId: string) =>
    post<AgentChatResponse>(
      `${AGENT_BASE}/chat/${encodeURIComponent(taskId)}/resume`,
      {},
    ),
  listUnifiedTasks: (query: UnifiedTaskQuery) =>
    get<UnifiedTaskPage>(`${AGENT_BASE}/tasks`, query),
  getUnifiedTask: (taskId: string) =>
    get<UnifiedTaskDetail>(unifiedTaskPath(taskId)),
  listUnifiedApprovals: (query: UnifiedTaskPageQuery) =>
    get<UnifiedTaskPage>(`${AGENT_BASE}/approvals`, query),
  decideUnifiedTask: (taskId: string, request: UnifiedTaskDecisionRequest) =>
    post<void>(`${unifiedTaskPath(taskId)}/decision`, request),
  resumeUnifiedTask: (taskId: string) =>
    post<void>(`${unifiedTaskPath(taskId)}/resume`, {}),
  cancelUnifiedTask: (taskId: string) =>
    post<void>(`${unifiedTaskPath(taskId)}/cancel`, {}),
  listWorkflows: () => get<AgentWorkflowCatalog>(`${AGENT_BASE}/workflows`),
  runWorkflow: (name: string, request: AgentWorkflowRunRequest) =>
    post<AgentWorkflowRun>(
      `${AGENT_BASE}/workflows/${encodeURIComponent(name)}/runs`,
      request,
    ),
  listKnowledgeDocuments: (query: KnowledgeDocumentQuery) =>
    get<KnowledgeDocumentPage>(`${AGENT_BASE}/knowledge/documents`, query),
  createKnowledgeDocument: (request: CreateKnowledgeDocumentRequest) =>
    post<void>(`${AGENT_BASE}/knowledge/documents`, request),
  searchKnowledge: (query: KnowledgeSearchQuery) =>
    get<KnowledgeSearchResponse>(`${AGENT_BASE}/knowledge/search`, query),
  listBrowserTasks: (query: BrowserTaskQuery) =>
    get<BrowserTaskPage>(`${AGENT_BASE}/browser/tasks`, query),
  createBrowserTask: (request: CreateBrowserTaskRequest, idempotencyKey: string) =>
    post<BrowserTaskSummary>(`${AGENT_BASE}/browser/tasks`, request, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  getBrowserTask: (taskId: string) =>
    get<BrowserTaskDetail>(browserTaskPath(taskId)),
  getBrowserTaskSteps: (taskId: string) =>
    get<BrowserTaskSteps>(`${browserTaskPath(taskId)}/steps`),
  approveBrowserTask: (taskId: string) =>
    post<void>(`${browserTaskPath(taskId)}/approve`, {}),
  rejectBrowserTask: (taskId: string) =>
    post<void>(`${browserTaskPath(taskId)}/reject`, {}),
  cancelBrowserTask: (taskId: string) =>
    post<void>(`${browserTaskPath(taskId)}/cancel`, {}),
  listBrowserTaskArtifacts: (taskId: string) =>
    get<BrowserTaskArtifactList>(`${browserTaskPath(taskId)}/artifacts`),
  downloadBrowserTaskArtifact: (taskId: string, artifactId: string) =>
    unwrap<Blob>(
      apiClient.get<Blob>(
        `${browserTaskPath(taskId)}/artifacts/${encodeURIComponent(artifactId)}/content`,
        { responseType: "blob" },
      ),
    ),
};
