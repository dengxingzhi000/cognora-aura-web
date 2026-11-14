import type {
  InvDemandForecast,
  ReplenishmentComputeResult,
  ReplenishmentPolicy,
  ReplenishmentSuggestion,
  ReplenishmentSuggestionItem,
  ReplenishmentSuggestionPage,
} from '@/lib/api/contracts/inventory-replenishment'
import type {
  DemandForecastRow,
  ReplenishmentComputeSummary,
  ReplenishmentFlagMeta,
  ReplenishmentFlagKey,
  ReplenishmentItemRow,
  ReplenishmentPolicyRow,
  ReplenishmentSuggestionRow,
  PageResult,
} from '../types'

/**
 * 补货契约 → UI 模型。
 *
 * 状态机规则集中在这里，不散落到组件里：后端 `ReplenishmentStatus` 的约束是
 * `DRAFT → ADOPTED/CANCELLED`、`ADOPTED → CONVERTED/CANCELLED`，
 * 三个终态不可再变。按钮的禁用状态全部由 `editable` / `decidable` / `convertible`
 * 三个派生字段驱动，避免每处 JSX 各写一遍 if。
 */

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  ADOPTED: '已采纳',
  CONVERTED: '已转采购计划',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
}

/**
 * 提示位的展示文案。
 *
 * 未知标记直接忽略（后端可能新增 flag，旧前端不该因此崩溃或显示原始英文枚举）。
 */
const FLAG_LABELS: Record<ReplenishmentFlagKey, { label: string; tone: 'warning' | 'secondary' }> = {
  NEEDS_MANUAL: { label: '需人工确认', tone: 'warning' },
  NO_LEAD_TIME: { label: '缺交期', tone: 'warning' },
  NO_SUPPLIER: { label: '无供应商', tone: 'warning' },
  MISSING_MATERIAL_MAPPING: { label: '待补物料映射', tone: 'warning' },
  ROUNDED_TO_MOQ: { label: '已按 MOQ 取整', tone: 'secondary' },
  CAPPED_BY_CAPACITY: { label: '受仓容限制', tone: 'secondary' },
  CAPPED_BY_BUDGET: { label: '受预算限制', tone: 'secondary' },
  COVERED_BY_IN_TRANSIT: { label: '在途已覆盖', tone: 'secondary' },
}

/** 把逗号分隔的 flag 字符串解析成带标签的数组；空值返回空数组。 */
export function parseFlags(raw: string | null | undefined): ReplenishmentFlagMeta[] {
  if (!raw) {
    return []
  }
  const result: ReplenishmentFlagMeta[] = []
  for (const part of raw.split(',')) {
    const key = part.trim() as ReplenishmentFlagKey
    const meta = FLAG_LABELS[key]
    if (meta) {
      result.push({ key, label: meta.label, tone: meta.tone })
    }
  }
  return result
}

export function toStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function toReplenishmentItemRow(
  item: ReplenishmentSuggestionItem
): ReplenishmentItemRow {
  return {
    id: item.id,
    skuId: item.skuId,
    warehouseId: item.warehouseId,
    availableStock: item.availableStock ?? 0,
    inTransitQty: item.inTransitQty ?? 0,
    reorderPoint: Number(item.reorderPoint ?? 0),
    safetyStock: Number(item.safetyStock ?? 0),
    targetStock: Number(item.targetStock ?? 0),
    suggestedQty: item.suggestedQty ?? 0,
    adoptedQty: item.adoptedQty ?? null,
    effectiveQty: item.effectiveQty ?? item.suggestedQty ?? 0,
    adjusted: Boolean(item.adjusted),
    supplierId: item.supplierId ?? null,
    flags: parseFlags(item.flags),
  reason: item.reasonSnapshot ?? null,
  }
}

