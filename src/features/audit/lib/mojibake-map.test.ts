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

  it("maps the five role/permission audit operations without garbled residue", () => {
    // 「修改」的乱码有两种形态：保留 GBK 未分配槽位（U+E1BD）与丢失该码点。
    const operations: ReadonlyArray<readonly [string, string]> = [
      ["淇\uE1BD敼瑙掕壊", "修改角色"],
      ["淇敼瑙掕壊", "修改角色"],
      ["鍒犻櫎瑙掕壊", "删除角色"],
      ["瑙掕壊鎺堟潈", "角色授权"],
      ["淇\uE1BD敼鏉冮檺", "修改权限"],
      ["淇敼鏉冮檺", "修改权限"],
      ["鍒犻櫎鏉冮檺", "删除权限"],
    ];

    for (const [garbled, display] of operations) {
      const mapped = mapAuditText(garbled);
      expect(mapped).toBe(display);
      // 私用区码点与替换字符都是「只映射了半截」的残留特征。
      expect(mapped).not.toMatch(/[\uE000-\uF8FF\uFFFD]/);
    }
  });

  it("maps the other high-frequency verbs that used to be half-mapped", () => {
    const tokens: ReadonlyArray<readonly [string, string]> = [
      ["鏂板\uE583", "新增"],
      ["鍒涘缓", "创建"],
      ["鏇存柊", "更新"],
      ["纭\uE1BF\uE17B", "确认"],
      ["椹冲洖", "驳回"],
      ["鎾ら攢", "撤销"],
      ["鍙栨秷", "取消"],
      ["鍏抽棴", "关闭"],
      ["鎺堟潈", "授权"],
      ["鎺堜簣", "授予"],
      ["閿佸畾", "锁定"],
      ["閲嶇疆", "重置"],
      ["浣滃簾", "作废"],
      ["鏍搁攢", "核销"],
      ["涓婃姤", "上报"],
      ["鐧昏\uE187", "登记"],
      ["鐧诲嚭", "登出"],
      ["鏌ヨ\uE1D7", "查询"],
      ["瀵嗙爜", "密码"],
    ];

    for (const [garbled, display] of tokens) {
      expect(mapAuditText(garbled)).toBe(display);
    }
  });
});
