"use client";

import {
  BrainCircuit,
  Check,
  ChevronDown,
  CircleMinus,
  Database,
  Plug,
  Workflow,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { AgentCapabilities } from "@/lib/api/contracts/platform-agent";
import { AgentError, AgentLoading } from "./agent-feedback";

type EnterpriseCapabilities = AgentCapabilities["enterprise"];

interface CapabilityProps {
  canRead: boolean;
  enterprise?: EnterpriseCapabilities;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  showHeader?: boolean;
}

function CapabilityContent({ canRead, enterprise, isLoading, isError, error, onRetry, showHeader = true }: CapabilityProps) {
  const t = useTranslations("platformAgent");
  const features = [
    { key: "knowledge", label: t("capabilities.features.knowledge"), value: enterprise?.knowledge, icon: Database },
    { key: "memory", label: t("capabilities.features.memory"), value: enterprise?.memory, icon: BrainCircuit },
    { key: "workflows", label: t("capabilities.features.workflows"), value: enterprise?.workflows, icon: Workflow },
    { key: "mcp", label: t("capabilities.features.mcp"), value: enterprise?.mcpInstalled, icon: Plug },
  ];

  return (
    <div className="min-w-0">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex size-8 items-center justify-center rounded-md">
            <Workflow className="size-4" />
          </span>
          <div>
            <h2 className="text-[12px] font-semibold">{t("capabilities.title")}</h2>
            <p className="text-muted-foreground text-[9px]">{t("capabilities.runtime")}</p>
          </div>
        </div>
        {enterprise ? (
          <span className="flex items-center gap-1.5 text-[9px] text-[var(--color-success-text)]">
            <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
            {t("overview.online")}
          </span>
        ) : null}
      </div>
      ) : null}

      {!canRead ? <p className="text-muted-foreground mt-3 text-[10px]">{t("permissions.capabilitiesRequired")}</p> : null}
      {isLoading ? <AgentLoading rows={3} /> : null}
      {isError ? <div className="mt-3"><AgentError error={error} onRetry={onRetry} /></div> : null}

      {enterprise ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[9px] font-medium tracking-[0.08em] uppercase">
                <Wrench className="size-3" />
                {t("capabilities.tools")}
              </span>
              <Badge variant="secondary">{enterprise.tools.length}</Badge>
            </div>
            <div className="max-h-36 space-y-1 overflow-auto pr-1 xl:max-h-40">
              {enterprise.tools.length ? enterprise.tools.map((tool) => (
                <div key={tool} className="bg-card rounded border border-[var(--color-border-secondary)] px-2 py-1.5 font-mono text-[10px]">
                  {tool}
                </div>
              )) : <p className="text-muted-foreground text-[11px]">{t("capabilities.noTools")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--color-border-secondary)] pt-3 xl:grid-cols-1">
            {features.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <feature.icon className="size-3" />
                  {feature.label}
                </span>
                {feature.value ? (
                  <Check className="size-3.5 text-[var(--color-success-text)]" aria-label={t("capabilities.available")} />
                ) : (
                  <CircleMinus className="text-muted-foreground size-3.5" aria-label={t("capabilities.unavailable")} />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EnterpriseCapabilities(props: CapabilityProps) {
  const t = useTranslations("platformAgent");
  return (
    <>
      <aside className="bg-sunken/40 hidden border-r border-[var(--color-border-secondary)] p-4 xl:block">
        <CapabilityContent {...props} />
      </aside>
      <details className="group bg-sunken/40 border-b border-[var(--color-border-secondary)] xl:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 text-[12px] font-semibold">
            <Workflow className="text-[var(--color-primary-text)] size-4" />
            {t("capabilities.title")}
          </span>
          <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4"><CapabilityContent {...props} showHeader={false} /></div>
      </details>
    </>
  );
}
