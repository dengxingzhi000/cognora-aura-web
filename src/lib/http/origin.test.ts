import { describe, expect, it } from "vitest";

import { stripSameOriginHeader } from "./origin";

describe("stripSameOriginHeader", () => {
  it("drops a same-origin Origin header so the proxy passes Spring CORS", () => {
    // The standalone build is served from http://127.0.0.1:3000 and the
    // rewrite to the gateway keeps the browser's Origin header.
    const headers = new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    });

    stripSameOriginHeader(headers);

    expect(headers.has("origin")).toBe(false);
  });

  it("keeps a cross-origin Origin header so the backend CORS policy applies", () => {
    const headers = new Headers({
      host: "127.0.0.1:3000",
      origin: "https://app.example.com",
    });

    stripSameOriginHeader(headers);

    expect(headers.get("origin")).toBe("https://app.example.com");
  });

  it("leaves headers untouched when Origin or Host is missing", () => {
    const withOriginOnly = new Headers({ origin: "http://127.0.0.1:3000" });

    stripSameOriginHeader(withOriginOnly);

    expect(withOriginOnly.get("origin")).toBe("http://127.0.0.1:3000");
  });
});
