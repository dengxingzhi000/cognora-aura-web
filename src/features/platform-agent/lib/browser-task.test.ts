import { describe, expect, it } from "vitest";

import {
  browserApprovalId,
  browserTaskId,
  normalizeBrowserSteps,
} from "./browser-task";

describe("browser task presentation helpers", () => {
  it("accepts the BFF id aliases", () => {
    expect(browserTaskId({ taskId: "camel" })).toBe("camel");
    expect(browserTaskId({ task_id: "snake" })).toBe("snake");
    expect(browserTaskId({ id: "plain" })).toBe("plain");
    expect(browserApprovalId({ approval_id: "approval-1" })).toBe("approval-1");
  });

  it("normalizes array and wrapped step responses", () => {
    const step = { stepId: "step-1", name: "Open SRM" };
    expect(normalizeBrowserSteps([step])).toEqual([step]);
    expect(normalizeBrowserSteps({ records: [step] })).toEqual([step]);
    expect(normalizeBrowserSteps({ steps: [step] })).toEqual([step]);
    expect(normalizeBrowserSteps(undefined)).toEqual([]);
  });
});
