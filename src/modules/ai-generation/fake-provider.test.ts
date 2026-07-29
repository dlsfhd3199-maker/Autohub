import { describe, expect, it } from "vitest";
import { contentDocumentSchema } from "@/modules/content-studio/document";
import { generationPlanSchema, generatedDraftSchema } from "./contracts";
import { FakeGenerationProvider } from "./fake-provider";

const context = { topic: "가상 탐색 안내", primaryKeyword: "가상 키워드", secondaryKeywords: ["가상 보조어"], knowledge: null, evidence: [{ id: "70000000-0000-4000-8000-000000000001", title: "가상 공식 자료", officialUrl: "https://example.com/source", evidenceText: "가상 브랜드가 직접 확인한 공식 근거 텍스트입니다." }] };
describe("fake generation provider", () => {
  it("creates a valid plan and ContentDocument", async () => { const provider = new FakeGenerationProvider(); const { plan } = await provider.generatePlan(context); expect(generationPlanSchema.parse(plan).sections.length).toBeGreaterThan(0); const { draft } = await provider.generateDraft(context, plan); expect(generatedDraftSchema.parse(draft)).toBeTruthy(); expect(contentDocumentSchema.parse(draft.document).blocks.some((block) => block.type === "sources")).toBe(true); });
  it("marks missing evidence for review without failing", async () => { const provider = new FakeGenerationProvider(); const empty = { ...context, evidence: [] }; const { plan } = await provider.generatePlan(empty); const { draft } = await provider.generateDraft(empty, plan); expect(draft.reviewItems).toHaveLength(1); });
});
