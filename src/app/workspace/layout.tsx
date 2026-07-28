import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { countAccessibleContent } from "@/modules/content/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [context, brands, contents] = await Promise.all([getWorkspaceContext(), listAccessibleBrands(), countAccessibleContent()]);
  return <WorkspaceShell context={{ displayName: context.displayName, role: context.role, organizationName: context.organizationName }} counts={{ brands: brands.length, contents }}>{children}</WorkspaceShell>;
}
