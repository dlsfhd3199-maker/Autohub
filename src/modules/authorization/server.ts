import { requireAuthenticatedUser } from "@/modules/auth/session";

export class AuthorizationError extends Error {
  constructor() {
    super("요청한 리소스에 접근할 수 없습니다.");
    this.name = "AuthorizationError";
  }
}

type BrandPermission = "read" | "edit" | "manage";

export async function requireBrandPermission(
  brandId: string,
  permission: BrandPermission,
) {
  const { userId, supabase } = await requireAuthenticatedUser();
  const functionName =
    permission === "read"
      ? "can_access_brand"
      : permission === "edit"
        ? "can_edit_brand_content"
        : "is_agency_admin";

  const { data, error } = await supabase.rpc(functionName, {
    target_brand_id: brandId,
  });

  if (error || data !== true) throw new AuthorizationError();

  return { userId, supabase };
}
