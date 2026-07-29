import Link from "next/link";
import { AiGenerationWorkspace } from "@/components/ai-generation-workspace";
import { PocWorkflow } from "@/components/poc-workflow";
import { getBrandKnowledge } from "@/modules/brand-knowledge/queries";
import { getBrand } from "@/modules/brands/queries";

export default async function GeneratePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params; let result = null;
  try { result = await Promise.all([getBrand(brandId), getBrandKnowledge(brandId)]); } catch { result = null; }
  if (!result) return <main className="workspace-content"><h1>접근 권한이 없습니다</h1><Link href="/workspace/brands">브랜드 목록으로</Link></main>;
  const [brand, knowledge] = result;
  const products = Array.isArray((knowledge.profile as Record<string, unknown> | null)?.product_info) ? (knowledge.profile as Record<string, unknown>).product_info as Array<{ name: string; summary: string }> : [];
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}/ai-settings`}>← AI 콘텐츠 설정</Link><PocWorkflow active={2} brandId={brandId} /><section className="page-heading"><div><p className="eyebrow">GENERATION POC</p><h1>{brand.name} 데모 콘텐츠 생성</h1><p>등록된 가상 공식 근거만 사용해 기획안과 구조화 초안을 만듭니다.</p></div></section><AiGenerationWorkspace brandId={brandId} sources={knowledge.sources.filter((source) => source.is_active)} products={products} /></main>;
}
