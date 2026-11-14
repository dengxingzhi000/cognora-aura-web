'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

import { toApiError } from '@/lib/api/envelope'
import { replenishmentService } from '../services/replenishment.service'
import type { ReplenishmentSearchParams } from '../types'

/**
 * 智能补货的查询/变更 hooks。
 *
 * 失效范围用 `['inventory', 'replenishment']` 前缀：补货单据变化会影响建议量，
 * 但不影响库存台账本身，因此不去打整个 `['inventory']` 缓存——
 * 否则每次人审改动都会连带重拉库存列表、流水、预警三组数据。
 */

const KEY = ['inventory', 'replenishment'] as const

export function useReplenishmentSuggestions(params?: ReplenishmentSearchParams) {
  return useQuery({
    queryKey: [...KEY, 'suggestions', params],
    queryFn: () => replenishmentService.list(params),
  })
}

export function useReplenishmentDetail(id?: string) {
  return useQuery({
    queryKey: [...KEY, 'suggestion', id],
    queryFn: () => replenishmentService.detail(id as string),
    enabled: Boolean(id),
  })
}

export function useReplenishmentPolicies(params?: {
  warehouseId?: string
  skuId?: string
  current?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [...KEY, 'policies', params],
    queryFn: () => replenishmentService.listPolicies(params),
  })
}

/** 某 SKU×仓 的最新需求预测；没有预测时返回 null 而不是报错。 */
export function useDemandForecast(skuId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: [...KEY, 'forecast', skuId, warehouseId],
    queryFn: () => replenishmentService.forecast(skuId as string, warehouseId),
    enabled: Boolean(skuId),
  })
}

/**
 * 触发补货计算。
 *
 * 幂等命中时后端返回既有单据（`existingSuggestionId` 非空），提示语要区分这两种情况，
 * 否则用户会以为"又生成了一张"。
 */
export function useGenerateReplenishment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (options?: {
      warehouseId?: string
      period?: string
      dryRun?: boolean
      totalBudget?: number
      lookbackDays?: number
    }) => replenishmentService.generate(options),
    onSuccess: (result) => {
      if (!result.dryRun) {
        qc.invalidateQueries({ queryKey: [...KEY] })
      }
      if (result.existingSuggestionId) {
        message.info(`本周期已有建议单，未重复生成（命中幂等键 ${result.period}）`)
        return
      }
      const suffix = result.dryRun ? '（预览，未落库）' : ''
      message.success(
        `计算完成${suffix}：扫描 ${result.scannedInventories}，触发行 ${result.triggeredItems}，` +
          `建议总量 ${result.totalSuggestedQty}`
      )
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}

export function useAdjustReplenishmentItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      suggestionId: string
      itemId: string
      adoptedQty: number
      reason?: string
    }) =>
      replenishmentService.adjustItem(
        input.suggestionId,
        input.itemId,
        input.adoptedQty,
        input.reason
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY] })
      message.success('已更新采纳数量')
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}

export function useAdoptReplenishment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => replenishmentService.adopt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY] })
      message.success('已采纳，可转采购计划')
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}

export function useRejectReplenishment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      replenishmentService.reject(input.id, input.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY] })
      message.success('已驳回')
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}

export function useCancelReplenishment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => replenishmentService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY] })
      message.success('已取消')
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}

/**
 * 转采购计划。
 *
 * 后端是异步的（同事务写 outbox，purchase 侧消费建 PurPlan），所以这里只能确认
 * "已受理"；`convertError` 非空时说明 SKU→material 映射缺失，要显式告诉用户可重试。
 */
export function useConvertReplenishment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => replenishmentService.convert(id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: [...KEY] })
      if (row.convertError) {
        message.warning(`转换失败：${row.convertError}（单据已保留，可重试）`)
        return
      }
      message.success('已发起转采购计划，稍后可在采购计划页查看')
    },
    onError: (error) => message.error(toApiError(error).message),
  })
}
