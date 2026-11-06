import { describe, expect, it } from "vitest";

import type { SystemConfigDTO } from "@/lib/api/contracts/system";
import { resolveConfigSource, validateConfigValue } from "./system-config";

const base: SystemConfigDTO = { configKey: "ui.theme", configValue: "dark" };

describe("resolveConfigSource", () => {
  it("honours the explicit scope field first", () => {
    expect(
      resolveConfigSource({ ...base, scope: "TENANT", tenantId: null })
    ).toBe("tenant");
    expect(
      resolveConfigSource({
        ...base,
        scope: "PLATFORM",
        tenantId: "t-1",
      })
    ).toBe("platform");
  });

  it("falls back to tenantId when scope is missing", () => {
    expect(resolveConfigSource({ ...base, tenantId: "t-1" })).toBe("tenant");
    expect(resolveConfigSource({ ...base, tenantId: null })).toBe("platform");
    expect(resolveConfigSource(base)).toBe("platform");
  });
});

describe("validateConfigValue", () => {
  it("accepts only lower-case booleans", () => {
    expect(validateConfigValue("BOOLEAN", "true")).toBeNull();
    expect(validateConfigValue("BOOLEAN", "false")).toBeNull();
    expect(validateConfigValue("BOOLEAN", "TRUE")).not.toBeNull();
    expect(validateConfigValue("BOOLEAN", "1")).not.toBeNull();
    expect(validateConfigValue("BOOLEAN", "")).not.toBeNull();
  });

  it("rejects empty and non-numeric numbers", () => {
    expect(validateConfigValue("NUMBER", "42")).toBeNull();
    expect(validateConfigValue("NUMBER", "1.5")).toBeNull();
    expect(validateConfigValue("NUMBER", "")).not.toBeNull();
    expect(validateConfigValue("NUMBER", "  ")).not.toBeNull();
    expect(validateConfigValue("NUMBER", "abc")).not.toBeNull();
  });

  it("requires parseable JSON", () => {
    expect(validateConfigValue("JSON", '{"a":1}')).toBeNull();
    expect(validateConfigValue("JSON", "{bad")).not.toBeNull();
    expect(validateConfigValue("JSON", "")).not.toBeNull();
  });

  it("rejects an empty string but keeps the original value otherwise", () => {
    expect(validateConfigValue("STRING", "")).not.toBeNull();
    expect(validateConfigValue("STRING", " x ")).toBeNull();
    expect(validateConfigValue(undefined, "any")).toBeNull();
  });
});
