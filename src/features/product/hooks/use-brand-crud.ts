'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { toApiError } from '@/lib/api/envelope'
import { productApiService } from '@/lib/api/services/product'
import type { ProdBrandPayload, ProdBrandQuery } from '@/lib/api/contracts/product'

const BRAND_KEY = ['product', 'brand'] as const

const fail = (error: unknown) => message.error(toApiError(error).message)

export function useBrandList(query: ProdBrandQuery) {
  return useQuery({
    queryKey: [...BRAND_KEY, 'list', query],
    queryFn: () => productApiService.brand.list(query),
  })
}

export function useBrandDetail(id: string) {
  return useQuery({
    queryKey: [...BRAND_KEY, 'detail', id],
    queryFn: () => productApiService.brand.get(id),
    enabled: !!id,
  })
}

export function useBrandSearch(name: string) {
  return useQuery({
    queryKey: [...BRAND_KEY, 'search', name],
    queryFn: () => productApiService.brand.search(name),
    enabled: !!name.trim(),
  })
}

export function useFeaturedBrands() {
  return useQuery({
    queryKey: [...BRAND_KEY, 'featured'],
    queryFn: () => productApiService.brand.featured(),
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProdBrandPayload) => productApiService.brand.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEY })
      message.success('创建成功')
    },
    onError: fail,
  })
}

export function useUpdateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProdBrandPayload }) =>
      productApiService.brand.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEY })
      message.success('更新成功')
    },
    onError: fail,
  })
}

export function useDeleteBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productApiService.brand.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEY })
      message.success('删除成功')
    },
    onError: fail,
  })
}
