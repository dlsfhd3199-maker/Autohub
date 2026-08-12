import { describe, expect, it } from "vitest";
import { hasOnlySnapshotSources, recommendContentIdeas } from "./approved-context";

describe("approved generation context", () => {
  it("creates deterministic ideas from approved inputs", () => {
    const evidence = [{ id:"00000000-0000-4000-8000-000000000001", title:"공식 관리 기준", officialUrl:"https://example.com/source", evidenceText:"근거", sourceUrl:"https://example.com/source", contentHash:"a".repeat(64), approvedByRole:"agency_admin", approvedAt:"2026-01-01" }];
    expect(recommendContentIdeas(evidence, [{ name:"Virtual Orbit" }])).toEqual(recommendContentIdeas(evidence, [{ name:"Virtual Orbit" }]));
    expect(recommendContentIdeas(evidence, [{ name:"Virtual Orbit" }])[0].topic).toContain("Virtual Orbit");
  });
  it("rejects provider-supplied source IDs outside the server snapshot", () => {
    const snapshot = [{ id: "00000000-0000-4000-8000-000000000001" }];
    expect(hasOnlySnapshotSources([snapshot[0].id], snapshot)).toBe(true);
    expect(hasOnlySnapshotSources(["00000000-0000-4000-8000-000000000099"], snapshot)).toBe(false);
  });
});
