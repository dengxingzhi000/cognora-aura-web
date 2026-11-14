import { replenishmentApiService } from '@/lib/api/services/inventory-replenishment'
import {
  toDemandForecastRow,
  toReplenishmentComputeSummary,
  toReplenishmentPolicyRow,
  toReplenishmentSuggestionPage,
  toReplenishmentSuggestionRow,
} from '../lib/replenishment.mappers'
import type {
  DemandForecastRow,
  PageResult,
  ReplenishmentComputeSummary,
  ReplenishmentPolicyRow,
  ReplenishmentSearchParams,
  ReplenishmentSuggestionRow,
} from '../types'

/**
 * 补货服务的 UI 门面。
 *
 * 与 `inventory.service.ts` 同构：组件只依赖这里的返回类型（UI 模型），
 * 契约解包与映射都留在这层，组件不感知后端字段名与可空性。
 */
export const replenishmentService = {
  list: async (
    params?: ReplenishmentSearchParams
  ): Promise<PageResult<ReplenishmentSuggestionRow>> =>
    toReplenishmentSuggestionPage(
      await replenishmentApiService.query({
        page: params?.current ?? 1,
        size: params?.pageSize ?? 20,
        warehouseId: params?.warehouseId || undefined,
        status: params?.status,
        period: params?.period || undefined,
        suggestionNo: params?.suggestionNo || undefined,
      })
    ),

  detail: async (id: string): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(await replenishmentApiService.detail(id)),

  /** 手动触发一次计算。dryRun 只返回预览，不落库。 */
  generate: async (options?: {
    warehouseId?: string
    period?: string
    dryRun?: boolean
    totalBudget?: number
    lookbackDays?: number
  }): Promise<ReplenishmentComputeSummary> =>
    toReplenishmentComputeSummary(
      await replenishmentApiService.generate({
        warehouseId: options?.warehouseId || undefined,
        period: options?.period || undefined,
        dryRun: options?.dryRun ?? false,
        totalBudget: options?.totalBudget,
        lookbackDays: options?.lookbackDays,
      })
    ),

  adjustItem: async (
    id: string,
    itemId: string,
    adoptedQty: number,
    reason?: string
  ): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(
      await replenishmentApiService.adjustItem(id, itemId, { adoptedQty, reason })
    ),

  adopt: async (id: string): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(await replenishmentApiService.adopt(id)),

  reject: async (id: string, reason: string): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(await replenishmentApiService.reject(id, reason)),

  cancel: async (id: string): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(await replenishmentApiService.cancel(id)),

  convert: async (id: string): Promise<ReplenishmentSuggestionRow> =>
    toReplenishmentSuggestionRow(await replenishmentApiService.convert(id)),

  listPolicies: async (params?: {
    warehouseId?: string
    skuId?: string
    current?: number
    pageSize?: number
  }): Promise<PageResult<ReplenishmentPolicyRow>> => {
    const page = await replenishmentApiService.queryPolicies({
      warehouseId: params?.warehouseId || undefined,
      skuId: params?.skuId || undefined,
      page: params?.current ?? 1,
      size: params?.pageSize ?? 20,
    })
    const records = page?.records ?? []
    return {
      records: records.map(toReplenishmentPolicyRow),
      total: page?.total ?? records.length,
      current: page?.current ?? 1,
      pageSize: page?.size ?? records.length,
    }
  },

  forecast: async (
    skuId: string,
    warehouseId?: string
  ): Promise<DemandForecastRow | null> => {
    try {
      return toDemandForecastRow(
        await replenishmentApiService.forecast(skuId, warehouseId)
      )
    } catch {
      // 后端在「该 SKU 尚无需求预测」时返回 404（ApiResponse.fail），
      // 这对界面是正常空值而不是错误，因此吞掉。
      return null
    }
  },
}
