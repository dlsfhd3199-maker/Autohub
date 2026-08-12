import Link from "next/link";
import { AiGenerationWorkspace } from "@/components/ai-generation-workspace";
import { PocWorkflow } from "@/components/poc-workflow";
import { getBrand } from "@/modules/brands/queries";
import { getApprovedGenerationContext } from "@/modules/ai-generation/approved-context";

export default async function GeneratePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params; let result = null;
  try { result = await Promise.all([getBrand(brandId), getApprovedGenerationContext(brandId)]); } catch { result = null; }
  if (!result) return <main className="workspace-content"><h1>접근 권한이 없습니다</h1><Link href="/workspace/brands">브랜드 목록으로</Link></main>;
  const [brand, approved] = result;
  const products = approved.products.map((product) => ({ ...product, name: String(product.name ?? "승인 대기 상품"), summary: String(product.description ?? "승인된 설명 없음") }));
  return <main className="workspace-content"><Link className="back-link" href={`/workspace/brands/${brandId}/ai-settings`}>← AI 콘텐츠 설정</Link><PocWorkflow active={2} brandId={brandId} /><section className="page-heading"><div><p className="eyebrow">GENERATION POC</p><h1>{brand.name} 데모 콘텐츠 생성</h1><p>승인된 공식 지식과 최신 상품 스냅샷만 사용해 기획안과 구조화 초안을 만듭니다.</p></div><div className="generation-source-summary"><strong>승인 근거 {approved.evidence.length}개</strong><span>상품 {products.length}개</span>{approved.omittedHighRisk.length ? <small>광고주 확인 전 고위험 사실 {approved.omittedHighRisk.length}개 제외</small> : null}</div></section><AiGenerationWorkspace brandId={brandId} sources={approved.evidence.map((source) => ({ id: source.id, title: source.title, official_url: source.officialUrl }))} products={products} /></main>;
}
