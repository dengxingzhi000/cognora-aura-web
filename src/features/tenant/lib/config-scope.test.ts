import { describe, expect, it } from "vitest";

import type { TenantConfigDTO } from "@/lib/api/contracts/tenant";

import { splitTenantConfigs } from "./config-scope";

const row = (id: string, tenantId?: string | null): TenantConfigDTO =>
  ({ id, tenantId, configKey: id }) as TenantConfigDTO;

describe("splitTenantConfigs", () => {
  it("separates platform, current tenant and other tenants", () => {
    const scopes = splitTenantConfigs(
      [row("platform", null), row("mine", "t-1"), row("other", "t-2")],
      "t-1",
    );

    expect(scopes.platform.map((item) => item.id)).toEqual(["platform"]);
    expect(scopes.tenant.map((item) => item.id)).toEqual(["mine"]);
    expect(scopes.others.map((item) => item.id)).toEqual(["other"]);
  });

  it("treats missing tenantId as platform level", () => {
    const scopes = splitTenantConfigs([row("legacy")], "t-1");
    expect(scopes.platform.map((item) => item.id)).toEqual(["legacy"]);
  });

  it("handles empty payloads", () => {
    expect(splitTenantConfigs(null, "t-1")).toEqual({
      platform: [],
      tenant: [],
      others: [],
    });
  });
});
