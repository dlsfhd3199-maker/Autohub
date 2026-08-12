"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBrandPermission } from "@/modules/authorization/server";
import { accountUserSchema, advertiserAccountSchema } from "./schemas";

export type ProvisionState = {
  ok: boolean;
  message: string;
  email?: string;
  temporaryPassword?: string;
};

const createTemporaryPassword = () => `${randomBytes(24).toString("base64url")}Aa1`;

export async function createAdvertiserAccount(
  _state: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  let createdId: string | undefined;
  try {
    const input = advertiserAccountSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireBrandPermission(input.brandId, "edit");
    const admin = createAdminClient();
    const password = createTemporaryPassword();
    const created = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName, provisioned_as: "advertiser" },
    });
    if (created.error || !created.data.user) throw new Error("CREATE_FAILED");
    createdId = created.data.user.id;
    const finalized = await supabase.rpc("finalize_advertiser_provisioning", {
      target_user_id: createdId,
      target_brand_id: input.brandId,
      target_display_name: input.displayName,
      target_job_title: input.jobTitle || null,
      target_method: "temporary_credentials",
    });
    if (finalized.error) throw finalized.error;
    revalidatePath("/workspace/people");
    return { ok: true, message: "광고주 계정을 생성했습니다.", email: input.email, temporaryPassword: password };
  } catch {
    if (createdId) {
      try { await createAdminClient().auth.admin.deleteUser(createdId); } catch { /* best-effort rollback */ }
    }
    return { ok: false, message: "계정을 생성할 수 없습니다. 권한, 브랜드와 이메일을 확인해 주세요." };
  }
}

export async function reissueAdvertiserPassword(
  _state: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  try {
    const input = accountUserSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const password = createTemporaryPassword();
    const admin = createAdminClient();
    const updated = await admin.auth.admin.updateUserById(input.userId, { password });
    if (updated.error) throw updated.error;
    const result = await supabase.rpc("reissue_advertiser_credentials", {
      target_user_id: input.userId,
      target_brand_id: input.brandId,
    });
    if (result.error) throw result.error;
    revalidatePath("/workspace/people");
    return { ok: true, message: "새 임시 비밀번호를 발급했습니다.", email: updated.data.user.email, temporaryPassword: password };
  } catch {
    return { ok: false, message: "임시 비밀번호를 재발급할 수 없습니다." };
  }
}

export async function disableAdvertiserAccount(formData: FormData) {
  const input = accountUserSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireBrandPermission(input.brandId, "manage");
  const result = await supabase.rpc("disable_advertiser_account", {
    target_user_id: input.userId,
    target_brand_id: input.brandId,
  });
  if (result.error) throw new Error("광고주 계정을 비활성화하지 못했습니다.");
  const disabled = await createAdminClient().auth.admin.updateUserById(input.userId, { ban_duration: "876000h" });
  if (disabled.error) throw new Error("인증 계정을 비활성화하지 못했습니다.");
  revalidatePath("/workspace/people");
}
