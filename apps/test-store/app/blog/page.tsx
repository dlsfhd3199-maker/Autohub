import Link from "next/link";
import { getPublishedList } from "../../lib/content-hub";
import { ContentHubFailure } from "../../components/content-hub-state";

export const revalidate = 60;
export const dynamic = "force-dynamic";
export default async function BlogPage() {
  let data;
  try { data = await getPublishedList(); } catch (error) { return <ContentHubFailure error={error} />; }
  return <main><section className="blog-hero"><p className="eyebrow">VIRTUAL JOURNAL</p><h1>{data.brand.name} 콘텐츠</h1><p>공식 근거를 바탕으로 작성하고 사람이 확정한 테스트 발행 콘텐츠입니다.</p></section><section className="content-grid" aria-label="테스트 발행 콘텐츠 목록">{data.items.length ? data.items.map((item) => <article className="content-card" key={item.id}><span className="test-badge">테스트 발행 · v{item.versionNo}</span><h2><Link href={`/blog/${item.slug}`}>{item.title}</Link></h2><p>{item.document.metadata.description || "가상 브랜드의 공식 근거 기반 콘텐츠입니다."}</p><div><span>{item.primaryKeyword || "가상 키워드"}</span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString("ko-KR")}</time></div><Link className="read-link" href={`/blog/${item.slug}`}>콘텐츠 읽기 →</Link></article>) : <div className="empty-state"><h2>아직 테스트 발행된 콘텐츠가 없습니다</h2><p>Content Hub에서 명시적 버전을 테스트 발행하면 최대 60초 이내에 표시됩니다.</p></div>}</section></main>;
}
