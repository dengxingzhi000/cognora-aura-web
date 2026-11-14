import apiClient from "../client";
import { unwrap } from "../envelope";
import type {
  InvDemandForecast,
  ReplenishmentComputeResult,
  ReplenishmentDecisionRequest,
  ReplenishmentGenerateRequest,
  ReplenishmentItemAdjustRequest,
  ReplenishmentPolicy,
  ReplenishmentPolicyPage,
  ReplenishmentPolicyRequest,
  ReplenishmentSuggestion,
  ReplenishmentSuggestionItem,
  ReplenishmentSuggestionPage,
  ReplenishmentSuggestionQueryRequest,
} from "../contracts/inventory-replenishment";

/**
 * 智能补货接口（`/api/v1/inventory/replenishment/**`）。
 *
 * 网关路径模型：inventory 走 Nacos discovery locator，前缀是
 * `/scm-inventory/api/v1/inventory`，与同目录其它库存接口一致。
 *
 * 约定差异说明：
 * - `query` 用 POST + 请求体分页，返回 MyBatis-Plus `Page` 回声；
 * - `detail` / `items` 的路径参数是**建议单主键 id**（不是 suggestionNo）；
 * - `forecasts/{skuId}` 直接返回实体，且 `warehouseId` 是 query 参数。
 */
const REPLENISHMENT_BASE = "/scm-inventory/api/v1/inventory/replenishment";

const get = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.get(url, { params }));

const post = <T>(url: string, data?: unknown) =>
  unwrap<T>(apiClient.post(url, data));

const put = <T>(url: string, data?: unknown) =>
  unwrap<T>(apiClient.put(url, data));

const del = <T>(url: string) => unwrap<T>(apiClient.delete(url));

export const replenishmentApiService = {
  // ------------------------------------------------------------ 建议单

  /** 手动触发一次补货计算。dryRun=true 只算不落库，用于预览。 */
  generate: (request: ReplenishmentGenerateRequest = {}) =>
    post<ReplenishmentComputeResult>(
      `${REPLENISHMENT_BASE}/suggestions/generate`,
      request
    ),

  query: (request: ReplenishmentSuggestionQueryRequest) =>
    post<ReplenishmentSuggestionPage>(
      `${REPLENISHMENT_BASE}/suggestions/query`,
      request
    ),

  detail: (id: string) =>
    get<ReplenishmentSuggestion>(`${REPLENISHMENT_BASE}/suggestions/${id}`),

  items: (id: string) =>
    get<ReplenishmentSuggestionItem[]>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/items`
    ),

  /** 人审改量/换供应商，仅 DRAFT 可用。 */
  adjustItem: (id: string, itemId: string, request: ReplenishmentItemAdjustRequest) =>
    put<ReplenishmentSuggestion>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/items/${itemId}`,
      request
    ),

  adopt: (id: string, request?: ReplenishmentDecisionRequest) =>
    put<ReplenishmentSuggestion>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/adopt`,
      request ?? {}
    ),

  /** 驳回必须带原因（后端会校验），用于反馈闭环。 */
  reject: (id: string, reason: string) =>
    put<ReplenishmentSuggestion>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/reject`,
      { reason }
    ),

  cancel: (id: string, request?: ReplenishmentDecisionRequest) =>
    put<ReplenishmentSuggestion>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/cancel`,
      request ?? {}
    ),

  /**
   * 转采购计划。后端在同事务里写 outbox 事件，由 scm-purchase 异步消费建 PurPlan；
   * SKU→material 映射缺失时会失败并回写 convertError，单据保持 ADOPTED 可重试。
   */
  convert: (id: string, request?: ReplenishmentDecisionRequest) =>
    put<ReplenishmentSuggestion>(
      `${REPLENISHMENT_BASE}/suggestions/${id}/convert`,
      request ?? {}
    ),

  // ------------------------------------------------------------ 策略

  /** upsert 语义：同 SKU×仓 已存在则更新。 */
  savePolicy: (request: ReplenishmentPolicyRequest) =>
    post<ReplenishmentPolicy>(`${REPLENISHMENT_BASE}/policies`, request),

  queryPolicies: (params: {
    warehouseId?: string;
    skuId?: string;
    page?: number;
    size?: number;
  }) => get<ReplenishmentPolicyPage>(`${REPLENISHMENT_BASE}/policies/query`, params),

  getPolicy: (id: string) =>
    get<ReplenishmentPolicy>(`${REPLENISHMENT_BASE}/policies/${id}`),

  deletePolicy: (id: string) =>
    del<boolean>(`${REPLENISHMENT_BASE}/policies/${id}`),

  // ------------------------------------------------------------ 预测

  /** 某 SKU×仓 最新一版需求预测，用于解释建议量来源。 */
  forecast: (skuId: string, warehouseId?: string) =>
    get<InvDemandForecast>(`${REPLENISHMENT_BASE}/forecasts/${skuId}`, {
      warehouseId,
    }),
};
