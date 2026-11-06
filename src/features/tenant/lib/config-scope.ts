import type { TenantConfigDTO } from "@/lib/api/contracts/tenant";

export interface TenantConfigScopes {
  /** tenant_id 为空：平台级默认配置，前端只读。 */
  platform: TenantConfigDTO[];
  /** 当前租户的覆盖配置，可编辑。 */
  tenant: TenantConfigDTO[];
  /** 其他租户的配置：后端分页接口无平台级筛选参数时会一并返回，前端必须隐藏。 */
  others: TenantConfigDTO[];
}

/**
 * `/tenant-config/page` 不带 tenantId 时会返回全部租户配置（tenant_config
 * 被租户 SQL 隔离排除）。前端按 tenant_id 拆分：平台级（null）只读、
 * 当前租户可编辑、其他租户不展示。
 */
export const splitTenantConfigs = (
  rows: TenantConfigDTO[] | null | undefined,
  tenantId: string,
): TenantConfigScopes => {
  const scopes: TenantConfigScopes = { platform: [], tenant: [], others: [] };
  for (const row of rows ?? []) {
    if (!row.tenantId) {
      scopes.platform.push(row);
    } else if (row.tenantId === tenantId) {
      scopes.tenant.push(row);
    } else {
      scopes.others.push(row);
    }
  }
  return scopes;
};
