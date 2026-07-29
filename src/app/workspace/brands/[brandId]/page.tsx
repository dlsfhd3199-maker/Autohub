import Link from "next/link";
import { BrandEditForm } from "@/components/brand-forms";
import { Icon } from "@/components/icons";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { getBrand } from "@/modules/brands/queries";
import { formatKoreanDate } from "@/modules/content/display";

export default async function BrandDetailPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const context = await getWorkspaceContext();
  let brand;
  try { brand = await getBrand(brandId); } catch { return <main className="workspace-content"><div className="state-card"><span className="state-icon"><Icon name="warning" /></span><h1>접근 권한이 없습니다</h1><p>이 브랜드가 배정되어 있는지 확인해 주세요.</p><Link className="secondary-button" href="/workspace/brands">브랜드 목록으로</Link></div></main>; }
  return <main className="workspace-content"><Link className="back-link" href="/workspace/brands">← 브랜드 목록</Link>
    <section className="page-heading detail-heading"><div><p className="eyebrow">BRAND DETAIL</p><h1>{brand.name}</h1><p>{brand.domain}{brand.publishing_path}</p></div><span className={`status-badge ${brand.archived_at ? "status-archived" : "status-active"}`}><span />{brand.archived_at ? "보관" : "운영"}</span></section>
    <section className="panel detail-panel"><div className="detail-summary"><div><small>브랜드 키</small><strong>{brand.brand_key}</strong></div><div><small>연결 도메인</small><strong>{brand.domain}</strong></div><div><small>기본 발행 경로</small><strong>{brand.publishing_path}</strong></div><div><small>최근 수정</small><strong>{formatKoreanDate(brand.updated_at)}</strong></div></div>
      {context.role !== "advertiser" && !brand.archived_at ? <Link className="secondary-button detail-ai-link" href={`/workspace/brands/${brand.id}/ai-settings`}>AI 콘텐츠 설정</Link> : null}
      {context.role === "agency_admin" ? <BrandEditForm brand={brand} organizationId={context.organizationId} /> : <div className="readonly-note"><Icon name="warning" /><span><strong>읽기 전용 화면입니다.</strong> 브랜드 정보 변경은 대행사 관리자만 가능합니다.</span></div>}
    </section></main>;
}
