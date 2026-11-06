import { describe, expect, it } from "vitest";

import { formatMoney, toAmountInput } from "./money";

describe("formatMoney", () => {
  it("formats amounts with thousands separators and two decimals", () => {
    expect(formatMoney(1234.5)).toBe("¥1,234.50");
    expect(formatMoney(0)).toBe("¥0.00");
    expect(formatMoney(12345678.9)).toBe("¥12,345,678.90");
  });

  it("keeps negative amounts readable", () => {
    expect(formatMoney(-1234.5)).toBe("-¥1,234.50");
  });

  it("renders missing values as a dash", () => {
    expect(formatMoney(null)).toBe("-");
    expect(formatMoney(undefined)).toBe("-");
    expect(formatMoney(Number.NaN)).toBe("-");
  });

  it("only rounds to two decimals for display", () => {
    expect(formatMoney(10.006)).toBe("¥10.01");
    expect(formatMoney(10.004)).toBe("¥10.00");
  });
});

describe("toAmountInput", () => {
  it("keeps the raw backend number for edit forms", () => {
    expect(toAmountInput(1234.5)).toBe("1234.5");
    expect(toAmountInput(null)).toBe("");
  });
});
