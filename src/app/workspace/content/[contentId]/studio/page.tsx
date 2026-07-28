import { ContentStudio } from "@/components/content-studio";
import { getContentStudio } from "@/modules/content-studio/server";
import { contentStatusLabel } from "@/modules/content/display";
import { Icon } from "@/components/icons";
import Link from "next/link";

export default async function StudioPage({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  let data;
  try {
    data = await getContentStudio(contentId);
  } catch { return <main className="workspace-content"><div className="state-card"><span className="state-icon"><Icon name="warning" /></span><h1>접근 권한이 없습니다</h1><p>이 콘텐츠가 배정된 브랜드에 속하는지 확인해 주세요.</p><Link className="secondary-button" href="/workspace/content">콘텐츠 목록으로</Link></div></main>; }
  return <main className="workspace-content studio-page"><Link className="back-link" href="/workspace/content">← 콘텐츠 목록</Link><section className="page-heading studio-heading"><div><p className="eyebrow">CONTENT STUDIO</p><h1>{data.content.title}</h1><p>{data.canEdit ? "AEO/GEO 구조화 블록을 작성하고 버전을 관리합니다." : "승인된 콘텐츠와 버전 이력을 읽기 전용으로 확인합니다."}</p></div><span className={`status-badge status-${data.content.status}`}>{contentStatusLabel[data.content.status] ?? data.content.status}</span></section>{!data.canEdit && <div className="readonly-banner"><Icon name="warning" /><span><strong>읽기 전용</strong> 광고주는 콘텐츠와 버전 이력을 확인할 수 있지만 변경할 수 없습니다.</span></div>}<ContentStudio key={data.draft?.id ?? "readonly"} contentId={contentId} initialTitle={data.content.title} initialKeyword={data.content.primary_keyword} initialDraft={data.draft} history={data.history} canEdit={data.canEdit} /></main>;
}
