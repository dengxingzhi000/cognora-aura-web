import { describe, expect, it } from "vitest";

import { diffProfile } from "./profile-update";

const current = {
  realName: "张三",
  email: "zhangsan@example.com",
  phone: "13800000000",
  avatar: "https://cdn.example.com/a.png",
};

describe("diffProfile", () => {
  it("sends nothing when the form did not change", () => {
    expect(diffProfile(current, current)).toEqual({});
  });

  it("sends only the changed whitelisted fields", () => {
    expect(
      diffProfile(current, { ...current, realName: "李四" })
    ).toEqual({ realName: "李四" });
  });

  it("turns an emptied field into an explicit clear", () => {
    expect(diffProfile(current, { ...current, email: "" })).toEqual({
      email: "",
    });
  });

  it("ignores fields the caller omitted", () => {
    expect(diffProfile(current, { realName: "张三" })).toEqual({});
  });

  it("includes an optional timezone that userinfo started exposing", () => {
    expect(diffProfile(current, { ...current, timezone: "Asia/Shanghai" })).toEqual({
      timezone: "Asia/Shanghai",
    });
  });
});
