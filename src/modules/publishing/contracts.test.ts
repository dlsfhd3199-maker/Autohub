import { describe, expect, it } from "vitest";
import { publishedContentSchema } from "./contracts";

describe("published content contract", () => {
  it("accepts PostgreSQL timestamps with an explicit UTC offset", () => {
    const timestamp = "2026-07-29T05:16:58.035199+00:00";
    const result = publishedContentSchema.safeParse({
      id: "42000000-0000-4000-8000-000000000001",
      slug: "virtual-lumi-guide",
      title: "Virtual Lumi Guide",
      primaryKeyword: "virtual keyword",
      status: "test_published",
      publishedAt: timestamp,
      updatedAt: timestamp,
      versionId: "43000000-0000-4000-8000-000000000001",
      versionNo: 1,
      document: {
        schemaVersion: 1,
        blocks: [{ id: "44000000-0000-4000-8000-000000000001", type: "paragraph", text: "가상 콘텐츠입니다." }],
        metadata: { primaryKeyword: "virtual keyword", keywords: [], description: "" },
      },
    });

    expect(result.success).toBe(true);
  });
});
