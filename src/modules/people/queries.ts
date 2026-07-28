import { requireBrandPermission, requireOrganizationAdmin } from "@/modules/authorization/server";

export async function listOrganizationPeople(organizationId: string) {
  const { supabase } = await requireOrganizationAdmin(organizationId);
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("user_id,role,profiles!organization_memberships_user_id_fkey(id,display_name,is_active)")
    .eq("organization_id", organizationId)
    .order("role");
  if (error) throw error;
  return data ?? [];
}

export async function listBrandAssignments(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "read");
  const { data, error } = await supabase
    .from("brand_assignments")
    .select("id,brand_id,user_id,role,profiles!brand_assignments_user_id_fkey(id,display_name,is_active)")
    .eq("brand_id", brandId)
    .order("role");
  if (error) throw error;
  return data ?? [];
}

export async function listAssignablePeople(brandId: string) {
  const { supabase } = await requireBrandPermission(brandId, "manage");
  const { data: brand, error: brandError } = await supabase.from("brands")
    .select("agency_organization_id,advertiser_organization_id").eq("id", brandId).single();
  if (brandError) throw brandError;
  const { data, error } = await supabase.from("organization_memberships")
    .select("user_id,organization_id,role,profiles!organization_memberships_user_id_fkey(id,display_name,is_active)")
    .in("organization_id", [brand.agency_organization_id, brand.advertiser_organization_id])
    .in("role", ["ae", "advertiser"]);
  if (error) throw error;
  return data ?? [];
}
