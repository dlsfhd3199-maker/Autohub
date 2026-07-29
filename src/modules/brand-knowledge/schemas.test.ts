import { describe, expect, it } from "vitest";
import { evidenceInputSchema, knowledgeInputSchema } from "./schemas";

const base = { brandId: "30000000-0000-4000-8000-000000000001", introduction: "가상 브랜드를 설명하는 충분히 긴 소개입니다.", targetAudience: "가상 독자", tone: "차분하고 정확한 말투", prohibitedExpressions: "최고\n무조건", ctaLabel: "자세히 보기", ctaUrl: "https://example.com/virtual", productInfo: JSON.stringify([{ name: "Virtual Product Alpha", summary: "가상 상품", features: ["가상 특징"], limitations: ["검수 필요"], officialUrl: "https://example.com/products/alpha" }]) };
describe("brand knowledge schemas", () => {
  it("accepts virtual example.com data", () => expect(knowledgeInputSchema.parse(base).productInfo).toHaveLength(1));
  it("rejects non-example product URLs", () => expect(() => knowledgeInputSchema.parse({ ...base, ctaUrl: "https://real.invalid/path" })).toThrow());
  it("requires meaningful evidence text", () => expect(() => evidenceInputSchema.parse({ brandId: base.brandId, title: "가상 공식 자료", officialUrl: "https://example.com/source", evidenceText: "짧음" })).toThrow());
});
