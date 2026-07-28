import Link from "next/link";

const features = ["브랜드별 데이터 격리", "담당자 및 역할 관리", "콘텐츠 검색과 필터"];
export default function Home() {
  return <main className="app-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-mark">A</span><span><strong>AEO Hub</strong><small>콘텐츠 인텔리전스 플랫폼</small></span></div><nav><span className="nav-item active">체크포인트 3</span><span className="nav-item disabled">콘텐츠 스튜디오</span><span className="nav-item disabled">발행 관리</span></nav></aside><section className="workspace"><header className="topbar"><span><small>AGENCY WORKSPACE</small><strong>AEO Content Hub</strong></span><Link className="status-pill" href="/login">로그인</Link></header><div className="content-area"><p className="eyebrow">PHASE 1 · CHECKPOINT 3</p><h1>브랜드 운영을 위한 안전한 워크스페이스</h1><p className="lead">조직과 브랜드 범위를 서버와 PostgreSQL RLS에서 함께 검증합니다.</p><div className="foundation-grid">{features.map((feature, index) => <article className="foundation-card" key={feature}><span className="card-index">0{index + 1}</span><h2>{feature}</h2><p>역할별 최소 권한과 가상 데이터로 검증되는 관리 기능입니다.</p></article>)}</div></div></section></main>;
}
