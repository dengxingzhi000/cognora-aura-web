/**
 * 智能补货（`/api/v1/inventory/replenishment/**`）的后端契约。
 *
 * 字段与 `platform-inventory` 的 DTO 一一对应，不做重命名：这一层只负责把
 * `ApiResponse<T>` 解包成 T，映射到 UI 模型的工作在
 * `src/features/inventory/lib/replenishment.mappers.ts`。
 *
 * 注意分页：补货沿用库存其它页的约定——`POST /suggestions/query` 的请求体带
 * `page`/`size`，返回原始 MyBatis-Plus `Page` 回声（`records/total/size/current`），
 * 不是 `PageResult`。
 */

/** 建议单状态机：DRAFT → ADOPTED → CONVERTED；DRAFT→REJECTED/CANCELLED；ADOPTED→CANCELLED。 */
export type ReplenishmentStatus =
  | "DRAFT"
  | "ADOPTED"
  | "CONVERTED"
  | "REJECTED"
  | "CANCELLED"

/** 人审提示位，逗号分隔字符串（后端 `ReplenishmentFlags`）。 */
export type ReplenishmentFlag =
  | "NEEDS_MANUAL"
  | "NO_LEAD_TIME"
  | "NO_SUPPLIER"
  | "MISSING_MATERIAL_MAPPING"
  | "ROUNDED_TO_MOQ"
  | "CAPPED_BY_CAPACITY"
  | "CAPPED_BY_BUDGET"
  | "COVERED_BY_IN_TRANSIT"

export interface ReplenishmentSuggestionItem {
  id: string
  skuId: string
  warehouseId: string
  /** 计算时刻的可用量快照 */
  availableStock: number
  /** 计算时刻的在途量（采购未收货 + 已采纳未收货） */
  inTransitQty: number
  reorderPoint: number
  safetyStock: number
  targetStock: number
  /** 模型建议量（已过 MOQ/包装倍数/仓容/预算裁剪） */
  suggestedQty: number
  /** 人工采纳量；null 表示未改量 */
  adoptedQty: number | null
  supplierId: string | null
  /** 逗号分隔的人审提示位，用 splitFlags() 解析 */
  flags: string | null
  /** 决策快照：公式入参与裁剪原因的文本 */
  reasonSnapshot: string | null
  /** 最终转出数量：采纳量优先，否则建议量 */
  effectiveQty: number
  /** 是否被人工改过量 */
  adjusted: boolean
}

export interface ReplenishmentSuggestion {
  id: string
  suggestionNo: string
  warehouseId: string | null
  /** 补货周期，如 2026-W45 */
  period: string
  status: ReplenishmentStatus
  businessKey: string
  itemCount: number
  totalSuggestedQty: number
  totalAdoptedQty: number | null
  /** 转出的采购计划；成功时回写 */
  purPlanId: string | null
  purPlanNo: string | null
  /** 转换失败原因；成功时为 null，单据保持 ADOPTED 可重试 */
  convertError: string | null
  rejectReason: string | null
  remark: string | null
  createdBy: string | null
  adoptedBy: string | null
  adoptedAt: string | null
  convertedAt: string | null
  createTime: string
  updateTime: string
  /** 仅详情/明细接口返回 */
  items?: ReplenishmentSuggestionItem[]
}

/** 补货计算请求。dryRun=true 只算不落库。 */
export interface ReplenishmentGenerateRequest {
  warehouseId?: string
  skuIds?: string[]
  /** 不传则按当前 ISO 周推导，如 2026-W45 */
  period?: string
  dryRun?: boolean
  totalBudget?: number
  lookbackDays?: number
}

/** 计算结果的单行，用于 dry-run 预览。 */
export interface ReplenishmentComputeLine {
  skuId: string
  warehouseId: string
  availableStock: number
  inTransitQty: number
  reorderPoint: number
  safetyStock: number
  targetStock: number
  suggestedQty: number
  flags: string | null
  reason: string
}

export interface ReplenishmentComputeResult {
  period: string
  scannedInventories: number
  triggeredItems: number
  skippedItems: number
  needsManualItems: number
  totalSuggestedQty: number
  businessKey: string
  /** 幂等命中时返回既有单据 ID（本次未新建） */
  existingSuggestionId: string | null
  dryRun: boolean
  lines: ReplenishmentComputeLine[]
}

export interface ReplenishmentSuggestionQueryRequest {
  warehouseId?: string
  status?: ReplenishmentStatus
  period?: string
  suggestionNo?: string
  page?: number
  size?: number
}

/** 人审改量/换供应商（仅 DRAFT）。 */
export interface ReplenishmentItemAdjustRequest {
  adoptedQty?: number
  supplierId?: string
  reason?: string
}

/** 采纳/驳回/取消/转采购共用的决策载荷。 */
export interface ReplenishmentDecisionRequest {
  reason?: string
}

export interface ReplenishmentPolicy {
  id: string
  skuId: string
  warehouseId: string
  /** A / B / C，决定默认服务水平 */
  abcClass: string
  serviceLevel: number
  /** 供应交期 L（天） */
  leadTimeDays: number
  /** 补货复核周期（天） */
  reviewPeriodDays: number
  /** 规则版安全库存天数，SS ≈ μ × safetyDays */
  safetyDays: number
  minOrderQty: number
  packMultiple: number
  supplierId: string | null
  /** true 时以台账 safety_stock/max_stock 为准 */
  manualOverride: boolean
  enabled: boolean
  remark: string | null
  createTime: string
  updateTime: string
}

export interface ReplenishmentPolicyRequest {
  skuId: string
  warehouseId: string
  abcClass?: string
  serviceLevel?: number
  leadTimeDays?: number
  reviewPeriodDays?: number
  safetyDays?: number
  minOrderQty?: number
  packMultiple?: number
  supplierId?: string
  manualOverride?: boolean
  enabled?: boolean
  remark?: string
}

/** 需求预测（`GET /forecasts/{skuId}` 直接返回实体，无 DTO 包装）。 */
export interface InvDemandForecast {
  id: string
  skuId: string
  warehouseId: string
  forecastDate: string
  /** 日需求 μ */
  dailyDemand: number
  /** 需求标准差 σ */
  demandStdDev: number
  /** 回测误差；规则版移动平均为 null */
  mape: number | null
  method: string
  /** NORMAL / LOW_CONFIDENCE */
  confidence: string
  sampleDays: number
  version: number
  createTime: string
}

/** MyBatis-Plus `Page` 回声。 */
export interface ReplenishmentSuggestionPage {
  records: ReplenishmentSuggestion[]
  total: number
  size: number
  current: number
}

export interface ReplenishmentPolicyPage {
  records: ReplenishmentPolicy[]
  total: number
  size: number
  current: number
}
