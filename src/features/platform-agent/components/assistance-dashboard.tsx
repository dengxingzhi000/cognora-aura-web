"use client";

import { useState } from "react";
import { Activity, BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAssistanceDashboard } from "../hooks";
import { AgentError, AgentLoading } from "./agent-feedback";

type SliceDimension = "by_role" | "by_module" | "by_workflow";

const DIMENSIONS: SliceDimension[] = ["by_role", "by_module", "by_workflow"];

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function MetricBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" }) {
  const normalized = Math.max(0, Math.min(1, value));
  return (
    <div className="flex min-w-24 items-center gap-2">
      <div className="bg-sunken h-1.5 flex-1 overflow-hidden rounded-full">
        <span
          className={cn("block h-full rounded-full", tone === "success" ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]")}
          style={{ width: percent(normalized) }}
        />
      </div>
      <span className="w-9 text-right font-mono text-[10px] tabular-nums">{percent(normalized)}</span>
    </div>
  );
}

export function AssistanceDashboard() {
  const t = useTranslations("platformAgent");
  const [dimension, setDimension] = useState<SliceDimension>("by_role");
  const dashboard = useAssistanceDashboard();

  if (dashboard.isLoading) return <AgentLoading rows={5} />;
  if (dashboard.isError) {
    return <AgentError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }
  const data = dashboard.data;
  if (!data) return null;
  const slices = Object.entries(data.model.metrics.slice_metrics[dimension] ?? {});

  return (
    <section
      id="platform-agent-assistance-panel"
      role="tabpanel"
      aria-labelledby="platform-agent-assistance-tab"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("assistance.dashboard.title")}</h2>
          <p className="text-muted-foreground mt-1 text-[11px]">
            {t("assistance.dashboard.description")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          <RefreshCw className={cn(dashboard.isFetching && "motion-safe:animate-spin")} />
          {t("common.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-[12px]">
              <Activity className="size-3.5" />
              {t("assistance.dashboard.feedbackCoverage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-semibold">{percent(data.coverage.feedback_coverage)}</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {t("assistance.dashboard.feedbackCount", {
                feedback: data.coverage.feedback,
                predictions: data.coverage.predictions,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-[12px]">
              <BookOpen className="size-3.5" />
              {t("assistance.dashboard.knowledgeHelpful")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-2xl font-semibold">{percent(data.coverage.knowledge_helpful_rate)}</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {t("assistance.dashboard.knowledgeFeedbackCount", {
                count: data.coverage.knowledge_feedback,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-[12px]">
              <Activity className="size-3.5" />
              {t("assistance.dashboard.drift")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {data.model.probability_mean_delta >= 0 ? "+" : ""}
                {data.model.probability_mean_delta.toFixed(3)}
              </p>
              <Badge variant={data.model.drift_warning ? "destructive" : "success"}>
                {data.model.drift_warning
                  ? t("assistance.dashboard.driftWarning")
                  : t("assistance.dashboard.stable")}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {t("assistance.dashboard.liveCount", { count: data.model.live_count })}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-[12px]">
              <ShieldCheck className="size-3.5" />
              {t("assistance.dashboard.model")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="truncate font-mono text-[13px] font-semibold">
              {data.model.model_version}
            </p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {t("assistance.dashboard.threshold", {
                value: Math.round(data.model.threshold * 100),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center justify-between px-4">
          <div>
            <CardTitle className="text-[13px]">{t("assistance.dashboard.slices")}</CardTitle>
            <CardDescription className="text-[11px]">
              {t("assistance.dashboard.slicesDescription")}
            </CardDescription>
          </div>
          <div className="bg-sunken inline-flex gap-1 rounded-md border border-[var(--color-border-secondary)] p-0.5">
            {DIMENSIONS.map((item) => (
              <Button
                key={item}
                size="sm"
                variant="ghost"
                className={cn("h-7 px-2 text-[10px]", dimension === item && "bg-card border")}
                aria-pressed={dimension === item}
                onClick={() => setDimension(item)}
              >
                {t(`assistance.dashboard.dimensions.${item}`)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {slices.length ? (
            <div className="max-h-[360px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("assistance.dashboard.slice")}</TableHead>
                    <TableHead>{t("assistance.dashboard.precision")}</TableHead>
                    <TableHead>{t("assistance.dashboard.recall")}</TableHead>
                    <TableHead>{t("assistance.dashboard.support")}</TableHead>
                    <TableHead>{t("assistance.dashboard.errors")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slices.map(([key, metric]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-[11px]">{key}</TableCell>
                      <TableCell><MetricBar value={metric.precision} /></TableCell>
                      <TableCell><MetricBar value={metric.recall} tone="success" /></TableCell>
                      <TableCell className="text-[11px]">{metric.support}</TableCell>
                      <TableCell className="text-[10px]">
                        FP {metric.false_positives} / FN {metric.false_negatives}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground px-4 text-[11px]">
              {t("assistance.dashboard.noSlices")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-[13px]">{t("assistance.dashboard.topKnowledge")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          {data.knowledge.top_articles.length ? (
            data.knowledge.top_articles.map((article) => (
              <div key={article.article_id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">{article.title || article.article_id}</p>
                  <progress
                    className="agent-progress mt-1 h-1.5 w-full"
                    max={Math.max(...data.knowledge.top_articles.map((item) => item.recommendations), 1)}
                    value={article.recommendations}
                    aria-label={article.title || article.article_id}
                  />
                </div>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {article.recommendations}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-[11px]">{t("assistance.dashboard.noKnowledge")}</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
