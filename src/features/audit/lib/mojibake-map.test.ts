import { describe, expect, it } from "vitest";

import { MOJIBAKE_ENTRIES, mapAuditText } from "./mojibake-map";

describe("mapAuditText", () => {
  it("maps known mojibake tokens to readable text", () => {
    expect(mapAuditText("璁㈠崟")).toBe("订单");
    expect(mapAuditText("鍝佺墝绠＄悊")).toBe("品牌管理");
  });

  it("maps phrases before their component words", () => {
    expect(mapAuditText("瀵硅处璁板綍")).toBe("对账记录");
  });

  it("maps embedded tokens inside longer text", () => {
    expect(mapAuditText("新增品牌 鍝佺墝绠＄悊")).toBe("新增品牌 品牌管理");
  });

  it("keeps untouched text as-is", () => {
    expect(mapAuditText("ORDER_CREATE")).toBe("ORDER_CREATE");
    expect(mapAuditText("操作成功")).toBe("操作成功");
  });

  it("renders empty values as a dash", () => {
    expect(mapAuditText(null)).toBe("-");
    expect(mapAuditText(undefined)).toBe("-");
    expect(mapAuditText("")).toBe("-");
  });

  it("contains no duplicate garbled keys", () => {
    const keys = MOJIBAKE_ENTRIES.map((entry) => entry.garbled);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
