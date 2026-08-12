"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { advertiserApplicationSchema, hashJoinCode, marketerApplicationSchema } from "./schemas";

export type RegistrationState = { ok: boolean; message: string; fieldErrors?: Record<string, string[]> };
const failure = (message: string): RegistrationState => ({ ok: false, message });

export async function submitRegistration(_state: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const role = formData.get("role");
  const values = Object.fromEntries(formData);
  const parsed = role === "advertiser"
    ? advertiserApplicationSchema.safeParse(values)
    : role === "ae"
      ? marketerApplicationSchema.safeParse(values)
      : null;
  if (!parsed?.success) {
    return {
      ok: false,
      message: "입력 항목을 확인해 주세요.",
      fieldErrors: parsed
        ? parsed.error.flatten().fieldErrors as Record<string, string[]>
        : { role: ["공개 가입은 광고주와 마케터만 신청할 수 있습니다."] },
    };
  }

  const supabase = await createClient();
  if (parsed.data.role === "ae") {
    const valid = await supabase.rpc("is_valid_join_code", { target_hash: hashJoinCode(parsed.data.joinCode) });
    if (valid.error || valid.data !== true) return failure("가입 코드를 확인할 수 없습니다. 관리자에게 유효한 코드를 확인해 주세요.");
  }

  const signup = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.applicantName, membership_application: true } },
  });
  if (signup.error || !signup.data.user) return failure("가입 신청을 접수할 수 없습니다. 입력 정보 또는 잠시 후 재시도 여부를 확인해 주세요.");

  type ResolvedJoinCode = { code_id: string; organization_id: string };
  let join: ResolvedJoinCode | null = null;
  if (parsed.data.role === "ae") {
    const resolved = await supabase.rpc("resolve_join_code", { target_hash: hashJoinCode(parsed.data.joinCode) });
    join = (resolved.data?.[0] ?? null) as ResolvedJoinCode | null;
    if (resolved.error || !join) {
      await supabase.auth.signOut();
      return failure("가입 코드를 확인할 수 없습니다. 관리자에게 새 코드를 요청해 주세요.");
    }
  }

  const row = {
    user_id: signup.data.user.id,
    requested_role: parsed.data.role,
    organization_name: parsed.data.organizationName,
    brand_name: parsed.data.role === "advertiser" ? parsed.data.brandName : null,
    storefront_url: parsed.data.role === "advertiser" ? parsed.data.storefrontUrl : null,
    applicant_name: parsed.data.applicantName,
    job_title: parsed.data.jobTitle,
    phone: parsed.data.phone,
    email_normalized: parsed.data.email,
    joined_on: parsed.data.role === "ae" && parsed.data.joinedOn ? parsed.data.joinedOn : null,
    join_code_id: join?.code_id ?? null,
    requested_organization_id: join?.organization_id ?? null,
    privacy_consent_at: new Date().toISOString(),
  };
  const inserted = await supabase.from("membership_applications").insert(row);
  if (inserted.error) {
    await supabase.auth.signOut();
    return failure("가입 신청을 안전하게 저장하지 못했습니다. 관리자에게 문의해 주세요.");
  }
  redirect("/account-status?status=pending");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.includes("@") && email.length <= 320) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"}/login` });
  }
  redirect("/login?reset=requested");
}
