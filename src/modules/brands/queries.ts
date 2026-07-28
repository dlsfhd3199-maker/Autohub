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

export async function listBrandOperations(brandIds: string[]) {
  if (!brandIds.length) return new Map<string, { contentCount: number; aeNames: string[]; advertiserNames: string[] }>();
  const { supabase } = await requireAuthenticatedUser();
  const [{ data: contents, error: contentError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.from("content_items").select("brand_id").in("brand_id", brandIds).is("archived_at", null),
    supabase.from("brand_assignments").select("brand_id,role,profiles!brand_assignments_user_id_fkey(display_name)").in("brand_id", brandIds),
  ]);
  if (contentError || assignmentError) throw contentError ?? assignmentError;
  const result = new Map(brandIds.map((id) => [id, { contentCount: 0, aeNames: [] as string[], advertiserNames: [] as string[] }]));
  for (const row of contents ?? []) result.get(row.brand_id)!.contentCount += 1;
  for (const row of assignments ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) continue;
    const target = result.get(row.brand_id)!;
    (row.role === "ae" ? target.aeNames : target.advertiserNames).push(profile.display_name);
  }
  return result;
}
