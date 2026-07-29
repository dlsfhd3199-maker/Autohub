import { requireBrandPermission } from "@/modules/authorization/server";

export async function getPublishingConnection(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "manage");
  const { data, error } = await supabase.from("publishing_connections").select("id,status,created_at,updated_at,disabled_at").eq("brand_id", brandId).maybeSingle();
  if (error) throw error;
  return data;
}
