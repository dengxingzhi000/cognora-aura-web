"use client";

import { useState, type FormEvent } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Database,
  LoaderCircle,
  Play,
  Search,
  Upload,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { PLATFORM_AGENT_PERMISSIONS } from "@/lib/api/contracts/platform-agent";
import {
  useCreateKnowledgeDocument,
  useKnowledgeDocuments,
  useRunWorkflow,
  useSearchKnowledge,
  useWorkflows,
} from "../hooks";
import { formatAgentTime, formatAgentValue } from "../lib/browser-task";
import { AgentError, AgentJson, AgentLoading } from "./agent-feedback";

const PAGE_SIZE = 10;

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value.trim() || "{}");
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function WorkflowKnowledgePanel() {
  const t = useTranslations("platformAgent");
  const { hasPermission } = usePermission();
  const canViewWorkflows = hasPermission(PLATFORM_AGENT_PERMISSIONS.workflowsView);
  const canRunWorkflow = hasPermission(PLATFORM_AGENT_PERMISSIONS.workflowsRun);
  const canViewKnowledge = hasPermission(PLATFORM_AGENT_PERMISSIONS.knowledgeView);
  const canManageKnowledge = hasPermission(PLATFORM_AGENT_PERMISSIONS.knowledgeManage);
  const canSearchKnowledge = hasPermission(PLATFORM_AGENT_PERMISSIONS.knowledgeSearch);
  const [open, setOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [workflowInput, setWorkflowInput] = useState("{}");
  const [workflowFormError, setWorkflowFormError] = useState<string | null>(null);
  const [document, setDocument] = useState({
    documentId: "",
    text: "",
    department: "",
    permission: "",
    version: "",
  });
  const [documentFormError, setDocumentFormError] = useState<string | null>(null);
  const [documentCreated, setDocumentCreated] = useState(false);
  const [documentPage, setDocumentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [topK, setTopK] = useState("5");
  const [searchFormError, setSearchFormError] = useState<string | null>(null);

  const workflows = useWorkflows({ enabled: open && canViewWorkflows });
  const runWorkflow = useRunWorkflow();
  const documents = useKnowledgeDocuments(
    { limit: PAGE_SIZE, offset: (documentPage - 1) * PAGE_SIZE },
    { enabled: open && canViewKnowledge },
  );
  const createDocument = useCreateKnowledgeDocument();
  const searchKnowledge = useSearchKnowledge();
  const workflowCatalog = workflows.data?.workflows ?? [];
  const workflowName = selectedWorkflow || workflowCatalog[0]?.name || "";
  const activeWorkflow = workflowCatalog.find((item) => item.name === workflowName);
  const documentRecords = documents.data?.records ?? documents.data?.documents ?? [];
  const documentTotal = documents.data?.total ?? 0;
  const documentPageCount = Math.max(1, Math.ceil(documentTotal / PAGE_SIZE));
  const searchResults = searchKnowledge.data?.hits ?? searchKnowledge.data?.results ?? [];

  const submitWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkflowFormError(null);
    if (!workflowName || !activeWorkflow?.runnable || !canRunWorkflow || runWorkflow.isPending) return;
    const input = parseJsonObject(workflowInput);
    if (!input) {
      setWorkflowFormError(t("errors.jsonObjectRequired"));
      return;
    }
    try {
      await runWorkflow.mutateAsync({ name: workflowName, input });
    } catch {
      // The mutation error is rendered below the form.
    }
  };

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDocumentFormError(null);
    setDocumentCreated(false);
    if (!document.documentId.trim() || !document.text.trim()) {
      setDocumentFormError(t("errors.requiredFields"));
      return;
    }
    if (!canManageKnowledge || createDocument.isPending) return;
    try {
      await createDocument.mutateAsync({
        documentId: document.documentId.trim(),
        text: document.text.trim(),
        department: document.department.trim() || undefined,
        permission: document.permission.trim() || undefined,
        version: document.version.trim() || undefined,
      });
      setDocument({ documentId: "", text: "", department: "", permission: "", version: "" });
      setDocumentPage(1);
      setDocumentCreated(true);
    } catch {
      // The mutation error is rendered below the form.
    }
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchFormError(null);
    if (!canSearchKnowledge || searchKnowledge.isPending) return;
    const query = searchQuery.trim();
    const parsedTopK = Number(topK);
    if (!query) {
      setSearchFormError(t("errors.searchRequired"));
      return;
    }
    if (!Number.isInteger(parsedTopK) || parsedTopK < 1 || parsedTopK > 20) {
      setSearchFormError(t("errors.invalidTopK"));
      return;
    }
    try {
      await searchKnowledge.mutateAsync({ query, top_k: parsedTopK });
    } catch {
      // The mutation error is rendered below the form.
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border-secondary)] bg-card">
      <button
        type="button"
        className="hover:bg-sunken/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
        aria-expanded={open}
        aria-controls="platform-agent-workflow-knowledge-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex size-8 items-center justify-center rounded-md">
          <Workflow className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">{t("workflowKnowledge.panelTitle")}</span>
          <span className="text-muted-foreground mt-0.5 block text-[10px]">{t("workflowKnowledge.panelDescription")}</span>
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open ? (
        <div id="platform-agent-workflow-knowledge-panel" className="grid gap-4 border-t border-[var(--color-border-secondary)] p-4 xl:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Workflow className="text-muted-foreground size-4" />
              <h3 className="text-[12px] font-semibold">{t("workflowKnowledge.workflowsTitle")}</h3>
            </div>
            {!canViewWorkflows ? (
              <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px]">{t("permissions.workflowsViewRequired")}</p>
            ) : null}
            {canViewWorkflows && workflows.isLoading ? <AgentLoading rows={3} /> : null}
            {canViewWorkflows && workflows.isError ? (
              <AgentError error={workflows.error} onRetry={() => void workflows.refetch()} />
            ) : null}
            {canViewWorkflows && !workflows.isLoading && !workflows.isError && workflowCatalog.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed border-[var(--color-border-strong)] px-3 py-5 text-center text-[11px]">{t("workflowKnowledge.noWorkflows")}</p>
            ) : null}
            {workflowCatalog.length ? (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {workflowCatalog.map((workflow) => (
                  <button
                    key={workflow.name}
                    type="button"
                    aria-pressed={workflowName === workflow.name}
                    disabled={!canRunWorkflow}
                    onClick={() => setSelectedWorkflow(workflow.name)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      workflowName === workflow.name
                        ? "border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border-secondary)] hover:bg-sunken",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-medium">{workflow.name}</span>
                      <Badge variant={workflow.runnable ? "success" : "secondary"}>
                        {workflow.runnable ? t("workflowKnowledge.runnable") : t("workflowKnowledge.notRunnable")}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground mt-1 block text-[10px] leading-4">{workflow.description}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {canViewWorkflows && activeWorkflow ? (
              <form className="space-y-3 border-t border-[var(--color-border-secondary)] pt-3" onSubmit={(event) => void submitWorkflow(event)}>
                {activeWorkflow.inputSchema !== undefined ? (
                  <AgentJson label={t("workflowKnowledge.inputSchema")} value={activeWorkflow.inputSchema} />
                ) : null}
                <div>
                  <Label htmlFor="agent-workflow-input" className="mb-1.5 text-[11px]">{t("workflowKnowledge.inputLabel")}</Label>
                  <Textarea
                    id="agent-workflow-input"
                    value={workflowInput}
                    rows={5}
                    spellCheck={false}
                    disabled={!canRunWorkflow}
                    className="font-mono text-[11px] leading-5"
                    onChange={(event) => setWorkflowInput(event.target.value)}
                  />
                </div>
                {!canRunWorkflow ? (
                  <p className="text-muted-foreground text-[10px]">{t("permissions.workflowsRunRequired")}</p>
                ) : null}
                {workflowFormError ? <p role="alert" className="text-[var(--color-error-text)] text-[11px]">{workflowFormError}</p> : null}
                {runWorkflow.error ? <AgentError error={runWorkflow.error} /> : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canRunWorkflow || !activeWorkflow.runnable || runWorkflow.isPending}
                >
                  {runWorkflow.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Play />}
                  {runWorkflow.isPending ? t("workflowKnowledge.running") : t("workflowKnowledge.run")}
                </Button>
                {runWorkflow.data ? (
                  <div className="space-y-2 rounded-md border border-[var(--color-border-secondary)] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="font-mono">{runWorkflow.data.run_id}</span>
                      <Badge variant="secondary">{runWorkflow.data.status}</Badge>
                    </div>
                    <AgentJson label={t("workflowKnowledge.output")} value={runWorkflow.data.output} />
                  </div>
                ) : null}
              </form>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="text-muted-foreground size-4" />
              <h3 className="text-[12px] font-semibold">{t("workflowKnowledge.knowledgeTitle")}</h3>
            </div>

            {canManageKnowledge ? (
              <form className="space-y-3 rounded-md border border-[var(--color-border-secondary)] p-3" onSubmit={(event) => void submitDocument(event)}>
                <div className="flex items-center gap-2">
                  <Upload className="text-muted-foreground size-3.5" />
                  <h4 className="text-[11px] font-semibold">{t("workflowKnowledge.ingestTitle")}</h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div>
                    <Label htmlFor="agent-document-id" className="mb-1.5 text-[10px]">{t("workflowKnowledge.documentId")}</Label>
                    <Input id="agent-document-id" value={document.documentId} className="text-[11px]" onChange={(event) => setDocument((value) => ({ ...value, documentId: event.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="agent-document-department" className="mb-1.5 text-[10px]">{t("workflowKnowledge.department")}</Label>
                    <Input id="agent-document-department" value={document.department} className="text-[11px]" onChange={(event) => setDocument((value) => ({ ...value, department: event.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="agent-document-permission" className="mb-1.5 text-[10px]">{t("workflowKnowledge.permission")}</Label>
                    <Input id="agent-document-permission" value={document.permission} className="text-[11px]" onChange={(event) => setDocument((value) => ({ ...value, permission: event.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="agent-document-version" className="mb-1.5 text-[10px]">{t("workflowKnowledge.version")}</Label>
                    <Input id="agent-document-version" value={document.version} className="text-[11px]" onChange={(event) => setDocument((value) => ({ ...value, version: event.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="agent-document-text" className="mb-1.5 text-[10px]">{t("workflowKnowledge.documentText")}</Label>
                  <Textarea id="agent-document-text" value={document.text} rows={4} className="text-[11px]" onChange={(event) => setDocument((value) => ({ ...value, text: event.target.value }))} />
                </div>
                {documentFormError ? <p role="alert" className="text-[var(--color-error-text)] text-[11px]">{documentFormError}</p> : null}
                {createDocument.error ? <AgentError error={createDocument.error} /> : null}
                {documentCreated ? <p role="status" className="text-[var(--color-success-text)] text-[11px]">{t("workflowKnowledge.documentCreated")}</p> : null}
                <Button type="submit" size="sm" disabled={createDocument.isPending}>
                  {createDocument.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Upload />}
                  {createDocument.isPending ? t("workflowKnowledge.submitting") : t("workflowKnowledge.ingest")}
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px]">{t("permissions.knowledgeManageRequired")}</p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold">{t("workflowKnowledge.documentsTitle")}</h4>
                <Badge variant="secondary">{documentTotal}</Badge>
              </div>
              {!canViewKnowledge ? (
                <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px]">{t("permissions.knowledgeViewRequired")}</p>
              ) : null}
              {canViewKnowledge && documents.isLoading ? <AgentLoading rows={2} /> : null}
              {canViewKnowledge && documents.isError ? (
                <AgentError error={documents.error} onRetry={() => void documents.refetch()} />
              ) : null}
              {canViewKnowledge && !documents.isLoading && !documents.isError && documentRecords.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed border-[var(--color-border-strong)] px-3 py-4 text-center text-[11px]">{t("workflowKnowledge.noDocuments")}</p>
              ) : null}
              {documentRecords.map((item) => (
                <div key={`${item.document_id}-${item.version}`} className="rounded-md border border-[var(--color-border-secondary)] px-3 py-2">
                  <p className="text-[11px] font-medium">{item.document_id}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[9px] break-all">{item.version}</p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {[item.department, item.permission, item.chunk_count, formatAgentTime(item.created_at)].filter((value) => value !== undefined && value !== null && value !== "" && value !== "-").join(" · ") || "-"}
                  </p>
                </div>
              ))}
              {canViewKnowledge && documentTotal > PAGE_SIZE ? (
                <div className="flex items-center justify-end gap-2">
                  <Button size="icon" variant="ghost" className="size-7" aria-label={t("common.previous")} disabled={documentPage <= 1 || documents.isFetching} onClick={() => setDocumentPage((value) => value - 1)}>
                    <ChevronDown className="size-3 rotate-90" />
                  </Button>
                  <span className="text-muted-foreground text-[10px]">{t("tasks.page", { page: documentPage, pages: documentPageCount })}</span>
                  <Button size="icon" variant="ghost" className="size-7" aria-label={t("common.next")} disabled={documentPage >= documentPageCount || documents.isFetching} onClick={() => setDocumentPage((value) => value + 1)}>
                    <ChevronDown className="size-3 -rotate-90" />
                  </Button>
                </div>
              ) : null}
            </div>

            <form className="space-y-3 border-t border-[var(--color-border-secondary)] pt-3" onSubmit={(event) => void submitSearch(event)}>
              <div className="flex items-center gap-2">
                <BookOpen className="text-muted-foreground size-3.5" />
                <h4 className="text-[11px] font-semibold">{t("workflowKnowledge.searchTitle")}</h4>
              </div>
              {!canSearchKnowledge ? (
                <p className="text-muted-foreground bg-sunken rounded-md px-3 py-2 text-[10px]">{t("permissions.knowledgeSearchRequired")}</p>
              ) : null}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="agent-knowledge-search" className="sr-only">{t("workflowKnowledge.searchTitle")}</Label>
                  <Input
                    id="agent-knowledge-search"
                    value={searchQuery}
                    disabled={!canSearchKnowledge}
                    placeholder={t("workflowKnowledge.searchPlaceholder")}
                    className="text-[11px]"
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <div className="w-20">
                  <Label htmlFor="agent-knowledge-top-k" className="mb-1.5 text-[9px]">{t("workflowKnowledge.topK")}</Label>
                  <Input
                    id="agent-knowledge-top-k"
                    type="number"
                    min={1}
                    max={20}
                    value={topK}
                    disabled={!canSearchKnowledge}
                    className="text-[11px]"
                    onChange={(event) => setTopK(event.target.value)}
                  />
                </div>
                <Button type="submit" size="icon" className="size-9" aria-label={t("workflowKnowledge.search")} disabled={!canSearchKnowledge || !searchQuery.trim() || searchKnowledge.isPending}>
                  {searchKnowledge.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Search />}
                </Button>
              </div>
              {searchFormError ? <p role="alert" className="text-[var(--color-error-text)] text-[11px]">{searchFormError}</p> : null}
              {searchKnowledge.error ? <AgentError error={searchKnowledge.error} /> : null}
              {searchKnowledge.data ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[10px]">{t("workflowKnowledge.resultCount", { count: searchResults.length })}</p>
                  {searchResults.length === 0 ? (
                    <p className="text-muted-foreground rounded-md border border-dashed border-[var(--color-border-strong)] px-3 py-4 text-center text-[11px]">{t("workflowKnowledge.noResults")}</p>
                  ) : searchResults.map((hit, index) => (
                    <div key={`${hit.documentId ?? "hit"}-${index}`} className="rounded-md border border-[var(--color-border-secondary)] px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-medium">{hit.title || hit.documentId || `${t("workflowKnowledge.result")} ${index + 1}`}</p>
                        {hit.score !== undefined ? <Badge variant="secondary">{hit.score}</Badge> : null}
                      </div>
                      {hit.documentId ? <p className="text-muted-foreground mt-0.5 font-mono text-[9px] break-all">{hit.documentId}</p> : null}
                      {hit.text || hit.content ? (
                        <p className="text-muted-foreground mt-1 text-[10px] leading-4 whitespace-pre-wrap">{hit.text || hit.content}</p>
                      ) : (
                        <pre className="bg-sunken mt-1 max-h-32 overflow-auto rounded p-2 text-[10px] whitespace-pre-wrap break-all">{formatAgentValue(hit)}</pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
