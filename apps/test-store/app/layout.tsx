import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Virtual Store Journal", template: "%s | Virtual Store Journal" }, description: "AEO Content Hub 로컬 테스트 자사몰" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><header className="site-header"><div className="site-header-inner"><Link className="store-brand" href="/blog"><span>V</span><strong>Virtual Store</strong></Link><nav aria-label="주요 메뉴"><Link href="/blog">콘텐츠</Link></nav><em>로컬 테스트 자사몰</em></div></header>{children}<footer><div><strong>Virtual Store</strong><p>실제 고객사나 실제 발행 환경이 아닌 로컬 PoC 화면입니다.</p></div></footer></body></html>;
}
