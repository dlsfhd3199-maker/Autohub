import { z } from "zod";
import { contentDocumentSchema, type ContentDocument } from "@/modules/content-studio/document";

export const generationPlanSchema = z.object({
  title: z.string().trim().min(1).max(160), searchIntent: z.string().trim().min(1).max(500), coreAnswer: z.string().trim().min(1).max(2000),
  sections: z.array(z.object({ heading: z.string().trim().min(1).max(200), purpose: z.string().trim().min(1).max(1000), evidenceSourceIds: z.array(z.string().uuid()).max(20), suggestedBlocks: z.array(z.enum(["section","subheading","paragraph","table","checklist","faq","cta","sources"])).max(10) }).strict()).min(1).max(12),
  reviewNotes: z.array(z.string().trim().min(1).max(500)).max(20),
}).strict();
export type GenerationPlan = z.infer<typeof generationPlanSchema>;
export type GenerationContext = { topic: string; primaryKeyword: string; secondaryKeywords: string[]; knowledge: Record<string, unknown> | null; evidence: Array<{ id: string; title: string; officialUrl: string; evidenceText: string }> };
export type GeneratedDraft = { document: ContentDocument; reviewItems: Array<{ blockId: string; reason: string; severity: "review"; evidenceSourceIds: string[] }> };
export interface GenerationProvider { generatePlan(context: GenerationContext): Promise<{ plan: GenerationPlan; inputTokens: number; outputTokens: number }>; generateDraft(context: GenerationContext, plan: GenerationPlan): Promise<{ draft: GeneratedDraft; inputTokens: number; outputTokens: number }>; }
export const generatedDraftSchema = z.object({ document: contentDocumentSchema, reviewItems: z.array(z.object({ blockId: z.string().uuid(), reason: z.string().min(1).max(500), severity: z.literal("review"), evidenceSourceIds: z.array(z.string().uuid()).max(20) }).strict()).max(50) }).strict();
