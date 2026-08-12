import { requireBrandPermission } from "@/modules/authorization/server";

export async function getSiteKnowledge(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "read");
  const [sources, runs, documents, facts, products] = await Promise.all([
    supabase.from("brand_site_sources").select("id,base_url,platform_type,is_primary,status,verification_status,verification_method,sitemap_url,robots_result,collected_page_count,last_crawled_at,last_succeeded_at,safe_error_code,safe_error_message").eq("brand_id", brandId).order("created_at"),
    supabase.from("crawl_runs").select("id,source_id,status,discovered_count,collected_count,blocked_count,failed_count,created_at,completed_at,safe_error_code").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(10),
    supabase.from("source_documents").select("id,source_url,final_url,canonical_url,page_type,title,visible_text,content_hash,collected_at").eq("brand_id", brandId).order("collected_at", { ascending: false }).limit(100),
    supabase.from("brand_knowledge_facts").select("id,source_document_id,source_url,fact_type,fact_key,fact_value,risk_level,status,reviewed_by_role,reviewed_at,approval_note,agency_reviewed_at,advertiser_reviewed_at,created_at").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(200),
    supabase.from("brand_products").select("id,source_document_id,product_key,name,official_url,description,price,currency,inventory_status,rating,review_count,image_url,image_alt,field_review_status,status,reviewed_by_role,reviewed_at,approval_note,agency_reviewed_at,advertiser_reviewed_at,created_at").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(100),
  ]);
  const error = sources.error ?? runs.error ?? documents.error ?? facts.error ?? products.error;
  if (error) throw new Error("사이트 지식 데이터를 불러오지 못했습니다.");
  return { sources: sources.data ?? [], runs: runs.data ?? [], documents: documents.data ?? [], facts: facts.data ?? [], products: products.data ?? [] };
}
