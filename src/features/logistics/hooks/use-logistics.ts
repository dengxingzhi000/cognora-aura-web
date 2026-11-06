'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

import { toApiError } from '@/lib/api/envelope'
import { logisticsApiService } from '@/lib/api/services/logistics'
import type {
  TmsCarrierDTO,
  TmsCarrierQuery,
  TmsTrackingDTO,
  TmsTrackingQuery,
} from '@/lib/api/contracts/logistics'

import { logisticsService, type WaybillListParams } from '../services/logistics.service'
import type { WaybillStatus } from '../types'

export function useWaybillList(params?: WaybillListParams) {
  return useQuery({
    queryKey: ['logistics', 'waybills', params],
    queryFn: () => logisticsService.listWaybills(params),
  })
}

export function useWaybill(id: string) {
  return useQuery({
    queryKey: ['logistics', 'waybill', id],
    queryFn: () => logisticsService.getWaybill(id),
    enabled: !!id,
  })
}

export function useTrackingEvents(waybillId: string) {
  return useQuery({
    queryKey: ['logistics', 'tracking', waybillId],
    queryFn: () => logisticsService.getTracking(waybillId),
    enabled: !!waybillId,
  })
}

const fail = (error: unknown) => message.error(toApiError(error).message)

export function useUpdateWaybillStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      operator,
    }: {
      id: string
      status: WaybillStatus
      operator?: string
    }) => logisticsService.updateStatus(id, status, operator),
    onSuccess: (_data, variables) => {
      message.success('运单状态已更新')
      qc.invalidateQueries({ queryKey: ['logistics', 'waybill', variables.id] })
      qc.invalidateQueries({ queryKey: ['logistics', 'waybills'] })
      qc.invalidateQueries({ queryKey: ['logistics', 'tracking', variables.id] })
    },
    onError: fail,
  })
}

export function useCancelWaybill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reason,
      operator,
    }: {
      id: string
      reason?: string
      operator?: string
    }) => logisticsService.cancel(id, reason, operator),
    onSuccess: (_data, variables) => {
      message.success('运单已取消')
      qc.invalidateQueries({ queryKey: ['logistics', 'waybill', variables.id] })
      qc.invalidateQueries({ queryKey: ['logistics', 'waybills'] })
      qc.invalidateQueries({ queryKey: ['logistics', 'tracking', variables.id] })
    },
    onError: fail,
  })
}

export function useFreightQuote() {
  return useMutation({
    mutationFn: logisticsService.quoteFreight,
    onError: fail,
  })
}

export function useFreightTemplates(carrierId?: string) {
  return useQuery({
    queryKey: ['logistics', 'freight-templates', carrierId],
    queryFn: () => logisticsService.listFreightTemplates(carrierId as string),
    enabled: !!carrierId,
    retry: false,
  })
}

export function useReconciliations(params: {
  page: number
  size: number
  batchNo?: string
  diffType?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['logistics', 'reconciliations', params],
    queryFn: () => logisticsService.listReconciliations(params),
  })
}

export function useReconcileFreight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logisticsService.reconcile,
    onSuccess: () => {
      message.success('对账差异已生成')
      qc.invalidateQueries({ queryKey: ['logistics', 'reconciliations'] })
    },
    onError: fail,
  })
}

export function useTrackingPage(query: TmsTrackingQuery) {
  return useQuery({
    queryKey: ['logistics', 'tracking', 'page', query],
    queryFn: () => logisticsApiService.pageTracking(query),
  })
}

export function useCreateTracking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entity: Partial<TmsTrackingDTO>) =>
      logisticsApiService.createTracking(entity),
    onSuccess: () => {
      message.success('物流轨迹已上报')
      qc.invalidateQueries({ queryKey: ['logistics', 'tracking'] })
    },
    onError: fail,
  })
}

export function useCarrierPage(query: TmsCarrierQuery) {
  return useQuery({
    queryKey: ['logistics', 'carrier', query],
    queryFn: () => logisticsApiService.pageCarriers(query),
  })
}

export function useSaveCarrier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entity: Partial<TmsCarrierDTO>) =>
      entity.id
        ? logisticsApiService.updateCarrier(entity.id, entity)
        : logisticsApiService.createCarrier(entity),
    onSuccess: () => {
      message.success('承运商已保存')
      qc.invalidateQueries({ queryKey: ['logistics', 'carrier'] })
    },
    onError: fail,
  })
}

export function useDeleteCarrier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => logisticsApiService.deleteCarrier(id),
    onSuccess: () => {
      message.success('承运商已删除')
      qc.invalidateQueries({ queryKey: ['logistics', 'carrier'] })
    },
    onError: fail,
  })
}

export function useToggleCarrier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      logisticsApiService.setCarrierEnabled(id, enabled),
    onSuccess: (_data, variables) => {
      message.success(variables.enabled ? '承运商已启用' : '承运商已停用')
      qc.invalidateQueries({ queryKey: ['logistics', 'carrier'] })
    },
    onError: fail,
  })
}
