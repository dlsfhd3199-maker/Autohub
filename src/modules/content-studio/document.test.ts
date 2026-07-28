import { describe, expect, it } from "vitest";
import { AUTOSAVE_DELAY_MS, contentDocumentSchema, initialDocument, newBlock, shouldAutosave } from "./document";

describe("content document schema", () => {
  it("validates every supported block type", () => {
    const types = ["title", "answer", "summary", "section", "subheading", "paragraph", "bulletList", "numberedList", "table", "checklist", "faq", "cta", "sources", "image"] as const;
    expect(contentDocumentSchema.parse({ ...initialDocument(), blocks: types.map(newBlock) }).blocks).toHaveLength(types.length);
  });
  it("rejects unknown fields, duplicate ids, invalid URLs and empty blocks", () => {
    const document = initialDocument();
    expect(() => contentDocumentSchema.parse({ ...document, unknown: true })).toThrow();
    expect(() => contentDocumentSchema.parse({ ...document, blocks: [document.blocks[0], document.blocks[0]] })).toThrow();
    expect(() => contentDocumentSchema.parse({ ...document, blocks: [{ ...newBlock("cta"), url: "not-a-url" }] })).toThrow();
    expect(() => contentDocumentSchema.parse({ ...document, blocks: [] })).toThrow();
  });
  it("rejects excessive payloads and list sizes", () => {
    expect(() => contentDocumentSchema.parse({ ...initialDocument(), blocks: [{ ...newBlock("paragraph"), text: "x".repeat(510_000) }] })).toThrow();
    expect(() => contentDocumentSchema.parse({ ...initialDocument(), blocks: [{ ...newBlock("bulletList"), items: Array.from({ length: 31 }, () => "item") }] })).toThrow();
  });
});

describe("autosave decisions", () => {
  it("uses a five second delay and skips unchanged documents", () => {
    const document = initialDocument();
    expect(AUTOSAVE_DELAY_MS).toBe(5000);
    expect(shouldAutosave(document, structuredClone(document))).toBe(false);
    expect(shouldAutosave(document, { ...document, metadata: { ...document.metadata, description: "changed" } })).toBe(true);
  });
});
