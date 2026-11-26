import type {
  BrowserTaskApproval,
  BrowserTaskSteps,
  BrowserTaskSummary,
} from "@/lib/api/contracts/platform-agent";

export function browserTaskId(task?: BrowserTaskSummary | null) {
  return task?.taskId ?? task?.task_id ?? task?.id ?? "";
}

export function browserTaskType(task?: BrowserTaskSummary | null) {
  return task?.taskType ?? task?.task_type ?? "-";
}

export function browserTargetSystem(task?: BrowserTaskSummary | null) {
  return task?.target?.system ?? task?.targetSystem ?? task?.target_system ?? "-";
}

export function browserApprovalId(approval?: BrowserTaskApproval | null) {
  return approval?.approvalId ?? approval?.approval_id ?? approval?.id ?? "";
}

export function normalizeBrowserSteps(value?: BrowserTaskSteps | null) {
  if (Array.isArray(value)) return value;
  return value?.records ?? value?.steps ?? [];
}

export function formatAgentValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatAgentTime(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 19) : "-";
}

export function formatAgentBytes(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function downloadAgentArtifact(blob: Blob, filename: string) {
  const safeName = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "artifact";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
