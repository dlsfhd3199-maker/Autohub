import Link from "next/link";
import { Icon } from "@/components/icons";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { getBrand } from "@/modules/brands/queries";
import { getSafeConnectionSummaries } from "@/modules/publishing/management";
import { listPublishingConnectors } from "@/modules/publishing-connectors/registry";

const labels: Record<string, string> = { "local-test-store": "로컬 테스트 자사몰", "html-export": "HTML 내보내기", cafe24: "Cafe24 범용 커넥터", "cafe24-board-blog": "Cafe24 블로그 게시판", "custom-api": "Custom API" };

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const [brand, context, summaries] = await Promise.all([getBrand(brandId), getWorkspaceContext(), getSafeConnectionSummaries(brandId)]);
  const byProvider = new Map(summaries.map((item) => [item.provider, item]));
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}`}>← {brand.name}</Link>
    <section className="page-heading"><div><p className="eyebrow">BRAND INTEGRATIONS</p><h1>연동 관리</h1><p>{context.role === "agency_admin" ? "플랫폼별 연결 상태와 지원 기능을 관리합니다." : "권한에 허용된 안전한 연결 요약만 표시합니다."}</p></div></section>
    <div className="connector-grid">{listPublishingConnectors().map((connector) => { const summary = byProvider.get(connector.id); const cafe = connector.id === "cafe24" || connector.id === "cafe24-board-blog"; const board = connector.id === "cafe24-board-blog"; return <article className="connector-card panel" key={connector.id}><header><Icon name="integration"/><div><h2>{labels[connector.id]}</h2><span className={`status-badge ${summary?.status === "connected" && !cafe ? "status-active" : "status-archived"}`}>{summary?.status === "connected" && !cafe ? "연결됨" : cafe ? "설치 전" : "연결 안 됨"}</span></div></header>
      <p>{board ? "카페24 연결 준비 중 · 실제 쇼핑몰 미연결 상태입니다. 블로그 전용 게시판 설치 후에만 사용할 수 있습니다." : connector.id === "cafe24" ? "범용 Cafe24 커넥터 자리표시자입니다. OAuth와 외부 API 요청을 수행하지 않습니다." : connector.id === "local-test-store" ? "현재 로컬 테스트몰과 서버 전용 키로 연결됩니다." : "플랫폼 독립 발행 계약을 위한 안전한 연결 항목입니다."}</p>
      <div className="capability-list">{connector.capabilities.length ? connector.capabilities.map((item) => <span key={item}>{item}</span>) : <span>지원 기능 준비 중</span>}</div><dl><div><dt>마지막 점검</dt><dd>{summary?.lastVerifiedAt ? new Date(summary.lastVerifiedAt).toLocaleString("ko-KR") : "아직 점검하지 않음"}</dd></div><div><dt>공개 도메인</dt><dd>{summary?.publicDomain ?? "설정 안 됨"}</dd></div></dl>
      {cafe && <><div className="readonly-note"><Icon name="warning"/><span>외부 요청 0회 · 실제 설정값 저장 없음 · 연결됨 상태 변경 불가</span></div><button className="secondary-button" disabled>{board ? "블로그 게시판 커넥터 설치 전" : "Cafe24 커넥터 설치 전"}</button></>}
    </article>; })}</div>
  </main>;
}
