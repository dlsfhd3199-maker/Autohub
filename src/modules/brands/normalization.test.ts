import { describe, expect, it } from "vitest";
import { normalizeBrandKey, normalizeDomain, normalizePublishingPath } from "./normalization";

describe("brand input normalization", () => {
  it("creates a lower-case hyphenated key from a virtual brand name", () => {
    expect(normalizeBrandKey("Virtual_Test Brand")).toBe("virtual-test-brand");
  });
  it("normalizes protocols, paths and publishing paths", () => {
    expect(normalizeDomain("HTTPS://ORBIT.EXAMPLE.COM/blog/")).toBe("orbit.example.com");
    expect(normalizePublishingPath("content/guides")).toBe("/content/guides");
  });
});
