import { BrandEditForm } from "@/components/brand-forms";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { getBrand } from "@/modules/brands/queries";

export default async function BrandDetailPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const context = await getWorkspaceContext();
  let brand;
  try { brand = await getBrand(brandId); } catch {
    return <main className="workspace-content"><div className="state-card"><h1>권한 없음</h1><p>이 브랜드에 접근할 수 없습니다.</p></div></main>;
  }
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">BRAND DETAIL</p><h1>{brand.name}</h1><p>{brand.domain}{brand.publishing_path}</p></div></section><section className="panel detail-panel"><dl><div><dt>브랜드 키</dt><dd>{brand.brand_key}</dd></div><div><dt>상태</dt><dd>{brand.archived_at ? "보관" : "운영"}</dd></div></dl>{context.role === "agency_admin" ? <BrandEditForm brand={brand} organizationId={context.organizationId} /> : <div className="readonly-note">읽기 전용 권한입니다.</div>}</section></main>;
}
