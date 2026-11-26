import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en-US.json";
import type { AssistanceDashboardData } from "@/lib/api/contracts/platform-agent";

const h = vi.hoisted(() => ({
  data: undefined as AssistanceDashboardData | undefined,
  loading: false,
  error: null as unknown,
  fetching: false,
  refetch: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useAssistanceDashboard: () => ({
    data: h.data,
    isLoading: h.loading,
    isError: Boolean(h.error),
    error: h.error,
    isFetching: h.fetching,
    refetch: h.refetch,
  }),
}));

import { AssistanceDashboard } from "./assistance-dashboard";

const metric = {
  precision: 0.8,
  recall: 0.6,
  f1: 0.69,
  roc_auc: 0.9,
  brier: 0.1,
  expected_cost: 0.2,
  false_positives: 2,
  false_negatives: 3,
  support: 50,
};

const dashboard: AssistanceDashboardData = {
  generated_at: "2026-11-25T00:00:00+00:00",
  model: {
    model_version: "bootstrap-v2",
    feature_version: 2,
    training_source: "synthetic_bootstrap",
    tenant_id: "tenant-a",
    trained_at: "2026-11-25T00:00:00+00:00",
    threshold: 0.49,
    false_positive_cost: 1,
    false_negative_cost: 2,
    baseline_positive_rate: 0.23,
    baseline_probability_mean: 0.25,
    live_count: 120,
    live_probability_mean: 0.31,
    probability_mean_delta: 0.06,
    drift_warning: false,
    dataset: { samples: 2400 },
    metrics: {
      precision: 0.61,
      recall: 0.55,
      f1: 0.58,
      roc_auc: 0.8,
      brier: 0.13,
      expected_cost: 0.28,
      threshold: 0.49,
      slice_metrics: {
        by_role: { employee: metric },
        by_module: { order: metric },
        by_workflow: { create_order: metric },
      },
    },
  },
  coverage: {
    predictions: 10,
    feedback: 6,
    outcomes: 8,
    feedback_coverage: 0.6,
    knowledge_feedback: 4,
    knowledge_helpful_rate: 0.75,
  },
  knowledge: {
    top_articles: [
      { article_id: "order-create-server-error", title: "Order 5xx", recommendations: 5 },
    ],
    helpful_rate: 0.75,
  },
};

const renderDashboard = () =>
  render(
    <NextIntlClientProvider locale="en-US" messages={messages}>
      <AssistanceDashboard />
    </NextIntlClientProvider>,
  );

describe("AssistanceDashboard", () => {
  beforeEach(() => {
    h.data = dashboard;
    h.loading = false;
    h.error = null;
    h.fetching = false;
    h.refetch.mockReset();
  });

  it("shows coverage, drift, model and knowledge usage", () => {
    renderDashboard();

    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("bootstrap-v2")).toBeInTheDocument();
    expect(screen.getByText("Order 5xx")).toBeInTheDocument();
    expect(screen.getByText("employee")).toBeInTheDocument();
  });

  it("switches slice dimensions without another request", async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole("button", { name: "Workflow" }));

    expect(screen.getByText("create_order")).toBeInTheDocument();
    expect(h.refetch).not.toHaveBeenCalled();
  });

  it("renders a retryable error state", () => {
    h.data = undefined;
    h.error = new Error("dashboard unavailable");
    renderDashboard();

    expect(screen.getByRole("alert")).toHaveTextContent("dashboard unavailable");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
