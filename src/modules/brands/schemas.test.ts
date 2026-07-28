import { describe, expect, it } from "vitest";
import { brandInputSchema } from "./schemas";

const valid = { organizationId: "20000000-0000-4000-8000-000000000001", advertiserOrganizationId: "20000000-0000-4000-8000-000000000002", name: "Virtual Lumi", brandKey: "virtual-lumi", domain: "virtual-lumi.example.com", publishingPath: "/blog" };

describe("brand input validation", () => {
  it("accepts a clearly virtual brand configuration", () => {
    expect(brandInputSchema.parse(valid)).toEqual(valid);
  });
  it.each([
    ["invalid domain", { ...valid, domain: "https://example.com/path" }],
    ["invalid publishing path", { ...valid, publishingPath: "blog" }],
    ["invalid key", { ...valid, brandKey: "Virtual Lumi" }],
  ])("rejects %s", (_label, input) => expect(() => brandInputSchema.parse(input)).toThrow());
});
