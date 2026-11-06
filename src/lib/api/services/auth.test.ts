import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  default: { get: h.get, post: h.post },
}));

import { authService } from "./auth";

describe("auth session service", () => {
  beforeEach(() => {
    h.get.mockReset().mockResolvedValue({ code: 200, data: [] });
    h.post
      .mockReset()
      .mockResolvedValue({ code: 200, data: { revokedCount: 2 } });
  });

  it("reads the self-service session list from the auth gateway prefix", () => {
    authService.sessions.list();

    expect(h.get).toHaveBeenCalledWith("/auth/api/auth/sessions");
  });

  it("revokes other sessions without sending a session id", () => {
    authService.sessions.logoutOthers();

    expect(h.post).toHaveBeenCalledWith(
      "/auth/api/auth/sessions/logout-others"
    );
    expect(h.post.mock.calls[0]).toHaveLength(1);
  });

  it("returns the revoked count from the envelope", async () => {
    await expect(authService.sessions.logoutOthers()).resolves.toEqual({
      revokedCount: 2,
    });
  });
});
