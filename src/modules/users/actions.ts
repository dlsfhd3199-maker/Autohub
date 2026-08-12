"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationAdmin } from "@/modules/authorization/server";

export type UserActionState = { ok: boolean; message: string };
const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  brandId: z.union([z.literal(""), z.string().uuid()]),
  reason: z.string().trim().max(500),
});

export async function reviewApplication(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  try {
    const input = reviewSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireOrganizationAdmin();
    const { error } = await supabase.rpc("review_membership_application", {
      target_application_id: input.applicationId,
      target_decision: input.decision,
      target_brand_id: input.brandId || null,
      target_reason: input.reason || null,
    });
    if (error) throw error;
    revalidatePath("/workspace/users");
    return { ok: true, message: input.decision === "approved" ? "가입 신청을 승인하고 역할과 브랜드를 배정했습니다." : "가입 신청을 거절했습니다." };
  } catch {
    return { ok: false, message: "승인 조건과 브랜드 배정을 확인해 주세요." };
  }
}

export async function suspendAccount(formData: FormData) {
  const userId = z.string().uuid().parse(formData.get("userId"));
  const reason = z.string().trim().min(2).max(500).parse(formData.get("reason"));
  const { supabase } = await requireOrganizationAdmin();
  const { error } = await supabase.rpc("set_account_status", { target_user_id: userId, target_status: "suspended", target_reason: reason });
  if (error) throw new Error("계정을 정지하지 못했습니다.");
  revalidatePath("/workspace/users");
}
