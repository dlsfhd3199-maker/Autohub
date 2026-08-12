import { describe, expect, it } from "vitest";
import { advertiserApplicationSchema, hashJoinCode, marketerApplicationSchema, normalizeEmail } from "./schemas";

const validAdvertiser = { role: "advertiser", organizationName: "Virtual Client", brandName: "Virtual Nova", storefrontUrl: "https://nova.example.com", applicantName: "담당자 A", jobTitle: "담당자", phone: "010-0000-0000", email: " USER-A@EXAMPLE.COM ", password: "VirtualPass123!", passwordConfirm: "VirtualPass123!", privacyConsent: "on" };

describe("registration schemas", () => {
  it("normalizes email", () => expect(normalizeEmail(" USER-A@EXAMPLE.COM ")).toBe("user-a@example.com"));
  it("validates advertiser application", () => expect(advertiserApplicationSchema.parse(validAdvertiser).email).toBe("user-a@example.com"));
  it("rejects mismatched passwords", () => expect(advertiserApplicationSchema.safeParse({ ...validAdvertiser, passwordConfirm: "different" }).success).toBe(false));
  it("rejects unsafe storefront URLs", () => expect(advertiserApplicationSchema.safeParse({ ...validAdvertiser, storefrontUrl: "file:///secret" }).success).toBe(false));
  it("does not allow an administrator role in a public application", () => expect(marketerApplicationSchema.safeParse({ ...validAdvertiser, role: "agency_admin" }).success).toBe(false));
  it("hashes join codes deterministically", () => expect(hashJoinCode("Virtual-Code-123")).toMatch(/^[a-f0-9]{64}$/));
});
