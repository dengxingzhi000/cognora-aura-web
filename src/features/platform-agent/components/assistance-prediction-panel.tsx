"use client";

import { useState } from "react";
import {
  BookOpen,
  Check,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssistancePrediction } from "@/lib/api/contracts/platform-agent";
import { useAssistanceFeedback } from "../hooks";
import { AgentError } from "./agent-feedback";

export function AssistancePredictionPanel({
  prediction,
  taskSucceeded,
  onUseSuggestion,
}: {
  prediction: AssistancePrediction;
  taskSucceeded: boolean;
  onUseSuggestion: (prompt: string) => void;
}) {
  const t = useTranslations("platformAgent");
  const feedback = useAssistanceFeedback();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const intervene = prediction.decision === "OFFER_ASSISTANCE";

  const submitFeedback = (articleId: string, helpful: boolean) => {
    feedback.mutate(
      {
        predictionId: prediction.prediction_id,
        feedback: {
          needed_assistance: true,
          assistance_used: true,
          task_succeeded: taskSucceeded,
          source: "OPERATOR",
          knowledge_helpful: helpful,
          knowledge_article_id: articleId,
        },
      },
      { onSuccess: () => setSubmitted(`${articleId}:${helpful}`) },
    );
  };

  const applyArticle = (article: AssistancePrediction["knowledge"][number]) => {
    onUseSuggestion(
      [
        t("assistance.usePrompt"),
        article.title,
        article.summary,
        ...article.steps.map((step, index) => `${index + 1}. ${step}`),
      ].join("\n"),
    );
  };

  return (
    <section
      role="region"
      aria-label={t("assistance.predictionRegion")}
      className="border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/40 space-y-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Sparkles className="text-[var(--color-primary-text)] mt-0.5 size-4 shrink-0" />
          <div>
            <h3 className="text-[12px] font-semibold">{t("assistance.title")}</h3>
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              {t("assistance.probability", {
                value: Math.round(prediction.probability * 100),
              })}
              {" · "}
              {t("assistance.threshold", {
                value: Math.round(prediction.threshold * 100),
              })}
            </p>
          </div>
        </div>
        <Badge variant={intervene ? "warning" : "success"}>
          {intervene ? t("assistance.offer") : t("assistance.noInterruption")}
        </Badge>
      </div>

      {prediction.requires_human_confirmation ? (
        <div className="border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] flex items-start gap-2 rounded-md px-3 py-2">
          <ShieldAlert className="text-[var(--color-warning-text)] mt-0.5 size-3.5 shrink-0" />
          <p className="text-[var(--color-warning-text)] text-[10px] leading-4">
            {t("assistance.humanConfirmation")}
          </p>
        </div>
      ) : null}

      {prediction.knowledge.length ? (
        <div className="space-y-2">
          {prediction.knowledge.map((article) => {
            const articleSubmitted = submitted?.startsWith(article.article_id);
            return (
              <article
                key={article.article_id}
                className="bg-card rounded-md border border-[var(--color-border-secondary)] p-3"
              >
                <div className="flex items-start gap-2">
                  <BookOpen className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-semibold">{article.title}</h4>
                    <p className="text-muted-foreground mt-1 text-[10px] leading-4">
                      {article.summary}
                    </p>
                  </div>
                  <Badge variant="outline">{article.permission}</Badge>
                </div>
                <ol className="text-muted-foreground mt-2 space-y-1 pl-5 text-[10px] leading-4">
                  {article.steps.map((step, index) => (
                    <li key={`${article.article_id}-${index}`} className="list-decimal">
                      {step}
                    </li>
                  ))}
                </ol>
                {article.approval_hint ? (
                  <p className="text-[var(--color-warning-text)] mt-2 text-[10px]">
                    {t("assistance.approvalHint")}: {article.approval_hint}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => applyArticle(article)}>
                    {t("assistance.useSuggestion")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={feedback.isPending || Boolean(articleSubmitted)}
                    aria-label={`${article.title}: ${t("assistance.helpful")}`}
                    onClick={() => submitFeedback(article.article_id, true)}
                  >
                    {feedback.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <ThumbsUp />}
                    {t("assistance.helpful")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={feedback.isPending || Boolean(articleSubmitted)}
                    aria-label={`${article.title}: ${t("assistance.notHelpful")}`}
                    onClick={() => submitFeedback(article.article_id, false)}
                  >
                    <ThumbsDown />
                    {t("assistance.notHelpful")}
                  </Button>
                  {articleSubmitted && feedback.isSuccess ? (
                    <span className="text-[var(--color-success-text)] inline-flex items-center gap-1 text-[10px]">
                      <Check className="size-3" />
                      {t("assistance.feedbackRecorded")}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-[10px]">{t("assistance.noKnowledge")}</p>
      )}

      {feedback.error ? <AgentError error={feedback.error} /> : null}
    </section>
  );
}
