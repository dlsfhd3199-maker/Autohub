import { describe, expect, it } from "vitest";
import { createPublishingKey, hashPublishingKey, hashesEqual, isPublishingKey } from "./keys";

describe("publishing bearer keys", () => {
  it("creates high-entropy server keys and stores only a hash", () => {
    const first = createPublishingKey();
    const second = createPublishingKey();
    expect(isPublishingKey(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(hashPublishingKey(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPublishingKey(first)).not.toContain(first);
  });

  it("compares only valid hashes", () => {
    const hash = hashPublishingKey(createPublishingKey());
    expect(hashesEqual(hash, hash)).toBe(true);
    expect(hashesEqual(hash, "invalid")).toBe(false);
  });
});
