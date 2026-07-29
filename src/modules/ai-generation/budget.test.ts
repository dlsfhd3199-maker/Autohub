import { describe, expect, it } from "vitest";
import { assertCallWithinBudget, estimateCostUsd, estimatePromptTokens, GenerationBudgetError } from "./budget";

describe("generation budget", () => {
  it("calculates the approved job maximum below the cost cap", () => {
    expect(estimateCostUsd({ inputTokens: 40_000, outputTokens: 12_000 })).toBeCloseTo(0.28, 6);
  });

  it("blocks a retry that cannot fit within the remaining token budget", () => {
    expect(() => assertCallWithinBudget({ consumed: { inputTokens: 35_000, outputTokens: 2_000 }, estimatedInputTokens: 6_000, requestedOutputTokens: 3_000 })).toThrow(GenerationBudgetError);
  });

  it("uses a conservative non-zero prompt estimate", () => {
    expect(estimatePromptTokens("가상 근거 텍스트")).toBeGreaterThan(1_500);
  });
});
