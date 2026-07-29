import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

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
  const pawId = "32000000-0000-4000-8000-000000000003";
  const { error: organizationError } = await admin.from("organizations").upsert([{ id: agencyId, name: "Virtual Agency", type: "agency" }, { id: advertiserId, name: "Virtual Advertiser", type: "advertiser" }, { id: otherAgencyId, name: "Virtual Other Agency", type: "agency" }, { id: otherAdvertiserId, name: "Virtual Other Advertiser", type: "advertiser" }]);
  if (organizationError) throw organizationError;
  const { error: membershipError } = await admin.from("organization_memberships").upsert([{ user_id: created.admin, organization_id: agencyId, role: "agency_admin" }, { user_id: created.ae, organization_id: agencyId, role: "ae" }, { user_id: created.advertiser, organization_id: advertiserId, role: "advertiser" }], { onConflict: "user_id,organization_id,role" });
  if (membershipError) throw membershipError;
  const { error: brandError } = await admin.from("brands").upsert([{ id: lumiId, agency_organization_id: agencyId, advertiser_organization_id: advertiserId, name: "Virtual Lumi", brand_key: "virtual-lumi", domain: "lumi.example.com", publishing_path: "/blog", archived_at: null, is_active: true }, { id: bridgeId, agency_organization_id: otherAgencyId, advertiser_organization_id: otherAdvertiserId, name: "Virtual Bridge", brand_key: "virtual-bridge", domain: "bridge.example.com", publishing_path: "/journal", archived_at: null, is_active: true }, { id: pawId, agency_organization_id: agencyId, advertiser_organization_id: advertiserId, name: "Virtual Paw", brand_key: "virtual-paw", domain: "paw.example.com", publishing_path: "/blog", archived_at: null, is_active: true }]);
  if (brandError) throw brandError;
  const { error: assignmentError } = await admin.from("brand_assignments").upsert([{ brand_id: lumiId, user_id: created.advertiser, role: "advertiser" }], { onConflict: "brand_id,user_id,role" });
  if (assignmentError) throw assignmentError;
  const { error: cleanAeAssignmentError } = await admin.from("brand_assignments").delete().eq("brand_id", lumiId).eq("user_id", created.ae).eq("role", "ae");
  if (cleanAeAssignmentError) throw cleanAeAssignmentError;
  const { error: contentError } = await admin.from("content_items").upsert([{ id: "42000000-0000-4000-8000-000000000001", brand_id: lumiId, title: "Virtual Lumi Search Guide", slug: "virtual-lumi-search-guide", status: "draft", owner_id: created.ae }, { id: "42000000-0000-4000-8000-000000000002", brand_id: bridgeId, title: "Virtual Bridge Private Guide", slug: "virtual-bridge-private-guide", status: "approved", owner_id: created.admin }]);
  if (contentError) throw contentError;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("Local publishable key is required for the E2E administrator session");
  const session = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginError } = await session.auth.signInWithPassword(e2eAccounts.admin);
  if (loginError) throw loginError;
  const { data: adminPermission, error: permissionError } = await session.rpc("is_agency_admin", { target_brand_id: lumiId });
  if (permissionError || adminPermission !== true) throw new Error("E2E administrator brand permission was not established");
  const { data: existingContent } = await session.from("content_items").select("current_draft_id").eq("id", "42000000-0000-4000-8000-000000000001").single();
  let draftId = existingContent?.current_draft_id as string | null;
  if (!draftId) {
    draftId = randomUUID();
    const { data: lastVersion } = await session.from("content_versions").select("version_no").eq("content_id", "42000000-0000-4000-8000-000000000001").order("version_no", { ascending: false }).limit(1).maybeSingle();
    const { error: draftInsertError } = await session.from("content_versions").insert({ id: draftId, brand_id: lumiId, content_id: "42000000-0000-4000-8000-000000000001", version_no: (lastVersion?.version_no ?? 0) + 1, status: "draft", body_json: { schemaVersion: 1, blocks: [{ id: randomUUID(), type: "paragraph", text: "Virtual saved studio paragraph" }], metadata: { primaryKeyword: "virtual search", keywords: [], description: "" } }, created_by: created.admin, is_working_draft: true, title_snapshot: "Virtual Lumi Search Guide", document_schema_version: 1 });
    if (draftInsertError) throw draftInsertError;
  } else {
    const { error: draftUpdateError } = await session.from("content_versions").update({ body_json: { schemaVersion: 1, blocks: [{ id: randomUUID(), type: "paragraph", text: "Virtual saved studio paragraph" }], metadata: { primaryKeyword: "virtual search", keywords: [], description: "" } }, title_snapshot: "Virtual Lumi Search Guide", revision: 1 }).eq("id", draftId).eq("is_working_draft", true);
    if (draftUpdateError) throw draftUpdateError;
  }
  const { error: linkError } = await session.from("content_items").update({ current_draft_id: draftId, current_version_id: null, published_version_id: null, published_at: null, publication_updated_at: null, status: "draft", primary_keyword: "virtual search", title: "Virtual Lumi Search Guide" }).eq("id", "42000000-0000-4000-8000-000000000001");
  if (linkError) throw linkError;
  const { error: jobsCleanupError } = await admin.from("generation_jobs").delete().eq("brand_id", lumiId);
  if (jobsCleanupError) throw jobsCleanupError;
  const { error: evidenceCleanupError } = await admin.from("evidence_sources").delete().eq("brand_id", lumiId);
  if (evidenceCleanupError) throw evidenceCleanupError;
  const { error: knowledgeCleanupError } = await admin.from("brand_knowledge_profiles").delete().eq("brand_id", lumiId);
  if (knowledgeCleanupError) throw knowledgeCleanupError;
  const publishingKey = process.env.E2E_PUBLISHING_KEY;
  if (!publishingKey) throw new Error("Ephemeral E2E publishing key is required");
  const { error: connectionError } = await admin.from("publishing_connections").upsert({ brand_id: lumiId, status: "active", bearer_key_hash: createHash("sha256").update(publishingKey).digest("hex"), created_by: created.admin, disabled_at: null }, { onConflict: "brand_id" });
  if (connectionError) throw connectionError;
  const { error: pawConnectionCleanupError } = await admin.from("publishing_connections").delete().eq("brand_id", pawId);
  if (pawConnectionCleanupError) throw pawConnectionCleanupError;
}
