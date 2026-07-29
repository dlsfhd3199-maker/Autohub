import { z } from "zod";
export const generationLimitsSchema = z.object({ dailyJobLimit: z.number().int().min(1).max(3), maxInputTokens: z.literal(40000), maxOutputTokens: z.literal(12000), maxPlanOutputTokens: z.literal(3000), maxDraftOutputTokens: z.literal(9000), maxCostUsd: z.literal(0.60), maxConcurrentJobs: z.literal(1) });
export const generationLimits = generationLimitsSchema.parse({ dailyJobLimit: 3, maxInputTokens: 40000, maxOutputTokens: 12000, maxPlanOutputTokens: 3000, maxDraftOutputTokens: 9000, maxCostUsd: 0.60, maxConcurrentJobs: 1 });
