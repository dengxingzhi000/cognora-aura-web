"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import { toApiError } from "@/lib/api/envelope";
import { systemService } from "@/lib/api/services/system";
import { tenantApiService } from "@/lib/api/services/tenant";
import type { SystemConfigUpsertRequest } from "@/lib/api/contracts/system";
import type { TenantConfigDTO, TenantDTO } from "@/lib/api/contracts/tenant";
import { useTenantStore } from "@/stores/tenant-store";

export const SETTINGS_QUERY_KEYS = {
  tenant: (tenantId: string) => ["settings", "tenant", tenantId] as const,
  configs: (tenantId: string) => ["settings", "tenant-configs", tenantId] as const,
  systemConfigs: ["settings", "system-configs"] as const,
};

export function useCurrentTenant(options?: { enabled?: boolean }) {
  const tenantId = useTenantStore((state) => state.currentTenant?.id);

  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.tenant(tenantId ?? ""),
    queryFn: () => tenantApiService.getById(tenantId as string),
    enabled: Boolean(tenantId) && (options?.enabled ?? true),
  });
}

export function useUpdateCurrentTenant() {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.currentTenant?.id);

  return useMutation({
    mutationFn: (values: Partial<TenantDTO>) =>
      tenantApiService.update({ ...values, id: tenantId as string }),
    onSuccess: () => {
      message.success("租户设置已保存");
      void queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.tenant(tenantId ?? ""),
      });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

export function useTenantConfigs(tenantId?: string, enabled = true) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.configs(tenantId ?? ""),
    queryFn: () =>
      tenantApiService.pageConfigs({ page: 1, size: 50, tenantId }),
    enabled: Boolean(tenantId) && enabled,
  });
}

export interface SaveTenantConfigInput {
  tenantId: string;
  values: Partial<TenantConfigDTO>;
  existing?: TenantConfigDTO;
}

export function useSaveTenantConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, values, existing }: SaveTenantConfigInput) =>
      existing?.id
        ? tenantApiService.updateConfig({ ...values, id: existing.id })
        : tenantApiService.createConfig({ ...values, tenantId }),
    onSuccess: (_, variables) => {
      message.success("租户配置已保存");
      void queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.configs(variables.tenantId),
      });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

/**
 * Platform-wide parameters with tenant overrides. Not deployed yet — the page
 * turns a 404 into「暂不可用」instead of an error state.
 */
export function useSystemConfigs(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.systemConfigs,
    queryFn: () => systemService.config.list(),
    retry: false,
    enabled: options?.enabled ?? true,
  });
}

export function useSaveSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SystemConfigUpsertRequest) =>
      systemService.config.upsert(values),
    onSuccess: () => {
      message.success("配置已保存");
      void queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEYS.systemConfigs,
      });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}
