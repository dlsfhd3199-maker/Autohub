import Link from "next/link";
import { BrandKnowledgeForm, EvidenceForm, EvidenceToggle } from "@/components/brand-ai-settings";
import { Icon } from "@/components/icons";
import { getBrandKnowledge } from "@/modules/brand-knowledge/queries";
import { getBrand } from "@/modules/brands/queries";

export default async function BrandAiSettingsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  let result: Awaited<ReturnType<typeof Promise.all<[ReturnType<typeof getBrand>, ReturnType<typeof getBrandKnowledge>]>>> | null = null;
  try { result = await Promise.all([getBrand(brandId), getBrandKnowledge(brandId)]); } catch { result = null; }
  if (!result) return <main className="workspace-content"><div className="state-card"><span className="state-icon"><Icon name="warning" /></span><h1>접근 권한이 없습니다</h1><p>이 브랜드에 배정된 관리자 또는 AE만 AI 콘텐츠 설정을 관리할 수 있습니다.</p><Link className="secondary-button" href="/workspace/brands">브랜드 목록으로</Link></div></main>;
  const [brand, knowledge] = result;
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}`}>← 브랜드 상세</Link>
      <section className="page-heading"><div><p className="eyebrow">AI CONTENT SETTINGS</p><h1>{brand.name} AI 콘텐츠 설정</h1><p>가상 브랜드 정보와 관리자가 확인한 공식 근거만 등록합니다. URL은 자동으로 수집하지 않습니다.</p></div><Link className="primary-button" href={`/workspace/brands/${brandId}/generate`}>콘텐츠 생성</Link></section>
      <section className="panel settings-panel"><div className="panel-title"><div><h2>브랜드·상품 정보</h2><span>AI 기획안과 초안에 공통으로 제공됩니다.</span></div></div><BrandKnowledgeForm brandId={brandId} profile={knowledge.profile as Record<string, unknown> | null} /></section>
      <section className="panel settings-panel"><div className="panel-title"><div><h2>공식 근거 자료</h2><span>{knowledge.sources.filter((source) => source.is_active).length}개 활성 근거</span></div></div><EvidenceForm brandId={brandId} />
        <div className="evidence-list">{knowledge.sources.length === 0 ? <div className="state-card flat"><span className="state-icon"><Icon name="content" /></span><h3>등록된 공식 근거가 없습니다</h3><p>가상 공식 URL과 직접 확인한 근거 텍스트를 등록해 주세요.</p></div> : knowledge.sources.map((source) => <article className={`evidence-card ${source.is_active ? "" : "is-inactive"}`} key={source.id}><div className="evidence-card-header"><div><span className={`status-badge ${source.is_active ? "status-active" : "status-archived"}`}><span />{source.is_active ? "활성" : "비활성"}</span><h3>{source.title}</h3><a href={source.official_url} target="_blank" rel="noreferrer">{source.official_url}</a></div><EvidenceToggle brandId={brandId} id={source.id} active={source.is_active} /></div><EvidenceForm brandId={brandId} source={source} /></article>)}</div>
      </section></main>;
}
