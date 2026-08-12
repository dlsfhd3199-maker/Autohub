import Link from "next/link";
import { FactReviewForm } from "@/components/site-knowledge-actions";
import { getBrand } from "@/modules/brands/queries";
import { formatKoreanDate } from "@/modules/content/display";
import { getSiteKnowledge } from "@/modules/site-crawl/queries";

const valueText = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value);
export default async function KnowledgePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params; const [brand, data] = await Promise.all([getBrand(brandId), getSiteKnowledge(brandId)]);
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}`}>← 브랜드 상세</Link><section className="page-heading"><div><p className="eyebrow">KNOWLEDGE REVIEW</p><h1>{brand.name} 브랜드 지식</h1><p>출처와 승인 주체를 확인한 사실만 생성 입력으로 사용할 수 있습니다.</p></div><nav className="section-nav" aria-label="사이트 지식 메뉴"><Link href={`/workspace/brands/${brandId}/site-crawl`}>사이트 수집</Link><Link aria-current="page" href={`/workspace/brands/${brandId}/knowledge`}>브랜드 지식</Link><Link href={`/workspace/brands/${brandId}/products`}>상품 정보</Link></nav></section>
    <section className="panel"><div className="panel-title"><div><h2>추출 사실 검수</h2><span>{data.facts.length}개 후보</span></div></div><div className="review-list">{data.facts.length === 0 ? <p className="empty-copy">수집된 사실 후보가 없습니다.</p> : data.facts.map((fact) => <article key={fact.id}><div className="review-copy"><div><span className={`status-badge status-${fact.status === "approved" ? "active" : fact.status === "rejected" ? "archived" : "warning"}`}><span />{fact.status === "approved" ? "승인" : fact.status === "rejected" ? "반려" : "검수 필요"}</span><span className="risk-badge">{fact.risk_level === "low" ? "저위험 사실" : "광고주 확인 필요"}</span></div><h3>{fact.fact_key}</h3><p>{valueText(fact.fact_value)}</p><a href={fact.source_url} target="_blank" rel="noreferrer">원문 근거 보기</a><small>{fact.agency_reviewed_at ? `대행사 검수 완료 · ${formatKoreanDate(fact.agency_reviewed_at)}` : "대행사 검수 전"} / {fact.advertiser_reviewed_at ? `광고주 확인 완료 · ${formatKoreanDate(fact.advertiser_reviewed_at)}` : "광고주 확인 전"}</small></div><FactReviewForm brandId={brandId} itemId={fact.id} /></article>)}</div></section></main>;
}
