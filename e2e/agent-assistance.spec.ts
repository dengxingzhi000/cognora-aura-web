import { expect, test } from "@playwright/test";

const userInfo = {
  code: 200,
  data: {
    id: "admin",
    username: "admin",
    displayName: "Admin",
    permissions: [
      "agent:capabilities:view",
      "agent:chat:run",
      "agent:assistance:predict",
      "agent:assistance:feedback",
      "agent:assistance:dashboard:view",
    ],
  },
};

const prediction = {
  prediction_id: "prediction-e2e",
  probability: 0.91,
  threshold: 0.49,
  decision: "OFFER_ASSISTANCE",
  suggested_action: "OPEN_ASSISTANT",
  model_version: "bootstrap-v2",
  feature_version: 2,
  training_source: "synthetic_bootstrap",
  created_at: "2026-11-25T00:00:00+00:00",
  requires_human_confirmation: false,
  knowledge_count: 1,
  context_summary: { recent_events: 1, server_outcomes: 0, history_predictions_7d: 0 },
  knowledge: [
    {
      article_id: "order-create-server-error",
      version: "v1",
      title: "下单接口 5xx 或超时",
      summary: "先确认订单是否已落库，再排查服务错误。",
      steps: ["检查订单列表", "查看服务端日志"],
      permission: "employee",
      requires_human_confirmation: false,
      approval_hint: null,
      source: "curated-runbook",
      updated_at: "2026-11-25T00:00:00+00:00",
    },
  ],
};

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

const dashboard = {
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
      { article_id: "order-create-server-error", title: "下单接口 5xx 或超时", recommendations: 5 },
    ],
    helpful_rate: 0.75,
  },
};

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: "access_token", value: "browser-e2e-token", url: "http://localhost:3000" },
  ]);
  await page.route("**/auth/api/auth/userinfo", (route) =>
    route.fulfill({ json: userInfo }),
  );
  await page.route("**/scm-notify/sys-user-notification/unread-count", (route) =>
    route.fulfill({ json: { code: 200, data: 0 } }),
  );
  await page.route("**/platform-agent/api/v1/agent/capabilities", (route) =>
    route.fulfill({
      json: {
        code: 200,
        data: {
          enterprise: {
            tools: ["inventory.query"],
            knowledge: true,
            memory: true,
            workflows: true,
            mcpInstalled: false,
            writingAssistant: false,
          },
          browser: { tools: [], workflows: [], approvalRequiredForSensitiveActions: true },
        },
      },
    }),
  );
  await page.route("**/platform-agent/api/v1/agent/workflows", (route) =>
    route.fulfill({ json: { code: 200, data: { workflows: [] } } }),
  );
  await page.route("**/platform-agent/api/v1/agent/knowledge/documents*", (route) =>
    route.fulfill({ json: { code: 200, data: { documents: [], total: 0, limit: 10, offset: 0 } } }),
  );
});

test("requests assistance knowledge and records usefulness feedback", async ({ page }) => {
  let predictionRequest: Record<string, unknown> | undefined;
  let feedbackRequest: Record<string, unknown> | undefined;
  await page.route("**/platform-agent/api/v1/agent/assistance/predict", async (route) => {
    predictionRequest = route.request().postDataJSON();
    await route.fulfill({ json: { code: 200, data: prediction } });
  });
  await page.route("**/platform-agent/api/v1/agent/assistance/predictions/*/feedback", async (route) => {
    feedbackRequest = route.request().postDataJSON();
    await route.fulfill({ json: { code: 200, data: null } });
  });

  await page.goto("/zh-CN/platform-agent");
  await page.getByRole("button", { name: "获取 AI 协助" }).click();

  const panel = page.getByRole("region", { name: "AI 介入预测与处置知识" });
  await expect(panel).toContainText("下单接口 5xx 或超时");
  expect(predictionRequest).toMatchObject({
    signals: { module: "platform_agent", workflow: "enterprise_chat", explicit_help_request: true },
  });
  expect(Array.isArray((predictionRequest as { recent_events?: unknown[] })?.recent_events)).toBe(true);

  await page.getByRole("button", { name: "下单接口 5xx 或超时: 有帮助" }).click();
  await expect(panel).toContainText("反馈已记录");
  expect(feedbackRequest).toMatchObject({
    needed_assistance: true,
    assistance_used: true,
    source: "OPERATOR",
    knowledge_helpful: true,
    knowledge_article_id: "order-create-server-error",
  });
});

test("shows the closed-loop dashboard and switches slices", async ({ page }) => {
  await page.route("**/platform-agent/api/v1/agent/assistance/dashboard/data", (route) =>
    route.fulfill({ json: { code: 200, data: dashboard } }),
  );

  await page.goto("/zh-CN/platform-agent");
  await page.getByRole("tab", { name: "AI 介入闭环" }).click();

  await expect(page.getByRole("heading", { name: "AI 介入闭环监控" })).toBeVisible();
  await expect(page.getByText("60%").first()).toBeVisible();
  await expect(page.getByText("bootstrap-v2")).toBeVisible();
  await page.getByRole("button", { name: "工作流", exact: true }).click();
  await expect(page.getByText("create_order")).toBeVisible();
});
