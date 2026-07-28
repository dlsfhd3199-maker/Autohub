import { describe, expect, it } from "vitest";
import { compareVersions } from "./diff";
import { initialDocument, newBlock } from "./document";
import { canAutosaveVersion, nextRevision, nextVersionNumber } from "./versioning";

describe("content versioning", () => {
  it("increments revisions and version numbers", () => { expect(nextRevision(4)).toBe(5); expect(nextVersionNumber([1, 4, 2])).toBe(5); });
  it("allows autosave only for non-approved working drafts", () => { expect(canAutosaveVersion({ isWorkingDraft: true, status: "draft" })).toBe(true); expect(canAutosaveVersion({ isWorkingDraft: false, status: "draft" })).toBe(false); expect(canAutosaveVersion({ isWorkingDraft: true, status: "approved" })).toBe(false); });
  it("reports title, metadata and block changes", () => {
    const before = initialDocument(); const added = newBlock("faq");
    const after = { ...before, blocks: [before.blocks[0], added], metadata: { ...before.metadata, description: "changed" } };
    expect(compareVersions("Old", before, "New", after)).toMatchObject({ titleChanged: true, metadataChanged: true, added: [added.id], removed: [before.blocks[1].id] });
  });
});
