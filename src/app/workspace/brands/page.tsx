import Link from "next/link";
import { BrandCreateForm } from "@/components/brand-forms";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands, listAdvertiserOrganizations } from "@/modules/brands/queries";

export default async function BrandsPage() {
  const context = await getWorkspaceContext();
  const brands = await listAccessibleBrands();
  const advertisers = context.role === "agency_admin" ? await listAdvertiserOrganizations(context.organizationId) : [];
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">BRAND MANAGEMENT</p><h1>브랜드 운영 현황</h1><p>접근 가능한 브랜드와 기본 발행 경로를 관리합니다.</p></div></section>
    {context.role === "agency_admin" && <details className="panel create-panel"><summary>+ 새 브랜드</summary><BrandCreateForm organizationId={context.organizationId} advertisers={advertisers} /></details>}
    {brands.length === 0 ? <div className="state-card"><h2>표시할 브랜드가 없습니다.</h2><p>관리자는 연결된 광고주 조직으로 첫 브랜드를 구성할 수 있습니다.</p></div> : <div className="brand-grid">{brands.map((brand) => <article className="brand-card" key={brand.id}><div className="brand-card-head"><span className="brand-avatar">{brand.name.slice(0, 2).toUpperCase()}</span><span className="healthy-pill">● 운영</span></div><h2>{brand.name}</h2><p>{brand.domain}{brand.publishing_path}</p><dl><div><dt>브랜드 키</dt><dd>{brand.brand_key}</dd></div><div><dt>최근 수정</dt><dd>{new Date(brand.updated_at).toLocaleDateString("ko-KR")}</dd></div></dl><Link className="secondary-button" href={`/workspace/brands/${brand.id}`}>상세 보기</Link></article>)}</div>}
  </main>;
}
