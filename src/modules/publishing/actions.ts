"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission } from "@/modules/authorization/server";
import { requireAuthenticatedUser } from "@/modules/auth/session";
import { createPublishingKey, hashPublishingKey } from "./keys";

const brandSchema = z.object({ brandId: z.string().uuid() }).strict();
const publishSchema = z.object({ contentId: z.string().uuid(), versionId: z.string().uuid() }).strict();
export type PublishingActionState = { ok: boolean; message: string; rawKey?: string };

export async function rotatePublishingConnection(_state: PublishingActionState, formData: FormData): Promise<PublishingActionState> {
  try {
    const { brandId } = brandSchema.parse({ brandId: formData.get("brandId") });
    const { supabase, userId } = await requireBrandPermission(brandId, "manage");
    const rawKey = createPublishingKey();
    const { error } = await supabase.from("publishing_connections").upsert({ brand_id: brandId, provider: "local-test-store", status: "active", connection_status: "connected", bearer_key_hash: hashPublishingKey(rawKey), created_by: userId, connected_by: userId, granted_capabilities: ["publish","update","inspect","targets"], disabled_at: null }, { onConflict: "brand_id,provider" });
    if (error) throw error;
    revalidatePath(`/workspace/brands/${brandId}`);
    return { ok: true, message: "테스트 발행 연결 키를 생성했습니다. 이 화면을 벗어나면 원문 키를 다시 확인할 수 없습니다.", rawKey };
  } catch {
    return { ok: false, message: "테스트 발행 연결 키를 생성하지 못했습니다." };
  }
}

export async function disablePublishingConnection(_state: PublishingActionState, formData: FormData): Promise<PublishingActionState> {
  try {
    const { brandId } = brandSchema.parse({ brandId: formData.get("brandId") });
    const { supabase } = await requireBrandPermission(brandId, "manage");
    const { error } = await supabase.from("publishing_connections").update({ status: "disabled", connection_status: "disabled", disabled_at: new Date().toISOString() }).eq("brand_id", brandId).eq("provider", "local-test-store");
    if (error) throw error;
    revalidatePath(`/workspace/brands/${brandId}`);
    return { ok: true, message: "테스트 발행 연결을 비활성화했습니다." };
  } catch {
    return { ok: false, message: "테스트 발행 연결을 비활성화하지 못했습니다." };
  }
}

export async function testPublishContent(_state: PublishingActionState, formData: FormData): Promise<PublishingActionState> {
  const parsed = publishSchema.safeParse({ contentId: formData.get("contentId"), versionId: formData.get("versionId") });
  if (!parsed.success) return { ok: false, message: "발행할 콘텐츠와 버전 정보가 올바르지 않습니다." };
  let authenticated: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  try { authenticated = await requireAuthenticatedUser(); }
  catch { return { ok: false, message: "로그인 세션을 확인한 뒤 다시 시도해 주세요." }; }
  const { data: content, error: contentError } = await authenticated.supabase.from("content_items").select("brand_id").eq("id", parsed.data.contentId).maybeSingle();
  if (contentError || !content) return { ok: false, message: "접근 가능한 테스트 발행 콘텐츠를 찾을 수 없습니다." };
  try { await requireBrandPermission(content.brand_id, "manage"); }
  catch { return { ok: false, message: "테스트 발행은 대행사 관리자만 할 수 있습니다." }; }
  const { error } = await authenticated.supabase.rpc("test_publish_content", { target_content_id: parsed.data.contentId, target_version_id: parsed.data.versionId });
  if (error?.code === "42501") return { ok: false, message: "테스트 발행은 대행사 관리자만 할 수 있습니다." };
  if (error?.code === "23514") return { ok: false, message: "working draft가 아닌 명시적 불변 버전을 선택해 주세요." };
  if (error) return { ok: false, message: "테스트 발행 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath(`/workspace/content/${parsed.data.contentId}/studio`);
  return { ok: true, message: "선택한 불변 버전을 테스트 발행했습니다. 실제 승인이나 운영 발행이 아닙니다." };
}
