import type { Metadata } from "next";
import Link from "next/link";
import { virtualOrganization } from "../lib/catalog";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Virtual Store", template: "%s | Virtual Store" }, description: "일반 쇼핑몰 안의 블로그 탭과 공식 상품 정보를 검증하는 로컬 가상 테스트몰" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = { "@context": "https://schema.org", "@type": "Organization", ...virtualOrganization };
  return <html lang="ko"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} /><div className="utility-bar"><div>Virtual Store 로컬 쇼핑몰 미리보기 <span>실제 주문·결제 없음</span></div></div><header className="site-header"><div className="site-header-inner"><Link className="store-brand" href="/"><span>V</span><strong>Virtual Store</strong><small>VIRTUAL LIFESTYLE SHOP</small></Link><nav aria-label="자사몰 주요 메뉴"><Link href="/products">상품</Link><Link href="/faq">FAQ</Link><Link className="active" href="/blog" aria-current="page">블로그</Link><Link href="/about">브랜드</Link></nav><div className="header-actions" aria-label="바로가기"><a href="https://example.com/search" aria-label="검색">⌕</a><a href="https://example.com/account" aria-label="계정">⌁</a><a href="https://example.com/cart" aria-label="장바구니">Bag</a></div></div></header>{children}<footer><div className="footer-grid"><div><strong>Virtual Store</strong><p>가상 브랜드 · 가상 상품 · example.com 데이터만 사용합니다.</p></div><div><strong>로컬 테스트 안내</strong><p>실제 상품·회원·주문 데이터는 사용하지 않습니다.</p></div></div></footer></body></html>;
}
