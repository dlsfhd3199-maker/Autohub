import { requireBrandPermission } from "@/modules/authorization/server";

export type EvidenceSource = { id: string; title: string; official_url: string; evidence_text: string; content_hash: string; is_active: boolean; updated_at: string };
export async function getBrandKnowledge(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "edit");
  const [{ data: profile, error: profileError }, { data: sources, error: sourcesError }] = await Promise.all([
    supabase.from("brand_knowledge_profiles").select("introduction,target_audience,tone,prohibited_expressions,default_cta,product_info,updated_at").eq("brand_id", brandId).maybeSingle(),
    supabase.from("evidence_sources").select("id,title,official_url,evidence_text,content_hash,is_active,updated_at").eq("brand_id", brandId).order("updated_at", { ascending: false }),
  ]);
  if (profileError || sourcesError) throw profileError ?? sourcesError;
  return { profile, sources: (sources ?? []) as EvidenceSource[] };
}
