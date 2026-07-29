import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentDocument } from "../../../components/content-document";
import { ContentHubFailure } from "../../../components/content-hub-state";
import { ContentHubError, getPublishedDetail, getPublishedList, storeBaseUrl } from "../../../lib/content-hub";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params; const data = await getPublishedDetail(slug); if (!data.item) return {};
    return { title: data.item.title, description: data.item.document.metadata.description, alternates: { canonical: `${storeBaseUrl()}/blog/${data.item.slug}` }, openGraph: { title: data.item.title, description: data.item.document.metadata.description, type: "article", publishedTime: data.item.publishedAt, modifiedTime: data.item.updatedAt } };
  } catch { return {}; }
}

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try { data = await getPublishedDetail(slug); } catch (error) { if (error instanceof ContentHubError && error.code === "not_found") notFound(); return <ContentHubFailure error={error} />; }
  if (!data.item) notFound();
  const item = data.item;
  const faqBlock = item.document.blocks.find((block) => block.type === "faq") as { items?: Array<{ question?: string; answer?: string }> } | undefined;
  const articleJsonLd = { "@context": "https://schema.org", "@type": "Article", headline: item.title, description: item.document.metadata.description, datePublished: item.publishedAt, dateModified: item.updatedAt, mainEntityOfPage: `${storeBaseUrl()}/blog/${item.slug}`, author: { "@type": "Organization", name: data.brand.name }, publisher: { "@type": "Organization", name: data.brand.name } };
  const breadcrumbJsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: storeBaseUrl() }, { "@type": "ListItem", position: 2, name: "콘텐츠", item: `${storeBaseUrl()}/blog` }, { "@type": "ListItem", position: 3, name: item.title, item: `${storeBaseUrl()}/blog/${item.slug}` }] };
  const faqJsonLd = faqBlock?.items?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqBlock.items.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) } : null;
  const related = (await getPublishedList()).items.filter((candidate) => candidate.id !== item.id).slice(0, 3);
  return <main className="article-page"><nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">홈</Link><span>/</span><Link href="/blog">콘텐츠</Link><span>/</span><span>{item.title}</span></nav><article><header className="article-header"><span className="test-badge">로컬 테스트 발행 · v{item.versionNo}</span><h1>{item.title}</h1><p>{item.document.metadata.description}</p><dl><div><dt>게시일</dt><dd><time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString("ko-KR")}</time></dd></div><div><dt>수정일</dt><dd><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString("ko-KR")}</time></dd></div></dl></header><ContentDocument blocks={item.document.blocks} /></article>{related.length > 0 && <aside className="related-content"><h2>관련 콘텐츠</h2><div>{related.map((candidate) => <Link key={candidate.id} href={`/blog/${candidate.slug}`}>{candidate.title}<span>읽기 →</span></Link>)}</div></aside>}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />{faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}</main>;
}
