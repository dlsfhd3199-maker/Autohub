"use server";

import { revalidatePath } from "next/cache";
import { requireBrandPermission, requireOrganizationAdmin } from "@/modules/authorization/server";
import { assignmentInputSchema } from "@/modules/people/schemas";
import type { ActionState } from "@/modules/brands/actions";

export async function assignPerson(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const values = Object.fromEntries(formData);
    const [userId, role] = String(values.selection ?? "").split(":");
    const input = assignmentInputSchema.parse({ ...values, userId, role });
    await requireOrganizationAdmin(input.organizationId);
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const { error } = await supabase.from("brand_assignments").insert({ brand_id: input.brandId, user_id: input.userId, role: input.role });
    if (error) throw error;
    revalidatePath("/workspace/people");
    return { ok: true, message: "담당자를 배정했습니다." };
  } catch { return { ok: false, message: "조직과 역할이 일치하는 담당자만 배정할 수 있습니다." }; }
}

export async function unassignPerson(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = assignmentInputSchema.parse(Object.fromEntries(formData));
    await requireOrganizationAdmin(input.organizationId);
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const { error } = await supabase.from("brand_assignments").delete().eq("brand_id", input.brandId).eq("user_id", input.userId).eq("role", input.role);
    if (error) throw error;
    revalidatePath("/workspace/people");
    return { ok: true, message: "담당자 배정을 해제했습니다." };
  } catch { return { ok: false, message: "배정을 해제할 권한이 없습니다." }; }
}
