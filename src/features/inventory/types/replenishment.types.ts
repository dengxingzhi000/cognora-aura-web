import type { ReplenishmentStatus } from '@/lib/api/contracts/inventory-replenishment'

/**
 * 智能补货的 UI 模型。
 *
 * 与后端契约分开的理由和库存其它模块一致：后端用数值型 BigDecimal、逗号分隔的
 * flag 字符串、可空字段；界面需要的是已经本地化的标签、解析好的 flag 数组、
 * 以及"能不能改/能不能采纳"这类派生判断。把这些判断留在 mappers 里，
 * 组件只负责渲染，避免状态机规则散落在 JSX 中。
 */

export type { ReplenishmentStatus }

/** 人审提示位的展示形态。 */
export type ReplenishmentFlagKey =
  | 'NEEDS_MANUAL'
  | 'NO_LEAD_TIME'
  | 'NO_SUPPLIER'
  | 'MISSING_MATERIAL_MAPPING'
  | 'ROUNDED_TO_MOQ'
  | 'CAPPED_BY_CAPACITY'
  | 'CAPPED_BY_BUDGET'
  | 'COVERED_BY_IN_TRANSIT'

export interface ReplenishmentFlagMeta {
  key: ReplenishmentFlagKey
  label: string
  /** 需要人工介入的标记用 warning，纯解释性标记用 secondary */
  tone: 'warning' | 'secondary'
}

/** 建议明细的 UI 行。 */
export interface ReplenishmentItemRow {
  id: string
  skuId: string
  warehouseId: string
  availableStock: number
  inTransitQty: number
  reorderPoint: number
  safetyStock: number
  targetStock: number
  suggestedQty: number
  adoptedQty: number | null
  /** 最终转出量：采纳量优先 */
  effectiveQty: number
  adjusted: boolean
  supplierId: string | null
  /** 已解析并带标签的提示位 */
  flags: ReplenishmentFlagMeta[]
  /** 决策快照原文，展开时展示 */
  reason: string | null
}

/** 建议单的 UI 行。 */
export interface ReplenishmentSuggestionRow {
  id: string
  suggestionNo: string
  warehouseId: string | null
  period: string
  status: ReplenishmentStatus
  statusLabel: string
  itemCount: number
  totalSuggestedQty: number
  totalAdoptedQty: number
  /** 采纳后待转出的总量 */
  effectiveQty: number
  purPlanId: string | null
  purPlanNo: string | null
  convertError: string | null
  rejectReason: string | null
  remark: string | null
  createTime: string
  /** 派生：是否允许人审改量 */
  editable: boolean
  /** 派生：是否允许采纳/驳回 */
  decidable: boolean
  /** 派生：是否允许转采购计划 */
  convertible: boolean
  items?: ReplenishmentItemRow[]
}

/** 补货策略的 UI 行。 */
export interface ReplenishmentPolicyRow {
  id: string
  skuId: string
  warehouseId: string
  abcClass: string
  serviceLevel: number
  leadTimeDays: number
  reviewPeriodDays: number
  safetyDays: number
  minOrderQty: number
  packMultiple: number
  supplierId: string | null
  manualOverride: boolean
  enabled: boolean
  remark: string | null
  updateTime: string
}

/** dry-run 预览的一行。 */
export interface ReplenishmentPreviewRow {
  skuId: string
  warehouseId: string
  availableStock: number
  inTransitQty: number
  reorderPoint: number
  safetyStock: number
  targetStock: number
  suggestedQty: number
  flags: ReplenishmentFlagMeta[]
  reason: string
}

/** 一次计算结果（dry-run 预览或落库结果）。 */
export interface ReplenishmentComputeSummary {
  period: string
  scannedInventories: number
  triggeredItems: number
  skippedItems: number
  needsManualItems: number
  totalSuggestedQty: number
  /** 幂等命中时非空：本次没有新建单据 */
  existingSuggestionId: string | null
  dryRun: boolean
  lines: ReplenishmentPreviewRow[]
}

/** 需求预测的 UI 模型。 */
export interface DemandForecastRow {
  skuId: string
  warehouseId: string
  forecastDate: string
  dailyDemand: number
  demandStdDev: number
  mape: number | null
  method: string
  /** NORMAL / LOW_CONFIDENCE */
  confidence: string
  lowConfidence: boolean
  sampleDays: number
  version: number
}

/** 建议单查询参数。 */
export interface ReplenishmentSearchParams {
  current?: number
  pageSize?: number
  warehouseId?: string
  status?: ReplenishmentStatus
  period?: string
  suggestionNo?: string
}
