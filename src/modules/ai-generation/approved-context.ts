import { requireBrandPermission } from "@/modules/authorization/server";
import { approvedProductFields } from "@/modules/site-crawl/changes";

export type ApprovedEvidence = { id: string; title: string; officialUrl: string; evidenceText: string; factId?: string; productSnapshotId?: string; sourceDocumentId?: string; sourceUrl: string; contentHash: string; approvedByRole: string; approvedAt: string };

export async function getApprovedGenerationContext(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "edit");
  const [factsResult, productsResult, manualResult] = await Promise.all([
    supabase.from("brand_knowledge_facts").select("id,source_document_id,source_url,fact_key,fact_value,fact_hash,risk_level,status,reviewed_by_role,reviewed_at,advertiser_reviewed_at").eq("brand_id", brandId).eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("brand_products").select("id,source_document_id,product_key,name,official_url,description,price,currency,inventory_status,rating,review_count,image_url,image_alt,product_hash,field_review_status,status,reviewed_by_role,reviewed_at,advertiser_reviewed_at,created_at").eq("brand_id", brandId).order("created_at", { ascending: false }),
    supabase.from("evidence_sources").select("id,title,official_url,evidence_text,content_hash,is_active,updated_at").eq("brand_id", brandId).eq("is_active", true),
  ]);
  const error = factsResult.error ?? productsResult.error ?? manualResult.error;
  if (error) throw new Error("승인된 생성 근거를 불러오지 못했습니다.");
  const omittedHighRisk: string[] = [];
  const facts: ApprovedEvidence[] = (factsResult.data ?? []).flatMap((fact) => {
    if (fact.risk_level !== "low" && !fact.advertiser_reviewed_at) { omittedHighRisk.push(fact.fact_key); return []; }
    return [{ id: fact.id, factId: fact.id, sourceDocumentId: fact.source_document_id, sourceUrl: fact.source_url, title: fact.fact_key, officialUrl: fact.source_url, evidenceText: typeof fact.fact_value === "string" ? fact.fact_value : JSON.stringify(fact.fact_value), contentHash: fact.fact_hash, approvedByRole: fact.reviewed_by_role ?? "unknown", approvedAt: fact.reviewed_at ?? "" }];
  });
  const latest = new Map<string, NonNullable<typeof productsResult.data>[number]>();
  for (const product of productsResult.data ?? []) if (!latest.has(product.product_key)) latest.set(product.product_key, product);
  const products = [...latest.values()].flatMap((product) => {
    if (product.status !== "approved" || !product.reviewed_at) return [];
    const fields = approvedProductFields({ productKey: product.product_key, name: product.name, officialUrl: product.official_url, description: product.description, price: product.price == null ? null : Number(product.price), currency: product.currency, inventoryStatus: product.inventory_status, rating: product.rating == null ? null : Number(product.rating), reviewCount: product.review_count, imageUrl: product.image_url, imageAlt: product.image_alt }, product.field_review_status);
    if (!fields.name || !fields.officialUrl) return [];
    if (!product.advertiser_reviewed_at) { fields.price = null; fields.currency = null; fields.inventoryStatus = null; }
    return [{ ...fields, snapshotId: product.id, sourceDocumentId: product.source_document_id, sourceUrl: product.official_url, contentHash: product.product_hash, approvedByRole: product.reviewed_by_role ?? "unknown", approvedAt: product.reviewed_at }];
  });
  const manual: ApprovedEvidence[] = (manualResult.data ?? []).map((item) => ({ id: item.id, title: item.title, officialUrl: item.official_url, evidenceText: item.evidence_text, sourceUrl: item.official_url, contentHash: item.content_hash, approvedByRole: "agency_admin", approvedAt: item.updated_at }));
  return { evidence: [...manual, ...facts], products, omittedHighRisk };
}

export function recommendContentIdeas(evidence: ApprovedEvidence[], products: Array<Record<string, unknown>>) {
  const productName = String(products[0]?.name ?? "가상 상품");
  const factTitle = evidence[0]?.title ?? "공식 정보";
  return [{ topic: `${productName} 선택 전에 확인할 공식 기준`, primaryKeyword: `${productName} 선택 기준`, question: `${productName}을 선택할 때 무엇을 확인해야 하나요?` }, { topic: `${factTitle} 핵심 안내`, primaryKeyword: factTitle.slice(0, 80), question: `${factTitle}의 적용 범위는 어디까지인가요?` }];
}

export function hasOnlySnapshotSources(sourceIds: string[], snapshot: Array<{ id: string }>) {
  const allowed = new Set(snapshot.map((item) => item.id));
  return sourceIds.every((id) => allowed.has(id));
}
