import { describe, expect, it } from "vitest";
import { toCafe24BoardBlogPayload } from "./cafe24-board-blog-profile";
import type { PublishDocument } from "@/modules/publish-document/schema";

const document = { title: "Virtual 안내", slug: "virtual-guide", description: "가상 설명", bodyHtml: "<section><h2>안전한 본문</h2><p>가상 정보</p></section>", faq: [], sources: [], cta: null, relatedProducts: [], publishedAt: "2026-08-07T00:00:00.000Z", modifiedAt: "2026-08-07T01:00:00.000Z", canonical: "https://example.com/blog/virtual-guide", articleJsonLd: { "@type": "Article" }, breadcrumbJsonLd: { "@type": "BreadcrumbList" }, faqJsonLd: null, contentId: "42000000-0000-4000-8000-000000000001", versionId: "52000000-0000-4000-8000-000000000001", contentHash: "a".repeat(64) } satisfies PublishDocument;

describe("Cafe24 board blog HTML profile", () => {
  it("separates safe board HTML from template metadata and JSON-LD", () => { const payload = toCafe24BoardBlogPayload(document); expect(payload.boardBodyHtml).toContain("안전한 본문"); expect(payload.boardBodyHtml).not.toContain("application/ld+json"); expect(payload.templateMetadata.articleJsonLd).toEqual({ "@type": "Article" }); expect(payload.templateMetadata.canonical).toBe(document.canonical); });
  it("rejects script and event-handler markup", () => { expect(() => toCafe24BoardBlogPayload({ ...document, bodyHtml: '<p onclick="alert(1)">위험</p>' })).toThrow("UNSAFE_CAFE24_BOARD_HTML"); expect(() => toCafe24BoardBlogPayload({ ...document, bodyHtml: "<script>alert(1)</script>" })).toThrow("UNSAFE_CAFE24_BOARD_HTML"); });
});
