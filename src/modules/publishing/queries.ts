import { requireBrandPermission } from "@/modules/authorization/server";

export async function getPublishingConnection(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "manage");
  const { data, error } = await supabase.from("publishing_connections").select("id,status,connection_status,provider,public_domain,granted_capabilities,default_publishing_target,last_verified_at,created_at,updated_at,disabled_at").eq("brand_id", brandId).eq("provider", "local-test-store").maybeSingle();
  if (error) throw error;
  return data;
}
