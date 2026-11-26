export interface AgentToolDescriptor {
  name: string;
  description: string;
}

export interface AgentCapabilities {
  enterprise: {
    tools: string[];
    knowledge: boolean;
    memory: boolean;
    workflows: boolean;
    mcpInstalled: boolean;
    writingAssistant: boolean;
  };
  browser: {
    tools: AgentToolDescriptor[];
    workflows: AgentToolDescriptor[];
    approvalRequiredForSensitiveActions: boolean;
  };
}

export interface AgentChatRequest {
  message: string;
  session_id?: string;
  assistance_prediction_id?: string;
}

export interface AgentAsyncTask {
  task_id: string;
  external_task_id?: string | null;
  agent_task_id?: string | null;
  session_id: string | null;
  status: string;
  result?: AgentChatResponse | null;
  error?: string | null;
}

export interface AgentChatResponse {
  reply: string;
  status: string;
  user_id: string;
  task_id: string | null;
  trace_id: string;
  session_id?: string | null;
  approval_id?: string;
  approval_tool?: string;
  approval_args?: Record<string, unknown>;
  token_usage?: number | Record<string, unknown>;
  cost?: number | string;
}

export type WritingScene =
  | "PRODUCT_DESCRIPTION"
  | "SUPPLIER_REMARK"
  | "ORDER_NOTE"
  | "GENERAL_DESCRIPTION";

export type WritingAction = "GENERATE" | "POLISH" | "REWRITE" | "SHORTEN";

export interface WritingRequest {
  scene: WritingScene;
  action: WritingAction;
  content: string;
  context: Record<string, string>;
  maxLength: number;
  language: "zh-CN" | "en-US";
}

