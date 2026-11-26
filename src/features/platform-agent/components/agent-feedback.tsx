"use client";

import { AlertTriangle, LockKeyhole, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/envelope";
import { formatAgentValue } from "../lib/browser-task";

export function AgentError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const t = useTranslations("platformAgent");
  return (
    <div
      role="alert"
      className="border-[var(--color-error)]/25 bg-[var(--color-error-soft)] flex items-start gap-3 rounded-lg px-4 py-3"
    >
      <AlertTriangle className="text-[var(--color-error-text)] mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[var(--color-error-text)] text-[13px] font-medium">
          {t("errors.requestFailed")}
        </p>
        <p className="text-muted-foreground mt-0.5 break-words text-[11px]">
          {toApiError(error).message}
        </p>
      </div>
      {onRetry ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-7 shrink-0"
        >
          <RotateCw />
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function AgentAccessDenied() {
  const t = useTranslations("platformAgent");
  return (
    <div
      role="status"
      className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-card px-6 text-center"
    >
      <span className="bg-sunken text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
        <LockKeyhole className="size-5" />
      </span>
      <h2 className="text-sm font-semibold">{t("permissions.denied")}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-[12px] leading-5">
        {t("permissions.deniedDescription")}
      </p>
    </div>
  );
}

export function AgentLoading({ rows = 3 }: { rows?: number }) {
  const t = useTranslations("platformAgent");
  return (
    <div role="status" aria-label={t("common.loading")} className="space-y-3 p-4">
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function AgentJson({ label, value }: { label: string; value: unknown }) {
  const t = useTranslations("platformAgent");
  const text = formatAgentValue(value);
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
        {label}
      </p>
      <pre className="bg-sunken mt-1.5 max-h-52 overflow-auto rounded-md p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap break-all">
        {text}
      </pre>
      {text === "-" ? (
        <span className="sr-only">{t("common.noData")}</span>
      ) : null}
    </div>
  );
}
