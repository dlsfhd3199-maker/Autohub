import Link from "next/link";
import { signOut } from "@/modules/auth/actions";
import { getWorkspaceContext } from "@/modules/auth/workspace";

const roleLabel = { agency_admin: "관리자", ae: "AE", advertiser: "광고주" } as const;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const context = await getWorkspaceContext();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark">A</span><span><strong>AEO Hub</strong><small>콘텐츠 인텔리전스 플랫폼</small></span></div>
        <div className="workspace-identity"><small>AGENCY WORKSPACE</small><strong>{context.organizationName}</strong></div>
        <nav aria-label="주요 메뉴">
          <Link className="nav-item" href="/workspace/brands">◇ 브랜드 관리</Link>
          <Link className="nav-item" href="/workspace/people">◎ 담당자 및 배정</Link>
          <Link className="nav-item" href="/workspace/content">▤ 콘텐츠</Link>
        </nav>
        <div className="phase-note">체크포인트 3<br />브랜드·담당자·콘텐츠 목록</div>
      </aside>
      <div className="workspace">
        <header className="topbar"><span><small>AGENCY WORKSPACE</small><strong>{context.organizationName}</strong></span><span className="user-summary"><span>{context.displayName}</span><small>{roleLabel[context.role]}</small><form action={signOut}><button className="link-button" type="submit">로그아웃</button></form></span></header>
        {children}
      </div>
    </div>
  );
}
