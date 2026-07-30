import { z } from "zod";

export const OPENAI_MODEL = "gpt-5.6-terra" as const;

export const generationLimitsSchema = z.object({
  dailyJobLimit: z.number().int().min(1).max(3),
  maxInputTokens: z.literal(40000),
  maxOutputTokens: z.literal(12000),
  maxPlanOutputTokens: z.literal(3000),
  maxDraftOutputTokens: z.literal(9000),
  maxCostUsd: z.literal(0.60),
  maxConcurrentJobs: z.literal(1),
}).strict();

const exactInteger = (name: string, expected: number) =>
  z.coerce.number().int().refine((value) => value === expected, `${name} must be ${expected}`);

const environmentSchema = z.object({
  OPENAI_MODEL: z.literal(OPENAI_MODEL).default(OPENAI_MODEL),
  OPENAI_DAILY_JOB_LIMIT: exactInteger("OPENAI_DAILY_JOB_LIMIT", 3).default(3),
  OPENAI_MAX_INPUT_TOKENS_PER_JOB: exactInteger("OPENAI_MAX_INPUT_TOKENS_PER_JOB", 40000).default(40000),
  OPENAI_MAX_OUTPUT_TOKENS_PER_JOB: exactInteger("OPENAI_MAX_OUTPUT_TOKENS_PER_JOB", 12000).default(12000),
  OPENAI_MAX_PLAN_OUTPUT_TOKENS: exactInteger("OPENAI_MAX_PLAN_OUTPUT_TOKENS", 3000).default(3000),
  OPENAI_MAX_DRAFT_OUTPUT_TOKENS: exactInteger("OPENAI_MAX_DRAFT_OUTPUT_TOKENS", 9000).default(9000),
  OPENAI_MAX_COST_PER_JOB_USD: z.coerce.number().refine((value) => value === 0.6, "OPENAI_MAX_COST_PER_JOB_USD must be 0.60").default(0.6),
  OPENAI_MAX_CONCURRENT_JOBS: exactInteger("OPENAI_MAX_CONCURRENT_JOBS", 1).default(1),
  OPENAI_NETWORK_ENABLED: z.enum(["true", "false"]).default("false"),
}).strict();

export const generationLimits = generationLimitsSchema.parse({
  dailyJobLimit: 3,
  maxInputTokens: 40000,
  maxOutputTokens: 12000,
  maxPlanOutputTokens: 3000,
  maxDraftOutputTokens: 9000,
  maxCostUsd: 0.60,
  maxConcurrentJobs: 1,
});

export function readOpenAiEnvironment() {
  const parsed = environmentSchema.parse({
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_DAILY_JOB_LIMIT: process.env.OPENAI_DAILY_JOB_LIMIT,
    OPENAI_MAX_INPUT_TOKENS_PER_JOB: process.env.OPENAI_MAX_INPUT_TOKENS_PER_JOB,
    OPENAI_MAX_OUTPUT_TOKENS_PER_JOB: process.env.OPENAI_MAX_OUTPUT_TOKENS_PER_JOB,
    OPENAI_MAX_PLAN_OUTPUT_TOKENS: process.env.OPENAI_MAX_PLAN_OUTPUT_TOKENS,
    OPENAI_MAX_DRAFT_OUTPUT_TOKENS: process.env.OPENAI_MAX_DRAFT_OUTPUT_TOKENS,
    OPENAI_MAX_COST_PER_JOB_USD: process.env.OPENAI_MAX_COST_PER_JOB_USD,
    OPENAI_MAX_CONCURRENT_JOBS: process.env.OPENAI_MAX_CONCURRENT_JOBS,
    OPENAI_NETWORK_ENABLED: process.env.OPENAI_NETWORK_ENABLED,
  });
  return { ...parsed, networkEnabled: parsed.OPENAI_NETWORK_ENABLED === "true", apiKey: process.env.OPENAI_API_KEY };
}
