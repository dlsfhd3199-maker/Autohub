import { generationLimits } from "./config";

// Official gpt-5.6-terra standard pricing as of 2026-07-29.
export const TERRA_INPUT_USD_PER_MILLION = 2.5;
export const TERRA_OUTPUT_USD_PER_MILLION = 15;

export type GenerationUsage = { inputTokens: number; outputTokens: number };

export function estimateCostUsd(usage: GenerationUsage) {
  return (usage.inputTokens * TERRA_INPUT_USD_PER_MILLION + usage.outputTokens * TERRA_OUTPUT_USD_PER_MILLION) / 1_000_000;
}

export const MAX_JOB_ESTIMATED_COST_USD = estimateCostUsd({
  inputTokens: generationLimits.maxInputTokens,
  outputTokens: generationLimits.maxOutputTokens,
});

export function estimatePromptTokens(value: unknown) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)).byteLength;
  return Math.ceil(bytes / 3) + 1_500;
}

export function assertCallWithinBudget(args: {
  consumed: GenerationUsage;
  estimatedInputTokens: number;
  requestedOutputTokens: number;
}) {
  const projected = {
    inputTokens: args.consumed.inputTokens + args.estimatedInputTokens,
    outputTokens: args.consumed.outputTokens + args.requestedOutputTokens,
  };
  if (projected.inputTokens > generationLimits.maxInputTokens || projected.outputTokens > generationLimits.maxOutputTokens) {
    throw new GenerationBudgetError("TOKEN_LIMIT_EXCEEDED");
  }
  if (estimateCostUsd(projected) > generationLimits.maxCostUsd) {
    throw new GenerationBudgetError("COST_LIMIT_EXCEEDED");
  }
  return projected;
}

export class GenerationBudgetError extends Error {
  constructor(public readonly code: "TOKEN_LIMIT_EXCEEDED" | "COST_LIMIT_EXCEEDED") {
    super(code);
    this.name = "GenerationBudgetError";
  }
}
