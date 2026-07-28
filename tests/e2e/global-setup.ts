import { createClient } from "@supabase/supabase-js";

export const e2eAccounts = {
  admin: { email: "cp3-admin@example.com", password: "Virtual-Test-Only-42!" },
  ae: { email: "cp3-ae@example.com", password: "Virtual-Test-Only-42!" },
  advertiser: { email: "cp3-advertiser@example.com", password: "Virtual-Test-Only-42!" },
};

export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Local Supabase must be running for checkpoint 3 E2E tests");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const created: Record<keyof typeof e2eAccounts, string> = { admin: "", ae: "", advertiser: "" };
  for (const [keyName, account] of Object.entries(e2eAccounts) as [keyof typeof e2eAccounts, (typeof e2eAccounts)[keyof typeof e2eAccounts]][]) {
    const old = existing.users.find((user) => user.email === account.email);
    const attributes = { password: account.password, email_confirm: true, user_metadata: { display_name: keyName === "admin" ? "가상 관리자" : keyName === "advertiser" ? "가상 광고주 담당자" : "담당자 A" } };
    const { data, error } = old
      ? await admin.auth.admin.updateUserById(old.id, attributes)
      : await admin.auth.admin.createUser({ email: account.email, ...attributes });
    if (error || !data.user) throw error ?? new Error("Failed to create virtual E2E user");
    created[keyName] = data.user.id;
  }
  const agencyId = "22000000-0000-4000-8000-000000000001";
  const advertiserId = "22000000-0000-4000-8000-000000000002";
  const otherAgencyId = "22000000-0000-4000-8000-000000000003";
  const otherAdvertiserId = "22000000-0000-4000-8000-000000000004";
  const lumiId = "32000000-0000-4000-8000-000000000001";
  const bridgeId = "32000000-0000-4000-8000-000000000002";
  const { error: organizationError } = await admin.from("organizations").upsert([{ id: agencyId, name: "Virtual Agency", type: "agency" }, { id: advertiserId, name: "Virtual Advertiser", type: "advertiser" }, { id: otherAgencyId, name: "Virtual Other Agency", type: "agency" }, { id: otherAdvertiserId, name: "Virtual Other Advertiser", type: "advertiser" }]);
  if (organizationError) throw organizationError;
  const { error: membershipError } = await admin.from("organization_memberships").upsert([{ user_id: created.admin, organization_id: agencyId, role: "agency_admin" }, { user_id: created.ae, organization_id: agencyId, role: "ae" }, { user_id: created.advertiser, organization_id: advertiserId, role: "advertiser" }], { onConflict: "user_id,organization_id,role" });
  if (membershipError) throw membershipError;
  const { error: brandError } = await admin.from("brands").upsert([{ id: lumiId, agency_organization_id: agencyId, advertiser_organization_id: advertiserId, name: "Virtual Lumi", brand_key: "virtual-lumi", domain: "lumi.example.com", publishing_path: "/blog", archived_at: null, is_active: true }, { id: bridgeId, agency_organization_id: otherAgencyId, advertiser_organization_id: otherAdvertiserId, name: "Virtual Bridge", brand_key: "virtual-bridge", domain: "bridge.example.com", publishing_path: "/journal", archived_at: null, is_active: true }]);
  if (brandError) throw brandError;
  const { error: assignmentError } = await admin.from("brand_assignments").upsert([{ brand_id: lumiId, user_id: created.advertiser, role: "advertiser" }], { onConflict: "brand_id,user_id,role" });
  if (assignmentError) throw assignmentError;
  const { error: contentError } = await admin.from("content_items").upsert([{ id: "42000000-0000-4000-8000-000000000001", brand_id: lumiId, title: "Virtual Lumi Search Guide", slug: "virtual-lumi-search-guide", status: "draft", owner_id: created.ae }, { id: "42000000-0000-4000-8000-000000000002", brand_id: bridgeId, title: "Virtual Bridge Private Guide", slug: "virtual-bridge-private-guide", status: "approved", owner_id: created.admin }]);
  if (contentError) throw contentError;
}
