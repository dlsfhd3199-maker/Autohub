import Link from "next/link";
import { BrandCreateDialog } from "@/components/brand-forms";
import { Icon } from "@/components/icons";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands, listAdvertiserOrganizations, listBrandOperations } from "@/modules/brands/queries";
import { formatKoreanDate } from "@/modules/content/display";

export default async function BrandsPage() {
  const context = await getWorkspaceContext();
  const brands = await listAccessibleBrands();
  const [advertisers, operations] = await Promise.all([
    context.role === "agency_admin" ? listAdvertiserOrganizations(context.organizationId) : Promise.resolve([]),
    listBrandOperations(brands.map((brand) => brand.id)),
  ]);
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">BRAND MANAGEMENT</p><h1>브랜드 운영 현황</h1><p>접근 가능한 브랜드, 담당자와 콘텐츠 운영 정보를 관리합니다.</p></div>{context.role === "agency_admin" && <BrandCreateDialog organizationId={context.organizationId} advertisers={advertisers} />}</section>
    <div className="summary-strip"><div><strong>{brands.length}</strong><span>운영 브랜드</span></div><div><strong>{[...operations.values()].reduce((sum, item) => sum + item.contentCount, 0)}</strong><span>전체 콘텐츠</span></div><p>현재 권한 범위의 실제 데이터만 표시합니다.</p></div>
    {brands.length === 0 ? <div className="state-card"><span className="state-icon"><Icon name="brand" /></span><h2>표시할 브랜드가 없습니다</h2><p>{context.role === "agency_admin" ? "새 브랜드를 추가해 운영을 시작해 보세요." : "배정된 브랜드가 생기면 이곳에 표시됩니다."}</p></div> : <div className="brand-grid">{brands.map((brand) => { const operation = operations.get(brand.id); return <article className="brand-card" data-brand-id={brand.id} id={`brand-${brand.id}`} key={brand.id}><div className="brand-card-head"><span className="brand-avatar">{brand.name.slice(0, 2).toUpperCase()}</span><span className="status-badge status-active"><span />운영</span></div><div className="brand-card-title"><h2>{brand.name}</h2><p>{brand.domain}<span>{brand.publishing_path}</span></p></div><dl><div><dt>브랜드 키</dt><dd>{brand.brand_key}</dd></div><div><dt>담당 AE</dt><dd>{operation?.aeNames.join(", ") || "미배정"}</dd></div><div><dt>광고주 담당자</dt><dd>{operation?.advertiserNames.join(", ") || "미배정"}</dd></div><div><dt>콘텐츠</dt><dd>{operation?.contentCount ?? 0}개</dd></div><div><dt>최근 수정</dt><dd>{formatKoreanDate(brand.updated_at)}</dd></div></dl><Link className="card-link" href={`/workspace/brands/${brand.id}`}>브랜드 상세 보기<Icon name="arrow" /></Link></article>; })}</div>}
  </main>;
}
