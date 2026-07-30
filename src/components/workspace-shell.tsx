"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { signOut } from "@/modules/auth/actions";

const navigation = [
  { href: "/workspace/brands", label: "브랜드 관리", description: "브랜드와 연결 정보", icon: "brand" as const },
  { href: "/workspace/people", label: "담당자 및 배정", description: "역할과 브랜드 접근", icon: "people" as const },
  { href: "/workspace/content", label: "콘텐츠", description: "목록과 콘텐츠 스튜디오", icon: "content" as const },
  { href: "/workspace/ai-settings", label: "AI 설정", description: "공급자 상태와 안전 설정", icon: "ai" as const },
  { href: "/workspace/integrations", label: "연동 관리", description: "브랜드별 플랫폼 연결", icon: "integration" as const },
  { href: "/workspace/publishing", label: "발행 관리", description: "버전과 발행 대상", icon: "publish" as const },
  { href: "/workspace/publishing-diagnostics", label: "발행 진단", description: "HTML과 구조화 데이터", icon: "diagnostic" as const },
];

export function WorkspaceShell({ children, context, counts }: { children: React.ReactNode; context: { displayName: string; role: "agency_admin" | "ae" | "advertiser"; organizationName: string }; counts: { brands: number; contents: number } }) {
  const pathname = usePathname(); const [open,setOpen]=useState(false);
  const roleLabel={agency_admin:"대행사 관리자",ae:"AE",advertiser:"광고주"}[context.role];
  return <div className="app-shell"><button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="workspace-sidebar" onClick={()=>setOpen((value)=>!value)}><Icon name={open?"close":"menu"}/><span>{open?"메뉴 닫기":"메뉴 열기"}</span></button>{open&&<button className="sidebar-backdrop" type="button" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}<aside className={`sidebar ${open?"is-open":""}`} id="workspace-sidebar"><div className="brand-lockup"><span className="brand-mark">A</span><span><strong>AEO Hub</strong><small>콘텐츠 운영 워크스페이스</small></span></div><div className="workspace-identity"><small>가상 워크스페이스</small><strong>{context.organizationName}</strong><span>대행사 운영 공간</span></div><nav aria-label="주요 메뉴">{navigation.map((item)=>{const active=pathname.startsWith(item.href);return <Link className={`nav-item ${active?"active":""}`} aria-current={active?"page":undefined} href={item.href} key={item.href} title={item.description} onClick={()=>setOpen(false)}><Icon name={item.icon}/><span><strong>{item.label}</strong><small>{item.description}</small></span></Link>})}</nav><div className="workspace-stats" aria-label="워크스페이스 현황"><div><strong>{counts.brands}</strong><span>접근 브랜드</span></div><div><strong>{counts.contents}</strong><span>콘텐츠</span></div></div></aside><div className="workspace"><header className="topbar"><span><small>가상 워크스페이스</small><strong>{context.organizationName}</strong></span><span className="user-summary"><span className="user-avatar" aria-hidden="true">{context.displayName.slice(0,1)}</span><span className="user-copy"><strong>{context.displayName}</strong><small>{roleLabel}</small></span><form action={signOut}><button className="link-button" type="submit">로그아웃</button></form></span></header>{children}</div></div>;
}
