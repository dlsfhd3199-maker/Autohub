"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBrandPermission } from "@/modules/authorization/server";
import { accountUserSchema, advertiserAccountSchema, advertiserReactivationSchema } from "./schemas";
import { isProvisioningUserOwnedByRequest } from "./ownership";

export type ProvisionState = {
  ok: boolean;
  message: string;
  email?: string;
  temporaryPassword?: string;
};

export type ReactivationState = ProvisionState & { manualCleanupRequired?: boolean };

const createTemporaryPassword = () => `${randomBytes(24).toString("base64url")}Aa1`;

export async function createAdvertiserAccount(
  _state: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  let createdId: string | undefined;
  let createdByThisRequest = false;
  let requestContext: { id: string; brandId: string; emailHash: string } | undefined;
  try {
    const input = advertiserAccountSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireBrandPermission(input.brandId, "edit");
    const admin = createAdminClient();
    const emailHash = createHash("sha256").update(input.email).digest("hex");
    requestContext = { id: input.idempotencyKey, brandId: input.brandId, emailHash };
    const record = async (status: string, userId?: string, safeError?: string) => supabase.rpc("record_advertiser_provisioning_event", {
      request_id: input.idempotencyKey, target_brand_id: input.brandId, target_email_hash: emailHash,
      target_status: status, target_auth_user_id: userId ?? null, target_safe_error: safeError ?? null,
    });
    const started = await record("provisioning_started");
    if (started.error) throw started.error;
    if (started.data === "assignment_completed") return { ok: true, message: "이미 처리된 요청입니다." };
    const password = createTemporaryPassword();
    const created = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName, provisioned_as: "advertiser", provisioning_request_id: input.idempotencyKey },
    });
    if (created.error || !created.data.user) {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const owned = listed.data?.users.find((user) => isProvisioningUserOwnedByRequest(user, input.email, input.idempotencyKey));
      if (!owned) throw new Error("CREATE_FAILED");
      createdId = owned.id;
    } else {
      createdId = created.data.user.id;
      createdByThisRequest = true;
    }
    const authRecorded = await record("auth_user_created", createdId);
    if (authRecorded.error) throw authRecorded.error;
    const finalized = await supabase.rpc("finalize_advertiser_provisioning", {
      target_user_id: createdId,
      target_brand_id: input.brandId,
      target_display_name: input.displayName,
      target_job_title: input.jobTitle || null,
      target_method: "temporary_credentials",
    });
    if (finalized.error) throw finalized.error;
    const completed = await record("assignment_completed", createdId);
    if (completed.error) throw completed.error;
    revalidatePath("/workspace/people");
    return { ok: true, message: "광고주 계정을 생성했습니다.", email: input.email, temporaryPassword: password };
  } catch {
    if (createdId && requestContext) {
      const admin = createAdminClient();
      const owned = await admin.auth.admin.getUserById(createdId);
      const ownershipMatches = isProvisioningUserOwnedByRequest(owned.data.user, owned.data.user?.email ?? "", requestContext.id);
      if (ownershipMatches) {
        const deleted = await admin.auth.admin.deleteUser(createdId);
        try {
          const { supabase } = await requireBrandPermission(requestContext.brandId, "edit");
          await supabase.rpc("record_advertiser_provisioning_event", { request_id:requestContext.id,target_brand_id:requestContext.brandId,target_email_hash:requestContext.emailHash,target_status:deleted.error?"compensation_failed":"compensation_succeeded",target_auth_user_id:deleted.error?createdId:null,target_safe_error:deleted.error?"MANUAL_CLEANUP_REQUIRED":null });
        } catch { /* never expose compensation internals */ }
        if (deleted.error) return { ok:false, message:"계정 생성이 완료되지 않았습니다. 관리자 수동 정리가 필요합니다." };
      } else if (createdByThisRequest) {
        return { ok:false, message:"계정 생성 상태를 확인할 수 없습니다. 관리자 수동 정리가 필요합니다." };
      }
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

export async function reactivateAdvertiserAccount(
  _state: ReactivationState,
  formData: FormData,
): Promise<ReactivationState> {
  let authChanged = false;
  let context: { recoveryId: string; userId: string; brandId: string } | undefined;
  try {
    const input = advertiserReactivationSchema.parse(Object.fromEntries(formData));
    context = input;
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const record = (status: string, safeError?: string) => supabase.rpc("record_advertiser_reactivation_event", {
      request_id: input.recoveryId,
      target_user_id: input.userId,
      target_brand_id: input.brandId,
      target_status: status,
      target_safe_error: safeError ?? null,
    });
    const started = await record("reactivation_started");
    if (started.error) throw started.error;
    if (started.data === "reactivation_completed") return { ok: true, message: "이미 처리된 복구 요청입니다." };

    const admin = createAdminClient();
    const existing = await admin.auth.admin.getUserById(input.userId);
    if (existing.error || !existing.data.user?.email) throw new Error("ACCOUNT_NOT_FOUND");
    const password = createTemporaryPassword();
    const metadata = { ...existing.data.user.user_metadata, advertiser_recovery_id: input.recoveryId };
    const rotated = await admin.auth.admin.updateUserById(input.userId, {
      ban_duration: "none",
      password,
      user_metadata: metadata,
    });
    if (rotated.error) throw new Error("AUTH_REACTIVATION_FAILED");
    authChanged = true;
    const unbanned = await record("auth_unbanned");
    if (unbanned.error) throw unbanned.error;
    const credentialRotated = await record("temporary_credential_rotated");
    if (credentialRotated.error) throw credentialRotated.error;
    const completed = await record("reactivation_completed");
    if (completed.error) throw completed.error;
    return { ok: true, message: "계정을 재활성화하고 새 임시 비밀번호를 발급했습니다.", email: existing.data.user.email, temporaryPassword: password };
  } catch {
    if (authChanged && context) {
      const admin = createAdminClient();
      const current = await admin.auth.admin.getUserById(context.userId);
      const owned = current.data.user?.user_metadata?.advertiser_recovery_id === context.recoveryId;
      if (owned) {
        const rebanned = await admin.auth.admin.updateUserById(context.userId, { ban_duration: "876000h" });
        try {
          const { supabase } = await requireBrandPermission(context.brandId, "manage");
          await supabase.rpc("record_advertiser_reactivation_event", {
            request_id: context.recoveryId,
            target_user_id: context.userId,
            target_brand_id: context.brandId,
            target_status: rebanned.error ? "reactivation_compensation_failed" : "reactivation_compensation_succeeded",
            target_safe_error: rebanned.error ? "MANUAL_CLEANUP_REQUIRED" : null,
          });
        } catch { /* keep the response free of internal recovery details */ }
        if (rebanned.error) return { ok: false, message: "계정 복구가 완료되지 않았습니다. 수동 정리가 필요합니다.", manualCleanupRequired: true };
      }
    }
    return { ok: false, message: "계정을 재활성화할 수 없습니다. 상태와 권한을 확인해 주세요." };
  }
}
