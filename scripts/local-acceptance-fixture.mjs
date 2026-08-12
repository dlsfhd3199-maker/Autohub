import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const supabaseCli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const password = "Virtual-Test-Only-42!";
export const acceptanceAccounts = {
  admin: { email: "cp3-admin@example.com", password }, ae: { email: "cp3-ae@example.com", password }, advertiser: { email: "cp3-advertiser@example.com", password },
};

function localEnv() {
  const output = execFileSync(process.execPath, [supabaseCli, "status", "-o", "env"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const values = Object.fromEntries(output.split(/\r?\n/).flatMap((line) => { const index = line.indexOf("="); return index > 0 ? [[line.slice(0, index), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")]] : []; }));
  if (values.API_URL !== "http://127.0.0.1:54321" || !values.SERVICE_ROLE_KEY || !values.PUBLISHABLE_KEY) throw new Error("인수 fixture는 loopback 로컬 Supabase에서만 구성할 수 있습니다.");
  return values;
}

function document(title, keyword, index) {
  const blockId = (suffix) => `62000000-0000-4000-8000-${String(index * 100 + suffix).padStart(12, "0")}`;
  return { schemaVersion: 1, blocks: [
    { id: blockId(1), type: "title", text: title },
    { id: blockId(2), type: "answer", text: `${title}은 등록된 가상 공식 근거를 확인하고 사람이 검수한 뒤 사용하는 테스트 안내입니다.` },
    { id: blockId(3), type: "section", heading: "확인 기준", body: "가상 상품의 특징, 제한 사항, 공식 출처를 순서대로 확인합니다." },
    { id: blockId(4), type: "checklist", items: [{ text: "공식 근거 확인", checked: true }, { text: "금지 표현 검수", checked: false }] },
    { id: blockId(5), type: "faq", items: [{ question: "이 콘텐츠는 실제 상품 안내인가요?", answer: "아니요. example.com 기반의 명백한 가상 인수 데이터입니다." }] },
    { id: blockId(6), type: "cta", text: "가상 공식 자료를 확인해 보세요.", label: "가상 자료 확인", url: `https://example.com/virtual-${index}` },
    { id: blockId(7), type: "sources", items: [{ label: "가상 공식 근거", url: `https://example.com/evidence-${index}` }] },
  ], metadata: { primaryKeyword: keyword, keywords: [keyword, "가상 공식 근거"], description: `${title}에 관한 로컬 테스트 발행 콘텐츠입니다.` } };
}

export async function resetAndPrepareAcceptanceFixture(publishingKey) {
  if (!publishingKey) throw new Error("메모리 전용 발행 키가 필요합니다.");
  localEnv();
  execFileSync(process.execPath, [supabaseCli, "db", "reset"], { cwd: root, stdio: "ignore" });
  const env = localEnv();
  const service = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existingUsers, error: listUsersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listUsersError) throw new Error("기존 로컬 가상 계정을 확인하지 못했습니다.");
  for (const user of existingUsers.users) {
    if (user.email && Object.values(acceptanceAccounts).some((account) => account.email === user.email)) {
      const { error } = await service.auth.admin.deleteUser(user.id);
      if (error) throw new Error("기존 로컬 가상 계정을 정리하지 못했습니다.");
    }
  }
  const ids = { agency: "22000000-0000-4000-8000-000000000001", advertiserOrg: "22000000-0000-4000-8000-000000000002", otherAgency: "22000000-0000-4000-8000-000000000003", otherAdvertiser: "22000000-0000-4000-8000-000000000004", lumi: "32000000-0000-4000-8000-000000000001", bridge: "32000000-0000-4000-8000-000000000002", paw: "32000000-0000-4000-8000-000000000003" };
  const users = {};
  for (const [role, account] of Object.entries(acceptanceAccounts)) {
    const { data, error } = await service.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true, user_metadata: { display_name: role === "admin" ? "가상 관리자" : role === "advertiser" ? "가상 광고주 담당자" : "담당자 A" } });
    if (error || !data.user) throw new Error("가상 인수 계정을 구성하지 못했습니다.");
    users[role] = data.user.id;
  }
  const { error: accountStatusError } = await service.from("user_account_statuses").upsert(
    Object.values(users).map((userId) => ({ user_id: userId, status: "approved" })),
    { onConflict: "user_id" },
  );
  if (accountStatusError) throw new Error(`계정 승인 상태 fixture 구성에 실패했습니다. 오류 코드: ${accountStatusError.code ?? "unknown"}`);

  const check = async (promise, label) => { const { error } = await promise; if (error) throw new Error(`${label} fixture 구성에 실패했습니다. 오류 코드: ${error.code ?? "unknown"}`); };
  await check(service.from("organizations").insert([{ id: ids.agency, name: "Virtual Agency", type: "agency" }, { id: ids.advertiserOrg, name: "Virtual Advertiser", type: "advertiser" }, { id: ids.otherAgency, name: "Virtual Other Agency", type: "agency" }, { id: ids.otherAdvertiser, name: "Virtual Other Advertiser", type: "advertiser" }]), "조직");
  await check(service.from("organization_memberships").insert([{ user_id: users.admin, organization_id: ids.agency, role: "agency_admin" }, { user_id: users.ae, organization_id: ids.agency, role: "ae" }, { user_id: users.advertiser, organization_id: ids.advertiserOrg, role: "advertiser" }]), "권한");
  await check(service.from("brands").insert([{ id: ids.lumi, agency_organization_id: ids.agency, advertiser_organization_id: ids.advertiserOrg, name: "Virtual Lumi", brand_key: "virtual-lumi", domain: "lumi.example.com", publishing_path: "/blog" }, { id: ids.bridge, agency_organization_id: ids.otherAgency, advertiser_organization_id: ids.otherAdvertiser, name: "Virtual Bridge", brand_key: "virtual-bridge", domain: "bridge.example.com", publishing_path: "/journal" }, { id: ids.paw, agency_organization_id: ids.agency, advertiser_organization_id: ids.advertiserOrg, name: "Virtual Paw", brand_key: "virtual-paw", domain: "paw.example.com", publishing_path: "/blog" }]), "브랜드");
  await check(service.from("brand_assignments").insert([{ brand_id: ids.lumi, user_id: users.ae, role: "ae" }, { brand_id: ids.lumi, user_id: users.advertiser, role: "advertiser" }]), "브랜드 배정");
  await check(service.from("brand_knowledge_profiles").insert({ brand_id: ids.lumi, introduction: "Virtual Lumi는 로컬 인수 검수만을 위한 가상 브랜드입니다.", target_audience: "가상 상품의 공식 근거를 확인하려는 테스트 독자", tone: "차분하고 명확한 안내", prohibited_expressions: ["무조건", "최고"], default_cta: { label: "가상 자료 확인", url: "https://example.com/virtual-lumi" }, product_info: [{ name: "Virtual Lumi Compass", summary: "방향 확인을 돕는 가상 상품", features: ["가상 기준 제공"], limitations: ["실제 구매 불가"], officialUrl: "https://example.com/virtual-lumi-compass" }], created_by: users.admin, updated_by: users.admin }), "AI 설정");
  await check(service.from("evidence_sources").insert({ brand_id: ids.lumi, title: "Virtual Lumi 공식 가상 근거", official_url: "https://example.com/evidence", evidence_text: "Virtual Lumi Compass는 로컬 PoC에서만 사용하는 가상 상품이며 실제 효능이나 성능을 주장하지 않습니다.", content_hash: createHash("sha256").update("virtual-lumi-acceptance-evidence").digest("hex"), created_by: users.admin }), "근거");
  const titles = ["가상 탐색 장치 선택 기준", "가상 상품 공식 근거 확인 방법", "가상 서비스 도입 전 체크리스트", "가상 콘텐츠 출처 표기 안내", "가상 브랜드 FAQ 작성 가이드", "가상 테스트 발행 준비 문서"];
  const items = titles.map((title, index) => ({ id: `42000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`, brand_id: index === 5 ? ids.paw : ids.lumi, title, slug: `virtual-acceptance-guide-${index + 1}`, status: "draft", owner_id: users.admin, primary_keyword: `가상 키워드 ${index + 1}` }));
  await check(service.from("content_items").insert(items), "콘텐츠");
  const versions = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]; const explicit = `52000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`; const draft = `53000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`;
    if (index < 5) versions.push({ id: explicit, brand_id: item.brand_id, content_id: item.id, version_no: 1, status: index === 4 ? "approved" : "draft", body_json: document(item.title, item.primary_keyword, index + 1), created_by: users.admin, is_working_draft: false, title_snapshot: item.title, change_summary: "로컬 인수용 명시적 버전" });
    versions.push({ id: draft, brand_id: item.brand_id, content_id: item.id, version_no: index < 5 ? 2 : 1, status: "draft", body_json: document(item.title, item.primary_keyword, index + 1), created_by: users.admin, is_working_draft: true, title_snapshot: item.title, change_summary: "" });
  }
  await check(service.from("content_versions").insert(versions), "버전");
  for (let index = 0; index < items.length; index += 1) await check(service.from("content_items").update({ current_version_id: index < 5 ? `52000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}` : null, current_draft_id: `53000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`, status: index === 4 ? "approved" : "draft" }).eq("id", items[index].id), "콘텐츠 연결");
  await check(service.from("publishing_connections").insert({ brand_id: ids.lumi, status: "active", bearer_key_hash: createHash("sha256").update(publishingKey).digest("hex"), created_by: users.admin }), "발행 연결");
  const session = createClient(env.API_URL, env.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginError } = await session.auth.signInWithPassword(acceptanceAccounts.admin); if (loginError) throw new Error("가상 관리자 세션을 구성하지 못했습니다.");
  for (let index = 0; index < 4; index += 1) { const { error } = await session.rpc("test_publish_content", { target_content_id: items[index].id, target_version_id: `52000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}` }); if (error) throw new Error("테스트 발행 fixture 구성에 실패했습니다."); }
  return { publishedTitle: titles[0], contentCount: titles.length };
}