export interface WritingResponse {
  text: string;
  scene: WritingScene;
  action: WritingAction;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export type OpsProfile = "minimal" | "agent";
export type OpsAction = "START" | "STOP" | "RESTART" | "DEPLOY_IMAGE" | "ROLLBACK";

export interface OpsServiceStatus {
  name: string;
  container: string;
  state: string;
  health: "UP" | "DOWN";
}

export interface OpsStatusResponse {
  applied: boolean;
  services: OpsServiceStatus[];
  output: string[];
}

export interface OpsActionRequest {
  action: OpsAction;
  profile?: OpsProfile;
  services?: string[];
  service?: string;
  image?: string;
  apply: boolean;
}

export type AgentApprovalDecision = "approve" | "reject";

export interface AgentApprovalDecisionRequest {
  approvalId: string;
  taskId: string;
  decision: AgentApprovalDecision;
}

export type BrowserExecutionMode = "auto" | "require_approval";

export interface BrowserTaskQuery {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBrowserTaskRequest {
  taskType: string;
  target: {
    system: string;
    url: string;
  };
  input: Record<string, unknown>;
  executionMode: BrowserExecutionMode;
}

export interface BrowserTaskTarget {
  system?: string;
  url?: string;
  [key: string]: unknown;
}

export interface BrowserTaskApproval {
  id?: string;
  approvalId?: string;
  approval_id?: string;
  stepIndex?: number;
  action?: string;
  targetName?: string;
  description?: string;
  requestedAt?: string;
  tool?: string;
  args?: Record<string, unknown>;
  status?: string;
  decision?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface BrowserTaskStep {
  id?: string;
  stepId?: string;
  index?: number;
  name?: string;
  title?: string;
  description?: string;
  durationMs?: number;
  status?: string;
  action?: string;
  tool?: string;
  error?: unknown;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface BrowserTaskSummary {
  id?: string;
  taskId?: string;
  task_id?: string;
  taskType?: string;
  task_type?: string;
  status?: string;
  executionMode?: BrowserExecutionMode;
  execution_mode?: BrowserExecutionMode;
  target?: BrowserTaskTarget;
  targetSystem?: string;
  target_system?: string;
  url?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  error?: unknown;
  pendingApproval?: BrowserTaskApproval | null;
  [key: string]: unknown;
}

export interface BrowserTaskDetail extends BrowserTaskSummary {
  steps?: BrowserTaskStep[];
  approvals?: BrowserTaskApproval[];
  pendingApproval?: BrowserTaskApproval | null;
  totals?: Record<string, unknown>;
}

export type BrowserTaskSteps =
  | BrowserTaskStep[]
  | { records?: BrowserTaskStep[]; steps?: BrowserTaskStep[] };

export interface BrowserTaskPage {
  records: BrowserTaskSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type UnifiedTaskAgentType = "ENTERPRISE" | "WORKFLOW" | "BROWSER";

export interface UnifiedTask {
  id: string;
  tenantId: string;
  userId: string;
  agentType: UnifiedTaskAgentType;
  externalTaskId?: string | null;
  status: string;
  title?: string | null;
  summary?: string | null;
  approvalId?: string | null;
  payload?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
  canDecide?: boolean;
  canResume?: boolean;
}

export interface UnifiedTaskDetail extends UnifiedTask {
  runtime?: unknown;
}

export interface UnifiedTaskQuery {
  agentType?: UnifiedTaskAgentType;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface UnifiedTaskPageQuery {
  limit?: number;
  offset?: number;
}

export interface UnifiedTaskPage {
  records: UnifiedTask[];
  total: number;
  limit: number;
  offset: number;
}

export interface UnifiedTaskDecisionRequest {
  decision: AgentApprovalDecision;
}

export interface AgentWorkflow {
  name: string;
  description: string;
  runnable: boolean;
  inputSchema?: unknown;
}

export interface AgentWorkflowCatalog {
  workflows: AgentWorkflow[];
}

export interface AgentWorkflowRunRequest {
  input: Record<string, unknown>;
}

export interface AgentWorkflowRun {
  run_id: string;
  workflow: string;
  status: string;
  output: unknown;
}

export interface KnowledgeDocument {
  document_id: string;
  version: string;
  department: string;
  permission: string;
  chunk_count: number;
  created_at: string;
}

export interface CreateKnowledgeDocumentRequest {
  documentId: string;
  text: string;
  department?: string;
  permission?: string;
  version?: string;
}

export interface KnowledgeDocumentQuery {
  limit?: number;
  offset?: number;
}

export interface KnowledgeDocumentPage {
  records?: KnowledgeDocument[];
  documents?: KnowledgeDocument[];
  total: number;
  limit: number;
  offset: number;
}

export interface KnowledgeSearchQuery {
  query: string;
  top_k?: number;
}

export interface KnowledgeSearchHit {
  documentId?: string;
  title?: string;
  text?: string;
  content?: string;
  score?: number;
  metadata?: unknown;
  [key: string]: unknown;
}

export interface KnowledgeSearchResponse {
  hits?: KnowledgeSearchHit[];
  results?: KnowledgeSearchHit[];
}

export interface BrowserTaskArtifact {
  artifactId: string;
  kind: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  modifiedAt: string;
  downloadUrl: string;
}

export interface BrowserTaskArtifactList {
  artifacts: BrowserTaskArtifact[];
}

export type AssistanceEventType =
  | "PAGE_VIEW"
  | "FORM_EDIT"
  | "VALIDATION_ERROR"
  | "API_ERROR"
  | "RETRY"
  | "BACK_NAVIGATION"
  | "CONTEXT_SWITCH"
  | "PERMISSION_DENIED"
  | "HELP_OPEN"
  | "IDLE"
  | "TASK_SUCCESS"
  | "TASK_FAILURE"
  | "CANCEL";

export type AssistanceErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK"
  | "BUSINESS_REJECTION"
  | "UNKNOWN";

export interface AssistanceEvent {
  type: AssistanceEventType;
  offset_ms: number;
  duration_ms: number;
  severity: number;
  error_code: AssistanceErrorCode | null;
}

export interface AssistanceSignals {
  module: string;
  workflow: string;
  session_duration_seconds: number;
  active_seconds: number;
  idle_seconds: number;
  event_count: number;
  error_count: number;
  unique_error_count: number;
  repeated_error_count: number;
  retry_count: number;
  back_navigation_count: number;
  context_switch_count: number;
  validation_failure_count: number;
  permission_denied_count: number;
  form_completion_ratio: number;
  help_open_count: number;
  previous_task_count: number;
  previous_success_rate: number;
  recent_assistance_count: number;
  explicit_help_request: boolean;
  high_risk_action: boolean;
}

export interface AssistancePredictRequest {
  session_id: string;
  signals: AssistanceSignals;
  recent_events: AssistanceEvent[];
}

export interface AssistanceKnowledgeArticle {
  article_id: string;
  version: string;
  title: string;
  summary: string;
  steps: string[];
  permission: string;
  requires_human_confirmation: boolean;
  approval_hint: string | null;
  source: string;
  updated_at: string;
}

export interface AssistancePrediction {
  prediction_id: string;
  probability: number;
  threshold: number;
  decision: "OFFER_ASSISTANCE" | "DO_NOT_INTERRUPT";
  suggested_action: "OPEN_ASSISTANT" | "CONTINUE_WITHOUT_ASSISTANCE";
  model_version: string;
  feature_version: number;
  training_source: string;
  created_at: string;
  requires_human_confirmation: boolean;
  knowledge: AssistanceKnowledgeArticle[];
  knowledge_count: number;
  context_summary: {
    recent_events: number;
    server_outcomes: number;
    history_predictions_7d: number;
  };
}

export interface AssistanceFeedbackRequest {
  needed_assistance: boolean;
  assistance_used: boolean;
  task_succeeded: boolean;
  source: "OPERATOR" | "OUTCOME" | "REVIEWER";
  knowledge_helpful?: boolean;
  knowledge_article_id?: string;
}

export interface AssistanceMetricSummary {
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  brier: number;
  expected_cost: number;
  false_positives: number;
  false_negatives: number;
  support: number;
}

export interface AssistanceModelStatus {
  model_version: string;
  feature_version: number;
  training_source: string;
  tenant_id: string | null;
  trained_at: string;
  threshold: number;
  false_positive_cost: number;
  false_negative_cost: number;
  baseline_positive_rate: number;
  baseline_probability_mean: number;
  live_count: number;
  live_probability_mean: number;
  probability_mean_delta: number;
  drift_warning: boolean;
  dataset: Record<string, number>;
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    brier: number;
    expected_cost: number;
    threshold: number;
    slice_metrics: Record<string, Record<string, AssistanceMetricSummary>>;
    [key: string]: unknown;
  };
}

export interface AssistanceDashboardData {
  generated_at: string;
  model: AssistanceModelStatus;
  coverage: {
    predictions: number;
    feedback: number;
    outcomes: number;
    feedback_coverage: number;
    knowledge_feedback: number;
    knowledge_helpful_rate: number;
  };
  knowledge: {
    top_articles: Array<{ article_id: string; title: string; recommendations: number }>;
    helpful_rate: number;
  };
}

export const PLATFORM_AGENT_PERMISSIONS = {
  capabilities: "agent:capabilities:view",
  chat: "agent:chat:run",
  chatAsync: "agent:chat:async",
  chatTaskGet: "agent:chat:task:get",
  chatHistory: "agent:chat:history",
  workflowsExpenseExecute: "agent:workflows:expense:execute",
  workflowsExpenseResume: "agent:workflows:expense:resume",
  writing: "agent:writing:use",
  opsView: "ops:view",
  opsDeploy: "ops:deploy",
  opsCatalogView: "ops:catalog:view",
  enterpriseDecide: "agent:approval:enterprise-decide",
  enterpriseResume: "agent:approval:enterprise-resume",
  tasksList: "agent:tasks:list",
  tasksGet: "agent:tasks:get",
  tasksDecide: "agent:tasks:decide",
  tasksResume: "agent:tasks:resume",
  tasksCancel: "agent:tasks:cancel",
  approvalsList: "agent:approvals:list",
  workflowsView: "agent:workflows:view",
  workflowsRun: "agent:workflows:run",
  knowledgeView: "agent:knowledge:view",
  knowledgeManage: "agent:knowledge:manage",
  knowledgeSearch: "agent:knowledge:search",
  browserList: "agent:browser:tasks:list",
  browserCreate: "agent:browser:tasks:create",
  browserApprove: "agent:browser:approve",
  browserReject: "agent:browser:reject",
  browserCancel: "agent:browser:cancel",
  browserArtifactsList: "agent:browser:artifacts:list",
  browserArtifactsView: "agent:browser:artifacts:view",
  assistancePredict: "agent:assistance:predict",
  assistanceFeedback: "agent:assistance:feedback",
  assistanceModelView: "agent:assistance:model:view",
  assistanceDashboardView: "agent:assistance:dashboard:view",
} as const;
