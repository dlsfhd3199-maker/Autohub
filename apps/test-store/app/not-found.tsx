import Link from "next/link";
export default function NotFound() { return <main><div className="empty-state"><h1>콘텐츠를 찾을 수 없습니다</h1><p>아직 테스트 발행되지 않았거나 다른 브랜드에 속한 콘텐츠입니다.</p><Link className="button-link" href="/blog">콘텐츠 목록으로</Link></div></main>; }
