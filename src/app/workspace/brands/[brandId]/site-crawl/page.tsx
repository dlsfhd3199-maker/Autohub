import Link from "next/link";
import { CrawlButton, SiteSourceForm } from "@/components/site-knowledge-actions";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { getBrand } from "@/modules/brands/queries";
import { formatKoreanDate } from "@/modules/content/display";
import { getSiteKnowledge } from "@/modules/site-crawl/queries";

export default async function SiteCrawlPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const [brand, data, context] = await Promise.all([getBrand(brandId), getSiteKnowledge(brandId), getWorkspaceContext()]);
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}`}>← 브랜드 상세</Link><section className="page-heading"><div><p className="eyebrow">SITE COLLECTION</p><h1>{brand.name} 사이트 수집</h1><p>등록·검증된 소스만 서버에서 수집합니다. 브라우저는 외부 페이지에 직접 요청하지 않습니다.</p></div><nav className="section-nav" aria-label="사이트 지식 메뉴"><Link aria-current="page" href={`/workspace/brands/${brandId}/site-crawl`}>사이트 수집</Link><Link href={`/workspace/brands/${brandId}/knowledge`}>브랜드 지식</Link><Link href={`/workspace/brands/${brandId}/products`}>상품 정보</Link></nav></section>
    {context.role === "agency_admin" && data.sources.length === 0 ? <section className="panel"><h2>로컬 테스트 자사몰 등록</h2><SiteSourceForm brandId={brandId} /></section> : null}
    <section className="knowledge-grid">{data.sources.map((source) => <article className="panel knowledge-card" key={source.id}><header><div><span className={`status-badge ${source.verification_status === "verified" ? "status-active" : "status-warning"}`}><span />{source.verification_status === "verified" ? "검증됨" : "검증 필요"}</span><h2>{source.is_primary ? "대표 자사몰" : "사이트 소스"}</h2></div></header><dl><div><dt>주소</dt><dd>{source.base_url}</dd></div><div><dt>플랫폼</dt><dd>{source.platform_type}</dd></div><div><dt>수집 페이지</dt><dd>{source.collected_page_count}개</dd></div><div><dt>최근 성공</dt><dd>{source.last_succeeded_at ? formatKoreanDate(source.last_succeeded_at) : "아직 없음"}</dd></div></dl>{context.role === "agency_admin" ? <CrawlButton brandId={brandId} sourceId={source.id} /> : <p className="readonly-note">전체 재수집은 대행사 관리자만 실행할 수 있습니다.</p>}</article>)}</section>
    <section className="panel"><div className="panel-title"><div><h2>최근 수집 작업</h2><span>robots.txt와 sitemap도 동일한 보안 전송 정책을 사용합니다.</span></div></div>{data.runs.length === 0 ? <p className="empty-copy">아직 실행한 수집 작업이 없습니다.</p> : <div className="review-list">{data.runs.map((run) => <article key={run.id}><strong>{run.status === "completed" ? "수집 완료" : run.status}</strong><span>발견 {run.discovered_count} · 저장 {run.collected_count} · 차단 {run.blocked_count} · 실패 {run.failed_count}</span><small>{formatKoreanDate(run.created_at)}</small></article>)}</div>}</section></main>;
}
