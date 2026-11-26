import { afterEach, describe, expect, it, vi } from "vitest";

describe("platform Agent rewrite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("preserves the BFF /api/v1/agent path without duplicating it", async () => {
    vi.stubEnv("API_PLATFORM_AGENT_TARGET", "http://bff:8217");
    const { default: config } = await import("../../../../next.config");
    const rewrites = await config.rewrites?.();
    if (!Array.isArray(rewrites)) throw new Error("Expected rewrite array");

    expect(rewrites).toContainEqual({
      source: "/platform-agent/api/:path*",
      destination: "http://bff:8217/api/:path*",
    });
  });
});
