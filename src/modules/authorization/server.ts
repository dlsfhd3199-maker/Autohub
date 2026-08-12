import { requireAuthenticatedUser } from "@/modules/auth/session";

export class AuthorizationError extends Error {
  constructor() {
    super("요청한 리소스에 접근할 권한이 없습니다.");
    this.name = "AuthorizationError";
  }
}

type BrandPermission = "read" | "edit" | "configure" | "manage";

export async function requireBrandPermission(brandId: string, permission: BrandPermission) {
  const { userId, supabase } = await requireAuthenticatedUser();
  const functionName = permission === "read" ? "can_access_brand" : permission === "edit" ? "can_edit_brand_content" : permission === "configure" ? "can_configure_brand" : "is_agency_admin";
  const { data, error } = await supabase.rpc(functionName, { target_brand_id: brandId });
  if (error || data !== true) throw new AuthorizationError();
  return { userId, supabase };
}

export async function requireOrganizationAdmin(organizationId?: string) {
  const { userId, supabase } = await requireAuthenticatedUser();
  let query = supabase.from("organization_memberships").select("organization_id")
    .eq("user_id", userId).eq("role", "agency_admin");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) throw new AuthorizationError();
  return { userId, organizationId: data.organization_id, supabase };
}
