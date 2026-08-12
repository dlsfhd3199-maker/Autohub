"use server";

import { revalidatePath } from "next/cache";
import { requireBrandPermission } from "@/modules/authorization/server";
import { runRegisteredCrawl } from "./runner";
import { crawlRequestSchema, reviewInputSchema, siteSourceInputSchema } from "./schemas";

export type SiteActionState = { ok: boolean; message: string };
const safeFailure = (error: unknown): SiteActionState => ({ ok: false, message: error instanceof Error ? error.message : "요청을 안전하게 처리하지 못했습니다." });

export async function registerLocalSiteSource(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  try {
    const input = siteSourceInputSchema.parse({ brandId: formData.get("brandId"), baseUrl: formData.get("baseUrl"), isPrimary: formData.get("isPrimary") === "true" });
    const { supabase, userId } = await requireBrandPermission(input.brandId, "manage");
    if (process.env.NODE_ENV === "production" || process.env.CRAWLER_LOCAL_TEST_ENABLED !== "true") return { ok: false, message: "로컬 테스트 수집 기능이 비활성화되어 있습니다." };
    if (input.isPrimary) await supabase.from("brand_site_sources").update({ is_primary: false, updated_by: userId }).eq("brand_id", input.brandId);
    const { error } = await supabase.from("brand_site_sources").insert({ brand_id: input.brandId, base_url: input.baseUrl, allowed_domains: ["127.0.0.1"], platform_type: "local-test-store", is_primary: input.isPrimary, status: "ready", verification_status: "verified", verification_method: "local-test-exception", verified_at: new Date().toISOString(), verified_by: userId, created_by: userId, updated_by: userId });
    if (error?.code === "23505") return { ok: false, message: "이미 등록된 테스트 자사몰 주소입니다." };
    if (error) throw error;
    revalidatePath(`/workspace/brands/${input.brandId}/site-crawl`);
    return { ok: true, message: "로컬 테스트 자사몰을 등록했습니다." };
  } catch (error) { return safeFailure(error); }
}

export async function startSiteCrawl(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  try {
    const input = crawlRequestSchema.parse({ brandId: formData.get("brandId"), sourceId: formData.get("sourceId") });
    const result = await runRegisteredCrawl(input.brandId, input.sourceId);
    revalidatePath(`/workspace/brands/${input.brandId}/site-crawl`);
    revalidatePath(`/workspace/brands/${input.brandId}/knowledge`);
    revalidatePath(`/workspace/brands/${input.brandId}/products`);
    return { ok: true, message: `${result.collected}개 페이지를 수집했습니다.` };
  } catch (error) { return safeFailure(error); }
}

export async function reviewKnowledgeFact(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  try {
    const input = reviewInputSchema.parse({ brandId: formData.get("brandId"), itemId: formData.get("itemId"), decision: formData.get("decision"), note: formData.get("note") });
    const { supabase } = await requireBrandPermission(input.brandId, "read");
    const { data, error } = await supabase.from("brand_knowledge_facts").select("id").eq("id", input.itemId).eq("brand_id", input.brandId).maybeSingle();
    if (error || !data) return { ok: false, message: "검수할 사실을 찾을 수 없습니다." };
    const result = await supabase.rpc("review_brand_knowledge_fact", { target_fact_id: input.itemId, target_status: input.decision, target_note: input.note || null });
    if (result.error) throw result.error;
    revalidatePath(`/workspace/brands/${input.brandId}/knowledge`);
    return { ok: true, message: input.decision === "approved" ? "사실을 승인했습니다." : "사실을 반려했습니다." };
  } catch (error) { return safeFailure(error); }
}

export async function reviewProduct(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  try {
    const input = reviewInputSchema.parse({ brandId: formData.get("brandId"), itemId: formData.get("itemId"), decision: formData.get("decision"), note: formData.get("note") });
    const { supabase } = await requireBrandPermission(input.brandId, "read");
    const { data, error } = await supabase.from("brand_products").select("id,field_review_status").eq("id", input.itemId).eq("brand_id", input.brandId).maybeSingle();
    if (error || !data) return { ok: false, message: "검수할 상품을 찾을 수 없습니다." };
    const fieldStatus = input.decision === "approved" ? Object.fromEntries(Object.keys(data.field_review_status as object).map((key) => [key, "approved"])) : data.field_review_status;
    const result = await supabase.rpc("review_brand_product", { target_product_id: input.itemId, target_status: input.decision, target_note: input.note || null, target_field_status: fieldStatus });
    if (result.error) throw result.error;
    revalidatePath(`/workspace/brands/${input.brandId}/products`);
    return { ok: true, message: input.decision === "approved" ? "상품 정보를 승인했습니다." : "상품 정보를 반려했습니다." };
  } catch (error) { return safeFailure(error); }
}
