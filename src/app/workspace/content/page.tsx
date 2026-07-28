import Link from "next/link";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { listAccessibleContent } from "@/modules/content/queries";
import { parseContentSearch } from "@/modules/content/search";

type Params = Promise<Record<string, string | string[] | undefined>>;
type NamedValue = { id: string; name?: string; display_name?: string } | { id: string; name?: string; display_name?: string }[] | null;
const one = (value: NamedValue) => Array.isArray(value) ? value[0] : value;

export default async function ContentPage({ searchParams }: { searchParams: Params }) {
  const raw = await searchParams;
  const search = parseContentSearch(raw);
  const [result, brands] = await Promise.all([listAccessibleContent(search), listAccessibleBrands()]);
  const queryForPage = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: search.q, brandId: search.brandId, status: search.status, ownerId: search.ownerId, page: String(page) })) if (value) params.set(key, value);
    return `/workspace/content?${params}`;
  };
  return <main className="workspace-content"><section className="page-heading"><div><p className="eyebrow">CONTENT WORKFLOW</p><h1>콘텐츠 관리</h1><p>접근 가능한 브랜드의 콘텐츠를 검색하고 상태를 확인합니다.</p></div></section>
    <form className="filter-bar"><label className="search-field"><span className="sr-only">제목 또는 키워드</span><input name="q" defaultValue={search.q} placeholder="제목 또는 키워드 검색" /></label><label><span className="sr-only">브랜드</span><select name="brandId" defaultValue={search.brandId ?? ""}><option value="">전체 브랜드</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label><label><span className="sr-only">상태</span><select name="status" defaultValue={search.status ?? ""}><option value="">전체 상태</option><option value="draft">초안</option><option value="review_requested">검수 요청</option><option value="client_review">광고주 검수</option><option value="approved">승인</option><option value="published">발행 완료</option></select></label><button>검색</button></form>
    <section className="panel content-panel"><div className="panel-title"><h2>총 {result.total}개 콘텐츠</h2><span>최근 수정일 순</span></div>{result.items.length === 0 ? <div className="state-card flat"><h3>검색 결과가 없습니다.</h3><p>검색어나 필터를 변경해 보세요.</p></div> : <div className="content-list">{result.items.map((item) => { const brand = one(item.brands as NamedValue); const owner = one(item.profiles as NamedValue); const version = one(item.content_versions as NamedValue & { version_no?: number }); return <article key={item.id}><span className="brand-tag">{brand?.name ?? "Virtual Brand"}</span><div><h3>{item.title}</h3><p>{item.slug} · 최신 버전 {version && "version_no" in version ? `v${version.version_no}` : "없음"}</p></div><span className={`status status-${item.status}`}>{item.status}</span><span className="owner-cell">{owner?.display_name ?? "담당자 미지정"}<small>{new Date(item.updated_at).toLocaleDateString("ko-KR")}</small></span></article>; })}</div>}
      <nav className="pagination" aria-label="페이지 이동"><Link aria-disabled={result.page <= 1} href={queryForPage(Math.max(1, result.page - 1))}>이전</Link><span>{result.page} / {result.pageCount}</span><Link aria-disabled={result.page >= result.pageCount} href={queryForPage(Math.min(result.pageCount, result.page + 1))}>다음</Link></nav></section>
  </main>;
}
