import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentDocument } from "../../../components/content-document";
import { ContentHubFailure } from "../../../components/content-hub-state";
import { ContentHubError, getPublishedDetail, getPublishedList } from "../../../lib/content-hub";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const data = await getPublishedDetail(slug);
    if (!data.item) return {};
    const document = data.item.publishDocument;
    return { title: document.title, description: document.description, alternates: { canonical: document.canonical }, openGraph: { title: document.title, description: document.description, type: "article", publishedTime: document.publishedAt, modifiedTime: document.modifiedAt } };
  } catch { return {}; }
}

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try { data = await getPublishedDetail(slug); }
  catch (error) { if (error instanceof ContentHubError && error.code === "not_found") notFound(); return <ContentHubFailure error={error} />; }
  if (!data.item) notFound();
  const item = data.item;
  const document = item.publishDocument;
  const related = (await getPublishedList()).items.filter((candidate) => candidate.id !== item.id).slice(0, 3);
  return <main className="article-page">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">홈</Link><span>/</span><Link href="/blog">콘텐츠</Link><span>/</span><span>{item.title}</span></nav>
    <article><header className="article-header"><span className="test-badge">로컬 테스트 발행 · v{item.versionNo}</span><h1>{document.title}</h1><p>{document.description}</p><dl><div><dt>게시일</dt><dd><time dateTime={document.publishedAt}>{new Date(document.publishedAt).toLocaleDateString("ko-KR")}</time></dd></div><div><dt>수정일</dt><dd><time dateTime={document.modifiedAt}>{new Date(document.modifiedAt).toLocaleDateString("ko-KR")}</time></dd></div></dl></header><ContentDocument blocks={item.document.blocks} safeHtml={document.bodyHtml} /></article>
    {related.length > 0 && <aside className="related-content"><h2>관련 콘텐츠</h2><div>{related.map((candidate) => <Link key={candidate.id} href={`/blog/${candidate.slug}`}>{candidate.title}<span>읽기 →</span></Link>)}</div></aside>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.articleJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.breadcrumbJsonLd) }} />
    {document.faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(document.faqJsonLd) }} />}
  </main>;
}
