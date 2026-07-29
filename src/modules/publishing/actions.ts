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
    const { brandId } = brandSchema.parse(Object.fromEntries(formData));
    const { supabase, userId } = await requireBrandPermission(brandId, "manage");
    const rawKey = createPublishingKey();
    const { error } = await supabase.from("publishing_connections").upsert({ brand_id: brandId, status: "active", bearer_key_hash: hashPublishingKey(rawKey), created_by: userId, disabled_at: null }, { onConflict: "brand_id" });
    if (error) throw error;
    revalidatePath(`/workspace/brands/${brandId}`);
    return { ok: true, message: "테스트 발행 연결 키를 생성했습니다. 이 화면을 벗어나면 원문 키를 다시 확인할 수 없습니다.", rawKey };
  } catch {
    return { ok: false, message: "테스트 발행 연결 키를 생성하지 못했습니다." };
  }
}

export async function disablePublishingConnection(_state: PublishingActionState, formData: FormData): Promise<PublishingActionState> {
  try {
    const { brandId } = brandSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireBrandPermission(brandId, "manage");
    const { error } = await supabase.from("publishing_connections").update({ status: "disabled", disabled_at: new Date().toISOString() }).eq("brand_id", brandId);
    if (error) throw error;
    revalidatePath(`/workspace/brands/${brandId}`);
    return { ok: true, message: "테스트 발행 연결을 비활성화했습니다." };
  } catch {
    return { ok: false, message: "테스트 발행 연결을 비활성화하지 못했습니다." };
  }
}

export async function testPublishContent(_state: PublishingActionState, formData: FormData): Promise<PublishingActionState> {
  try {
    const input = publishSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireAuthenticatedUser();
    const { data: content, error: contentError } = await supabase.from("content_items").select("brand_id").eq("id", input.contentId).maybeSingle();
    if (contentError || !content) throw contentError ?? new Error("not found");
    await requireBrandPermission(content.brand_id, "manage");
    const { error } = await supabase.rpc("test_publish_content", { target_content_id: input.contentId, target_version_id: input.versionId });
    if (error) throw error;
    revalidatePath(`/workspace/content/${input.contentId}/studio`);
    return { ok: true, message: "선택한 불변 버전을 테스트 발행했습니다. 실제 승인이나 운영 발행이 아닙니다." };
  } catch {
    return { ok: false, message: "테스트 발행에 실패했습니다. 관리자 권한과 명시적 버전을 확인해 주세요." };
  }
}
