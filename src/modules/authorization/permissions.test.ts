import { describe, expect, it } from "vitest";

import {
  canAccessBrand,
  canEditContent,
  canManageBrand,
  canReadContent,
  type AuthorizationContext,
} from "./permissions";

const alphaBrand = "brand-alpha";
const betaBrand = "brand-beta";

function context(role: AuthorizationContext["role"]): AuthorizationContext {
  return { role, organizationId: "fictional-agency", assignedBrandIds: new Set([alphaBrand]) };
}

describe("brand-scoped authorization", () => {
  it("allows an agency administrator to manage brands", () => {
    expect(canManageBrand(context("agency_admin"))).toBe(true);
    expect(canAccessBrand(context("agency_admin"), betaBrand)).toBe(true);
  });

  it("limits an AE to assigned brands", () => {
    expect(canEditContent(context("ae"), alphaBrand)).toBe(true);
    expect(canEditContent(context("ae"), betaBrand)).toBe(false);
  });

  it("allows an advertiser to read but not edit its assigned brand", () => {
    expect(canReadContent(context("advertiser"), alphaBrand)).toBe(true);
    expect(canEditContent(context("advertiser"), alphaBrand)).toBe(false);
    expect(canReadContent(context("advertiser"), betaBrand)).toBe(false);
  });
});
