import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  default: { get: h.get, post: h.post, put: h.put, delete: h.delete },
}));

import { systemService } from "./system";

describe("self-service profile and system config", () => {
  beforeEach(() => {
    h.get.mockReset().mockResolvedValue({ code: 200, data: [] });
    h.post.mockReset().mockResolvedValue({ code: 200 });
    h.put.mockReset().mockResolvedValue({ code: 200 });
    h.delete.mockReset().mockResolvedValue({ code: 200 });
  });

  it("updates the current user through /users/me, not /users/{id}", () => {
    systemService.users.updateMe({
      realName: "张三",
      email: "zhangsan@example.com",
    });

    expect(h.put).toHaveBeenCalledWith("/system/api/system/users/me", {
      realName: "张三",
      email: "zhangsan@example.com",
    });
    expect(h.put.mock.calls[0][0]).not.toMatch(/users\/[0-9a-f-]+/);
  });

  it("reads the config list", () => {
    systemService.config.list();

    expect(h.get.mock.calls[0][0]).toBe("/system/api/system/config");
  });

  it("upserts a tenant override through PUT", () => {
    systemService.config.upsert({
      configKey: "ui.theme",
      configValue: "dark",
      valueType: "STRING",
      scope: "TENANT",
    });

    expect(h.put).toHaveBeenCalledWith("/system/api/system/config", {
      configKey: "ui.theme",
      configValue: "dark",
      valueType: "STRING",
      scope: "TENANT",
    });
  });
});
