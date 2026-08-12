import { describe, expect, it } from "vitest";
import { isProvisioningUserOwnedByRequest } from "./ownership";
describe("advertiser provisioning ownership",()=>{
  it("accepts only the same email and idempotency request",()=>{const user={email:"virtual-a@example.com",user_metadata:{provisioning_request_id:"request-a"}};expect(isProvisioningUserOwnedByRequest(user,"virtual-a@example.com","request-a")).toBe(true);expect(isProvisioningUserOwnedByRequest(user,"virtual-a@example.com","request-b")).toBe(false);expect(isProvisioningUserOwnedByRequest(user,"other@example.com","request-a")).toBe(false)});
  it("never treats missing metadata as owned",()=>{expect(isProvisioningUserOwnedByRequest({email:"virtual-a@example.com",user_metadata:{}},"virtual-a@example.com","request-a")).toBe(false)});
});
