import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentDocument } from "../../../components/content-document";
import { ContentHubFailure } from "../../../components/content-hub-state";
import { ContentHubError, getPublishedDetail, getPublishedList } from "../../../lib/content-hub";

export const revalidate = 60;
export const dynamic = "force-dynamic";
const date = (value: string) => new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try { const data = await getPublishedDetail((await params).slug); if (!data.item) return {}; const document = data.item.publishDocument; return { title: document.title, description: document.description, alternates: { canonical: document.canonical }, openGraph: { title: document.title, description: document.description, type: "article", publishedTime: document.publishedAt, modifiedTime: document.modifiedAt } }; } catch { return {}; }
}

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try { data = await getPublishedDetail(slug); } catch (error) { if (error instanceof ContentHubError && error.code === "not_found") notFound(); return <ContentHubFailure error={error} />; }
  if (!data.item) notFound();
  const item = data.item; const document = item.publishDocument;
  const related = (await getPublishedList()).items.filter((candidate) => candidate.id !== item.id).slice(0, 3);
  return <main className="article-page">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">홈</Link><span>/</span><Link href="/blog">블로그</Link><span>/</span><span>{item.title}</span></nav>
    <div className="article-layout"><article><header className="article-header"><span className="category-label">{item.primaryKeyword || "가상 가이드"}</span><h1>{document.title}</h1><p>{document.description}</p><dl><div><dt>게시일</dt><dd><time dateTime={document.publishedAt}>{date(document.publishedAt)}</time></dd></div><div><dt>수정일</dt><dd><time dateTime={document.modifiedAt}>{date(document.modifiedAt)}</time></dd></div><div><dt>버전</dt><dd>확정 v{item.versionNo}</dd></div></dl></header><ContentDocument blocks={item.document.blocks} safeHtml={document.bodyHtml} /></article>
      <aside className="article-sidebar"><div><span>VIRTUAL STORE</span><strong>공식 근거 기반<br/>가상 콘텐츠</strong><p>현재 화면은 카페24 전용 게시판 적용 전 로컬 미리보기입니다.</p></div><Link href="/blog">블로그 목록으로</Link></aside>
    </div>
    {document.relatedProducts.length > 0 && <section className="related-products"><div className="section-title"><div><p className="eyebrow">RELATED PRODUCTS</p><h2>관련 가상 상품</h2></div><span>실제 판매 상품이 아닌 연동 검수용 데이터입니다.</span></div><div className="product-grid">{document.relatedProducts.map((product, index) => <article key={product.id}><div className={`product-visual visual-${index + 1}`}><span>VIRTUAL<br/>PRODUCT</span></div><span className="category-label">{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><a href={product.url} rel="noreferrer">자사몰 상품 보기 →</a></article>)}</div></section>}
    {related.length > 0 && <aside className="related-content"><div className="section-title"><div><p className="eyebrow">MORE STORIES</p><h2>관련 콘텐츠</h2></div></div><div>{related.map((candidate) => <Link key={candidate.id} href={`/blog/${candidate.slug}`}><span>{candidate.primaryKeyword || "가상 가이드"}</span><strong>{candidate.title}</strong><small>읽기 →</small></Link>)}</div></aside>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.articleJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.breadcrumbJsonLd) }} />
    {document.faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.faqJsonLd) }} />}
  </main>;
}
