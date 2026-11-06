import type {
  SystemConfigDTO,
  SystemConfigValueType,
} from "@/lib/api/contracts/system";

export type SystemConfigSource = "platform" | "tenant";

/**
 * A row is a tenant override when the backend says so (`scope`), or — for
 * responses that predate the field — when it carries a tenant id. Everything
 * else is the platform-wide default.
 */
export function resolveConfigSource(config: SystemConfigDTO): SystemConfigSource {
  if (config.scope === "TENANT") return "tenant";
  if (config.scope === "PLATFORM") return "platform";
  return config.tenantId ? "tenant" : "platform";
}

/**
 * Returns an error message, or null when the raw editor value is valid for the
 * declared type. Platform values are read-only, so this only guards the
 * tenant-override editor.
 */
export function validateConfigValue(
  valueType: SystemConfigValueType | undefined,
  raw: string
): string | null {
  switch (valueType ?? "STRING") {
    case "BOOLEAN":
      return raw === "true" || raw === "false"
        ? null
        : "布尔值只能是 true 或 false";
    case "NUMBER":
      return raw.trim() !== "" && Number.isFinite(Number(raw))
        ? null
        : "请输入有效数字";
    case "JSON":
      try {
        JSON.parse(raw);
        return null;
      } catch {
        return "请输入合法的 JSON";
      }
    case "STRING":
    default:
      return raw.trim() ? null : "配置值不能为空";
  }
}
