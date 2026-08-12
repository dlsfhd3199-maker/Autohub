import { describe, expect, it } from "vitest";
import { toPublishDocument } from "./transform";
import { PublishDocumentError } from "./schema";

const input = { contentId: "42000000-0000-4000-8000-000000000001", versionId: "52000000-0000-4000-8000-000000000001", versionNo: 1, isWorkingDraft: false, isExplicitVersion: true, title: "Virtual 콘텐츠 안내", slug: "virtual-guide", publishedAt: "2026-07-30T00:00:00.000Z", modifiedAt: "2026-07-30T01:00:00.000Z", canonicalBaseUrl: "https://example.com", brandName: "Virtual Lumi", document: { schemaVersion: 1 as const, metadata: { primaryKeyword: "가상", keywords: [], description: "가상 설명" }, blocks: [{ id: "62000000-0000-4000-8000-000000000001", type: "paragraph" as const, text: "<script>alert(1)</script>" }, { id: "62000000-0000-4000-8000-000000000002", type: "faq" as const, items: [{ question: "가상 질문", answer: "가상 답변" }] }, { id: "62000000-0000-4000-8000-000000000003", type: "cta" as const, text: "가상 CTA", label: "확인", url: "https://example.com/cta" }] } };

describe("PublishDocument", () => {
  it("renders allowlisted HTML, conditional JSON-LD, and a stable hash", () => { const first = toPublishDocument(input); const second = toPublishDocument(input); expect(first.contentHash).toBe(second.contentHash); expect(first.bodyHtml).toContain("&lt;script&gt;"); expect(first.bodyHtml).not.toMatch(/<script|onclick=|javascript:/i); expect(first.faqJsonLd?.["@type"]).toBe("FAQPage"); });
  it("omits FAQPage without displayed FAQ", () => { const result = toPublishDocument({ ...input, document: { ...input.document, blocks: input.document.blocks.filter((block) => block.type !== "faq") } }); expect(result.faqJsonLd).toBeNull(); });
  it("blocks working drafts and non-explicit drafts", () => { expect(() => toPublishDocument({ ...input, isWorkingDraft: true })).toThrow(PublishDocumentError); expect(() => toPublishDocument({ ...input, isExplicitVersion: false })).toThrow(PublishDocumentError); });
  it("rejects unsafe URL protocols", () => { const unsafe = { ...input, document: { ...input.document, blocks: [{ ...input.document.blocks[2], url: "javascript:alert(1)" }] } }; expect(() => toPublishDocument(unsafe as typeof input)).toThrow(); });
});
