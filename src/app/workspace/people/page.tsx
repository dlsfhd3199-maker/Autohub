import Link from "next/link";
import { AssignmentForm, UnassignButton } from "@/components/assignment-form";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { listAssignablePeople, listBrandAssignments, listOrganizationPeople } from "@/modules/people/queries";

type Params = Promise<Record<string, string | string[] | undefined>>;
type ProfileValue = { id: string; display_name: string; is_active: boolean } | { id: string; display_name: string; is_active: boolean }[] | null;
const profileOf = (value: ProfileValue) => Array.isArray(value) ? value[0] : value;

export default async function PeoplePage({ searchParams }: { searchParams: Params }) {
  const context = await getWorkspaceContext();
  const brands = await listAccessibleBrands();
  const raw = await searchParams;
  const requested = Array.isArray(raw.brandId) ? raw.brandId[0] : raw.brandId;
  const brandId = brands.some((brand) => brand.id === requested) ? requested : brands[0]?.id;
  const assignments = brandId ? await listBrandAssignments(brandId) : [];
  const organizationPeople = context.role === "agency_admin" ? await listOrganizationPeople(context.organizationId) : [];
  const assignable = context.role === "agency_admin" && brandId ? await listAssignablePeople(brandId) : [];
  const choices = assignable.flatMap((row) => {
    const profile = profileOf(row.profiles as ProfileValue);
    return profile && (row.role === "ae" || row.role === "advertiser") ? [{ userId: row.user_id, name: profile.display_name, role: row.role }] : [];
  });
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">PEOPLE & ASSIGNMENTS</p><h1>담당자 및 브랜드 배정</h1><p>기존 조직 구성원의 브랜드 접근 범위를 관리합니다.</p></div></section>
    <div className="tabs" aria-label="브랜드 선택">{brands.map((brand) => <Link className={brand.id === brandId ? "active" : ""} href={`/workspace/people?brandId=${brand.id}`} key={brand.id}>{brand.name}</Link>)}</div>
    {!brandId ? <div className="state-card">접근 가능한 브랜드가 없습니다.</div> : <div className="two-column"><section className="panel"><h2>현재 배정</h2>{assignments.length === 0 ? <p className="empty-copy">배정된 담당자가 없습니다.</p> : <div className="table-wrap"><table><thead><tr><th>담당자</th><th>역할</th>{context.role === "agency_admin" && <th>관리</th>}</tr></thead><tbody>{assignments.map((row) => { const profile = profileOf(row.profiles as ProfileValue); return <tr key={row.id}><td>{profile?.display_name ?? "가상 담당자"}</td><td>{row.role === "ae" ? "AE" : "광고주"}</td>{context.role === "agency_admin" && <td><UnassignButton organizationId={context.organizationId} brandId={brandId} userId={row.user_id} role={row.role} /></td>}</tr>; })}</tbody></table></div>}{context.role === "agency_admin" && <AssignmentForm organizationId={context.organizationId} brandId={brandId} people={choices} />}</section>
      <section className="panel"><h2>조직 구성원</h2>{context.role !== "agency_admin" ? <div className="readonly-note">관리자만 조직 구성원과 배정을 관리할 수 있습니다.</div> : <ul className="people-list">{organizationPeople.map((row) => { const profile = profileOf(row.profiles as ProfileValue); return <li key={`${row.user_id}-${row.role}`}><span className="person-avatar">{profile?.display_name?.slice(0, 1) ?? "담"}</span><span><strong>{profile?.display_name ?? "가상 담당자"}</strong><small>{row.role === "agency_admin" ? "관리자" : row.role.toUpperCase()}</small></span></li>; })}</ul>}</section></div>}
  </main>;
}
