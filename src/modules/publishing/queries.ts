import { requireBrandPermission } from "@/modules/authorization/server";

export async function getPublishingConnection(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "read");
  const { data, error } = await supabase.rpc("get_publishing_connection_summaries", { target_brand_id: brandId });
  if (error) throw error;
  const summaries = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
  return summaries.find((item) => item.provider === "local-test-store") ?? null;
}
