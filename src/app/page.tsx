const foundationItems = [
  "Next.js App Router · TypeScript",
  "환경변수 스키마 검증",
  "Vitest · Playwright 테스트 기반",
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="주 내비게이션">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><strong>AEO Hub</strong><small>콘텐츠 운영 플랫폼</small></span>
        </div>
        <nav>
          <a className="nav-item active" href="#foundation">프로젝트 기반</a>
          <span className="nav-item disabled">브랜드 관리</span>
          <span className="nav-item disabled">콘텐츠</span>
          <span className="nav-item disabled">설정</span>
        </nav>
        <p className="phase-note">체크포인트 1 · 로컬 기반 구축</p>
      </aside>

      <section className="workspace" id="foundation">
        <header className="topbar">
          <span><small>AGENCY WORKSPACE</small><strong>프로젝트 기반</strong></span>
          <span className="status-pill">로컬 환경</span>
        </header>

        <div className="content-area">
          <p className="eyebrow">PHASE 1 FOUNDATION</p>
          <h1>콘텐츠 운영의 기반을 준비했습니다.</h1>
          <p className="lead">브랜드 격리, 권한, 콘텐츠 버전 관리를 안전하게 구현하기 위한 개발 환경입니다.</p>

          <div className="foundation-grid">
            {foundationItems.map((item, index) => (
              <article className="foundation-card" key={item}>
                <span className="card-index">0{index + 1}</span>
                <h2>{item}</h2>
                <p>다음 체크포인트에서 실제 데이터와 권한 모듈을 연결합니다.</p>
              </article>
            ))}
          </div>

          <section className="scope-card" aria-labelledby="scope-title">
            <div><p className="eyebrow">CURRENT SCOPE</p><h2 id="scope-title">외부 서비스 없이 로컬에서 검증 가능</h2></div>
            <ul>
              <li>실제 계정·브랜드·비밀키 없음</li>
              <li>Supabase와 Vercel 원격 프로젝트 미연결</li>
              <li>기능 개발은 작업 브랜치에서만 진행</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
