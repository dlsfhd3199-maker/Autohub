export type WorkspaceRole = "agency_admin" | "ae" | "advertiser";

export type AuthorizationContext = {
  role: WorkspaceRole;
  organizationId: string;
  assignedBrandIds: ReadonlySet<string>;
};

export function canAccessBrand(context: AuthorizationContext, brandId: string) {
  return context.role === "agency_admin" || context.assignedBrandIds.has(brandId);
}

export function canManageBrand(context: AuthorizationContext) {
  return context.role === "agency_admin";
}

export function canEditContent(context: AuthorizationContext, brandId: string) {
  return (
    context.role === "agency_admin" ||
    (context.role === "ae" && context.assignedBrandIds.has(brandId))
  );
}

export function canReadContent(context: AuthorizationContext, brandId: string) {
  return canAccessBrand(context, brandId);
}
