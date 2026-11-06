import { describe, expect, it } from "vitest";

import { isEndpointUnavailable } from "./availability";
import { ApiError } from "./envelope";

describe("isEndpointUnavailable", () => {
  it("treats 404/405/501 as not deployed", () => {
    expect(isEndpointUnavailable(new ApiError(404, "Not Found"))).toBe(true);
    expect(isEndpointUnavailable({ response: { status: 404 } })).toBe(true);
    expect(isEndpointUnavailable({ response: { status: 405 } })).toBe(true);
    expect(isEndpointUnavailable({ response: { status: 501 } })).toBe(true);
  });

  it("keeps permission and server failures as real errors", () => {
    expect(isEndpointUnavailable(new ApiError(403, "Forbidden"))).toBe(false);
    expect(isEndpointUnavailable({ response: { status: 500 } })).toBe(false);
  });

  it("does not hide network failures", () => {
    expect(isEndpointUnavailable(new Error("Network Error"))).toBe(false);
    expect(isEndpointUnavailable(new ApiError(0, "Network error"))).toBe(false);
  });
});