export function toReplenishmentSuggestionRow(
  suggestion: ReplenishmentSuggestion
): ReplenishmentSuggestionRow {
  const status = suggestion.status
  const totalAdoptedQty = suggestion.totalAdoptedQty ?? 0
  return {
    id: suggestion.id,
    suggestionNo: suggestion.suggestionNo,
    warehouseId: suggestion.warehouseId ?? null,
    period: suggestion.period,
    status,
    statusLabel: toStatusLabel(status),
    itemCount: suggestion.itemCount ?? 0,
    totalSuggestedQty: Number(suggestion.totalSuggestedQty ?? 0),
    totalAdoptedQty: Number(totalAdoptedQty),
    // 与人审改量后的语义一致：采纳量存在就用它，否则用建议量
    effectiveQty: Number(
      suggestion.totalAdoptedQty ?? suggestion.totalSuggestedQty ?? 0
    ),
    purPlanId: suggestion.purPlanId ?? null,
    purPlanNo: suggestion.purPlanNo ?? null,
    convertError: suggestion.convertError ?? null,
    rejectReason: suggestion.rejectReason ?? null,
    remark: suggestion.remark ?? null,
    createTime: suggestion.createTime,
    // 只有草稿能改量/采纳/驳回
    editable: status === 'DRAFT',
    decidable: status === 'DRAFT',
    convertible: status === 'ADOPTED',
    items: suggestion.items?.map(toReplenishmentItemRow),
  }
}

export function toReplenishmentSuggestionPage(
  page: ReplenishmentSuggestionPage | null | undefined
): PageResult<ReplenishmentSuggestionRow> {
  const records = page?.records ?? []
  return {
    records: records.map(toReplenishmentSuggestionRow),
    total: page?.total ?? records.length,
    current: page?.current ?? 1,
    pageSize: page?.size ?? records.length,
  }
}

export function toReplenishmentPolicyRow(
  policy: ReplenishmentPolicy
): ReplenishmentPolicyRow {
  return {
    id: policy.id,
    skuId: policy.skuId,
    warehouseId: policy.warehouseId,
    abcClass: policy.abcClass,
    serviceLevel: Number(policy.serviceLevel ?? 0),
    leadTimeDays: policy.leadTimeDays ?? 0,
    reviewPeriodDays: policy.reviewPeriodDays ?? 0,
    safetyDays: Number(policy.safetyDays ?? 0),
    minOrderQty: policy.minOrderQty ?? 1,
    packMultiple: policy.packMultiple ?? 1,
    supplierId: policy.supplierId ?? null,
    manualOverride: Boolean(policy.manualOverride),
    enabled: policy.enabled ?? true,
    remark: policy.remark ?? null,
    updateTime: policy.updateTime,
  }
}

export function toReplenishmentComputeSummary(
  result: ReplenishmentComputeResult
): ReplenishmentComputeSummary {
  return {
    period: result.period,
    scannedInventories: result.scannedInventories ?? 0,
    triggeredItems: result.triggeredItems ?? 0,
    skippedItems: result.skippedItems ?? 0,
    needsManualItems: result.needsManualItems ?? 0,
    totalSuggestedQty: Number(result.totalSuggestedQty ?? 0),
    existingSuggestionId: result.existingSuggestionId ?? null,
    dryRun: Boolean(result.dryRun),
    lines: (result.lines ?? []).map((line) => ({
      skuId: line.skuId,
      warehouseId: line.warehouseId,
      availableStock: line.availableStock ?? 0,
      inTransitQty: line.inTransitQty ?? 0,
      reorderPoint: Number(line.reorderPoint ?? 0),
      safetyStock: Number(line.safetyStock ?? 0),
      targetStock: Number(line.targetStock ?? 0),
      suggestedQty: line.suggestedQty ?? 0,
      flags: parseFlags(line.flags),
      reason: line.reason ?? '',
    })),
  }
}

export function toDemandForecastRow(
  forecast: InvDemandForecast
): DemandForecastRow {
  return {
    skuId: forecast.skuId,
    warehouseId: forecast.warehouseId,
    forecastDate: forecast.forecastDate,
    dailyDemand: Number(forecast.dailyDemand ?? 0),
    demandStdDev: Number(forecast.demandStdDev ?? 0),
    mape: forecast.mape === null || forecast.mape === undefined ? null : Number(forecast.mape),
    method: forecast.method,
    confidence: forecast.confidence,
    lowConfidence: forecast.confidence === 'LOW_CONFIDENCE',
    sampleDays: forecast.sampleDays ?? 0,
    version: forecast.version ?? 1,
  }
}
