import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Virtual Store", template: "%s | Virtual Store" }, description: "일반 쇼핑몰 안에 블로그 탭을 적용한 로컬 가상 테스트 화면" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>
    <div className="utility-bar"><div>Virtual Store 로컬 쇼핑몰 미리보기 <span>실제 주문·결제 없음</span></div></div>
    <header className="site-header"><div className="site-header-inner">
      <Link className="store-brand" href="/"><span>V</span><strong>Virtual Store</strong><small>VIRTUAL LIFESTYLE SHOP</small></Link>
      <nav aria-label="쇼핑몰 주요 메뉴"><a href="https://example.com/products">상품</a><a href="https://example.com/collections">기획전</a><Link className="active" aria-current="page" href="/blog">블로그</Link><a href="https://example.com/about">브랜드</a></nav>
      <div className="header-actions" aria-label="쇼핑몰 바로가기"><a href="https://example.com/search" aria-label="검색">⌕</a><a href="https://example.com/account" aria-label="마이페이지">○</a><a href="https://example.com/cart" aria-label="장바구니">Bag</a></div>
    </div></header>
    {children}
    <footer><div className="footer-grid"><div><strong>Virtual Store</strong><p>카페24 블로그 게시판 적용을 검수하는 로컬 가상 쇼핑몰입니다.</p></div><div><strong>고객 안내</strong><p>실제 상품·회원·주문 데이터는 사용하지 않습니다.</p></div></div></footer>
  </body></html>;
}
