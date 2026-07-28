import Link from "next/link";
import { AssignmentForm, UnassignButton } from "@/components/assignment-form";
import { Icon } from "@/components/icons";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { listAssignablePeople, listBrandAssignments, listOrganizationPeople } from "@/modules/people/queries";

type Params = Promise<Record<string, string | string[] | undefined>>;
type ProfileValue = { id: string; display_name: string; is_active: boolean } | { id: string; display_name: string; is_active: boolean }[] | null;
const profileOf = (value: ProfileValue) => Array.isArray(value) ? value[0] : value;
const roleText = (role: string) => role === "agency_admin" ? "대행사 관리자" : role === "advertiser" ? "광고주" : "AE";

export default async function PeoplePage({ searchParams }: { searchParams: Params }) {
  const context = await getWorkspaceContext();
  const brands = await listAccessibleBrands();
  const raw = await searchParams;
  const requested = Array.isArray(raw.brandId) ? raw.brandId[0] : raw.brandId;
  const brandId = brands.some((brand) => brand.id === requested) ? requested : brands[0]?.id;
  const selectedBrand = brands.find((brand) => brand.id === brandId);
  const q = String(Array.isArray(raw.q) ? raw.q[0] : raw.q ?? "").trim().toLowerCase().slice(0, 80);
  const roleFilter = String(Array.isArray(raw.role) ? raw.role[0] : raw.role ?? "");
  const assignments = brandId ? await listBrandAssignments(brandId) : [];
  const organizationPeople = context.role === "agency_admin" ? await listOrganizationPeople(context.organizationId) : [];
  const assignable = context.role === "agency_admin" && brandId ? await listAssignablePeople(brandId) : [];
  const assignedKeys = new Set(assignments.map((row) => `${row.user_id}:${row.role}`));
  const choices = assignable.flatMap((row) => { const profile = profileOf(row.profiles as ProfileValue); return profile && (row.role === "ae" || row.role === "advertiser") && !assignedKeys.has(`${row.user_id}:${row.role}`) ? [{ userId: row.user_id, name: profile.display_name, role: row.role }] : []; });
  const filteredPeople = organizationPeople.filter((row) => { const profile = profileOf(row.profiles as ProfileValue); return (!q || profile?.display_name.toLowerCase().includes(q)) && (!roleFilter || row.role === roleFilter); });
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">PEOPLE & ASSIGNMENTS</p><h1>담당자 및 브랜드 배정</h1><p>조직 구성원의 역할과 브랜드 접근 범위를 한곳에서 관리합니다.</p></div></section>
    <nav className="brand-tabs" aria-label="브랜드 선택">{brands.map((brand) => <Link aria-current={brand.id === brandId ? "page" : undefined} className={brand.id === brandId ? "active" : ""} href={`/workspace/people?brandId=${brand.id}`} key={brand.id}>{brand.name}</Link>)}</nav>
    {!brandId ? <div className="state-card"><Icon name="people" /><h2>접근 가능한 브랜드가 없습니다</h2></div> : <><section className="selection-banner"><div><span className="brand-avatar">{selectedBrand?.name.slice(0, 2).toUpperCase()}</span><span><small>현재 선택한 브랜드</small><strong>{selectedBrand?.name}</strong><em>{selectedBrand?.domain}</em></span></div><div><strong>{assignments.length}</strong><span>현재 배정</span></div></section>
      <div className="people-layout"><section className="panel assignment-panel"><div className="section-heading"><div><p className="eyebrow">ASSIGNED</p><h2>배정된 담당자</h2></div><span className="count-badge">{assignments.length}명</span></div>{assignments.length === 0 ? <div className="empty-inline"><Icon name="people" /><p>아직 배정된 담당자가 없습니다.</p></div> : <ul className="assignment-list">{assignments.map((row) => { const profile = profileOf(row.profiles as ProfileValue); const name = profile?.display_name ?? "가상 담당자"; return <li key={row.id}><span className={`person-avatar role-${row.role}`}>{name.slice(0, 1)}</span><span className="person-copy"><strong>{name}</strong><small><span className={`role-badge role-${row.role}`}>{roleText(row.role)}</span>배정됨</small></span>{context.role === "agency_admin" && <UnassignButton organizationId={context.organizationId} brandId={brandId} userId={row.user_id} role={row.role} personName={name} />}</li>; })}</ul>}{context.role === "agency_admin" && <AssignmentForm organizationId={context.organizationId} brandId={brandId} people={choices} />}</section>
      <section className="panel directory-panel"><div className="section-heading"><div><p className="eyebrow">DIRECTORY</p><h2>조직 구성원</h2></div></div>{context.role !== "agency_admin" ? <div className="readonly-note"><Icon name="warning" /><span>대행사 관리자만 조직 구성원과 배정을 관리할 수 있습니다.</span></div> : <><form className="people-filter"><input type="hidden" name="brandId" value={brandId} /><label><span className="sr-only">구성원 검색</span><input name="q" defaultValue={q} placeholder="구성원 이름 검색" /></label><label><span className="sr-only">역할 필터</span><select name="role" defaultValue={roleFilter}><option value="">전체 역할</option><option value="agency_admin">관리자</option><option value="ae">AE</option><option value="advertiser">광고주</option></select></label><button className="secondary-button">검색</button></form><ul className="people-list">{filteredPeople.map((row) => { const profile = profileOf(row.profiles as ProfileValue); const isAssigned = assignedKeys.has(`${row.user_id}:${row.role}`); return <li key={`${row.user_id}-${row.role}`}><span className={`person-avatar role-${row.role}`}>{profile?.display_name?.slice(0, 1) ?? "담"}</span><span><strong>{profile?.display_name ?? "가상 담당자"}</strong><small>{roleText(row.role)} · {isAssigned ? "현재 브랜드 배정됨" : "미배정"}</small></span>{isAssigned && <span className="assigned-badge"><Icon name="check" />배정됨</span>}</li>; })}</ul></>}</section></div></>}
  </main>;
}
