import { describe, expect, it } from "vitest";
import { toPublishDocument } from "@/modules/publish-document/transform";
import { publishedContentSchema } from "./contracts";

describe("published content contract", () => {
  it("accepts PostgreSQL timestamps and a safe PublishDocument", () => {
    const timestamp = "2026-07-29T05:16:58.035199+00:00";
    const document = { schemaVersion: 1 as const, blocks: [{ id: "44000000-0000-4000-8000-000000000001", type: "paragraph" as const, text: "가상 콘텐츠입니다." }], metadata: { primaryKeyword: "virtual keyword", keywords: [], description: "가상 설명" } };
    const publishDocument = toPublishDocument({ contentId: "42000000-0000-4000-8000-000000000001", versionId: "43000000-0000-4000-8000-000000000001", versionNo: 1, isWorkingDraft: false, isExplicitVersion: true, title: "Virtual Lumi Guide", slug: "virtual-lumi-guide", document, publishedAt: timestamp, modifiedAt: timestamp, canonicalBaseUrl: "https://example.com", brandName: "Virtual Lumi" });
    const result = publishedContentSchema.safeParse({ id: "42000000-0000-4000-8000-000000000001", slug: "virtual-lumi-guide", title: "Virtual Lumi Guide", primaryKeyword: "virtual keyword", status: "test_published", publishedAt: timestamp, updatedAt: timestamp, versionId: "43000000-0000-4000-8000-000000000001", versionNo: 1, document, publishDocument });
    expect(result.success).toBe(true);
  });
});
