import Link from "next/link";
import { getPublishedList } from "../../lib/content-hub";
import { ContentHubFailure } from "../../components/content-hub-state";

export const revalidate = 60;
export const dynamic = "force-dynamic";
const date = (value: string) => new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

export default async function BlogPage() {
  let data;
  try { data = await getPublishedList(); } catch (error) { return <ContentHubFailure error={error} />; }
  return <main>
    <section className="blog-hero"><div><p className="eyebrow">VIRTUAL STORE JOURNAL</p><h1>블로그</h1><p>가상 상품과 공식 근거를 바탕으로 만든 읽을거리를 만나보세요. Content Hub에서 확정하고 테스트 발행한 버전만 공개됩니다.</p></div><aside><strong>{data.items.length}</strong><span>개의 가상 콘텐츠</span></aside></section>
    <nav className="category-tabs" aria-label="블로그 카테고리"><span className="active">전체</span><span>가이드</span><span>체크리스트</span><span>Virtual Collection</span></nav>
    <section className="content-grid" aria-label="테스트 발행 콘텐츠 목록">{data.items.length ? data.items.map((item, index) => <article className="content-card" key={item.id}>
      <Link className={`card-visual visual-${index % 4}`} href={`/blog/${item.slug}`} aria-label={`${item.title} 읽기`}><span>VIRTUAL<br/>JOURNAL</span></Link>
      <div className="card-body"><span className="category-label">{item.primaryKeyword || "가상 가이드"}</span><h2><Link href={`/blog/${item.slug}`}>{item.title}</Link></h2><p>{item.document.metadata.description || "가상 브랜드의 공식 근거를 바탕으로 작성한 콘텐츠입니다."}</p><dl><div><dt>게시일</dt><dd><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time></dd></div><div><dt>수정일</dt><dd><time dateTime={item.updatedAt}>{date(item.updatedAt)}</time></dd></div></dl><Link className="read-link" href={`/blog/${item.slug}`}>자세히 읽기 <span aria-hidden="true">→</span></Link></div>
    </article>) : <div className="empty-state"><h2>아직 공개된 블로그 콘텐츠가 없습니다</h2><p>Content Hub에서 명시적 버전을 테스트 발행하면 이 목록에 표시됩니다.</p></div>}</section>
  </main>;
}
