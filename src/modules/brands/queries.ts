import { requireAuthenticatedUser } from "@/modules/auth/session";
import { requireBrandPermission, requireOrganizationAdmin } from "@/modules/authorization/server";

export type BrandSummary = { id: string; name: string; brand_key: string; domain: string; publishing_path: string; updated_at: string; archived_at: string | null; advertiser_organization_id: string };

export async function listAccessibleBrands(options: { includeArchived?: boolean } = {}) {
  const { supabase } = await requireAuthenticatedUser();
  let query = supabase.from("brands").select("id,name,brand_key,domain,publishing_path,updated_at,archived_at,advertiser_organization_id").order("updated_at", { ascending: false });
  if (!options.includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BrandSummary[];
}

export async function getBrand(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "read");
  const { data, error } = await supabase.from("brands").select("id,name,brand_key,domain,publishing_path,updated_at,archived_at,advertiser_organization_id").eq("id", brandId).maybeSingle();
  if (error || !data) throw error ?? new Error("Brand not found");
  return data as BrandSummary;
}

export async function listAdvertiserOrganizations(organizationId: string) {
  const { supabase } = await requireOrganizationAdmin(organizationId);
  const { data, error } = await supabase.from("brands").select("advertiser_organization_id,organizations!brands_advertiser_organization_id_fkey(id,name)").eq("agency_organization_id", organizationId);
  if (error) throw error;
  const unique = new Map<string, string>();
  for (const row of data ?? []) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (org) unique.set(org.id, org.name);
  }
  return [...unique].map(([id, name]) => ({ id, name }));
}
