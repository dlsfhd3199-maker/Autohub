import { ContentStudio } from "@/components/content-studio";
import { getContentStudio } from "@/modules/content-studio/server";

export default async function StudioPage({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  let data;
  try {
    data = await getContentStudio(contentId);
  } catch { return <main className="workspace-content"><div className="state-card"><h1>권한 없음</h1><p>이 콘텐츠에 접근할 수 없습니다.</p></div></main>; }
  return <main className="workspace-content studio-page"><section className="page-heading"><div><p className="eyebrow">CONTENT STUDIO</p><h1>{data.content.title}</h1><p>{data.canEdit ? "구조화된 블록과 버전을 편집합니다." : "읽기 전용 콘텐츠와 버전 이력입니다."}</p></div><span className={`status status-${data.content.status}`}>{data.content.status}</span></section><ContentStudio key={data.draft?.id ?? "readonly"} contentId={contentId} initialTitle={data.content.title} initialKeyword={data.content.primary_keyword} initialDraft={data.draft} history={data.history} canEdit={data.canEdit} /></main>;
}
