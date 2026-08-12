import { requireAuthenticatedUser } from "@/modules/auth/session";
import type { WorkspaceRole } from "@/modules/authorization/permissions";

export async function getWorkspaceContext() {
  const { userId, supabase } = await requireAuthenticatedUser();
  const [{ data: profile }, { data: memberships, error }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("organization_memberships").select("organization_id,role,organizations(name,type)").eq("user_id", userId).order("created_at").limit(1),
  ]);
  if (error || !memberships?.[0]) throw error ?? new Error("Workspace membership not found");
  const membership = memberships[0];
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  return { userId, displayName: profile?.display_name ?? "사용자", role: membership.role as WorkspaceRole, organizationId: membership.organization_id, organizationName: organization?.name ?? "워크스페이스" };
}
