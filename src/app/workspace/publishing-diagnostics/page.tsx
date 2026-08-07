import Link from "next/link";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { getPublishingOverview, getSafeConnectionSummaries } from "@/modules/publishing/management";

async function localHealth() { try { const base = process.env.TEST_STORE_BASE_URL ?? "http://127.0.0.1:3100"; const response = await fetch(`${base}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) }); return response.ok ? "HTTP 200" : "HTTP 오류"; } catch { return "실행 중이 아님"; } }

export default async function Page({ searchParams }: { searchParams: Promise<{ brandId?: string }> }) {
  const brands = await listAccessibleBrands(); const requested = (await searchParams).brandId; const brandId = brands.some((brand) => brand.id === requested) ? requested : brands[0]?.id;
  if (!brandId) return <main className="workspace-content"><section className="state-card"><h1>진단할 브랜드가 없습니다</h1></section></main>;
  const [overview, connections, health] = await Promise.all([getPublishingOverview(brandId), getSafeConnectionSummaries(brandId), localHealth()]); const published = overview.contents.filter((item) => item.published_version_id);
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">PUBLICATION DIAGNOSTICS</p><h1>발행 진단</h1><p>로컬 결과와 플랫폼별 출력 책임을 비밀값 없이 확인합니다.</p></div></section>
    <nav className="brand-tabs" aria-label="브랜드 선택">{brands.map((brand) => <Link className={brand.id === brandId ? "active" : ""} href={`/workspace/publishing-diagnostics?brandId=${brand.id}`} key={brand.id}>{brand.name}</Link>)}</nav>
    <div className="diagnostic-grid"><section className="panel diagnostic-card"><h2>로컬 테스트 자사몰</h2><strong>{health}</strong><p>쇼핑몰 공통 헤더와 블로그 탭의 SSR 결과입니다.</p></section><section className="panel diagnostic-card"><h2>테스트 발행 콘텐츠</h2><strong>{published.length}건</strong><p>working draft와 미발행 버전은 외부 API에 노출되지 않습니다.</p></section><section className="panel diagnostic-card"><h2>Content Hub PublishDocument</h2><ul><li>안전한 본문 HTML</li><li>canonical·게시일·수정일</li><li>Article·BreadcrumbList·조건부 FAQPage</li><li>출처·CTA·관련 가상 상품</li></ul></section></div>
    <section className="panel section-panel"><h2>Cafe24 블로그 게시판 책임 분리</h2><div className="diagnostic-grid"><div><strong>게시물 API 본문 후보</strong><p>허용 목록으로 정제한 본문 HTML만 전달합니다.</p></div><div><strong>전용 상세 템플릿 후보</strong><p>canonical과 JSON-LD는 게시물 본문 보존을 가정하지 않고 템플릿에서 처리합니다.</p></div><div><strong>현재 상태</strong><p>카페24 연결 준비 중 · 실제 쇼핑몰 미연결 · 외부 요청 0회</p></div></div></section>
    <section className="panel section-panel"><h2>커넥터 점검</h2>{connections.map((item) => <p key={item.id}><strong>{item.provider}</strong> · {item.status} · 마지막 점검 {item.lastVerifiedAt ? new Date(item.lastVerifiedAt).toLocaleString("ko-KR") : "없음"}</p>)}<p><strong>cafe24-board-blog</strong> · 설치 전 · 실제 Cafe24 OAuth/API 미호출</p></section>
  </main>;
}
