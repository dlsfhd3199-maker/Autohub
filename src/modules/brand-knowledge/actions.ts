"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission } from "@/modules/authorization/server";
import { evidenceInputSchema, evidenceToggleSchema, knowledgeInputSchema } from "./schemas";

export type KnowledgeActionState = { ok: boolean; message: string; fieldErrors?: Record<string, string[]> };
const fail = (error: unknown): KnowledgeActionState => error instanceof z.ZodError
  ? { ok: false, message: "입력 항목을 확인해 주세요.", fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> }
  : { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };

export async function saveBrandKnowledge(_state: KnowledgeActionState, formData: FormData): Promise<KnowledgeActionState> {
  try {
    const input = knowledgeInputSchema.parse(Object.fromEntries(formData));
    const { supabase, userId } = await requireBrandPermission(input.brandId, "edit");
    const { error } = await supabase.from("brand_knowledge_profiles").upsert({ brand_id: input.brandId, introduction: input.introduction, target_audience: input.targetAudience, tone: input.tone, prohibited_expressions: input.prohibitedExpressions, default_cta: { label: input.ctaLabel, url: input.ctaUrl }, product_info: input.productInfo, created_by: userId, updated_by: userId }, { onConflict: "brand_id" });
    if (error) throw error;
    revalidatePath(`/workspace/brands/${input.brandId}/ai-settings`);
    return { ok: true, message: "AI 콘텐츠 설정을 저장했습니다." };
  } catch (error) { return fail(error); }
}

export async function saveEvidenceSource(_state: KnowledgeActionState, formData: FormData): Promise<KnowledgeActionState> {
  try {
    const input = evidenceInputSchema.parse(Object.fromEntries(formData));
    const { supabase, userId } = await requireBrandPermission(input.brandId, "edit");
    const record = { brand_id: input.brandId, title: input.title, official_url: input.officialUrl, evidence_text: input.evidenceText, content_hash: createHash("sha256").update(input.evidenceText.normalize("NFC")).digest("hex") };
    const result = input.id ? await supabase.from("evidence_sources").update(record).eq("id", input.id).eq("brand_id", input.brandId) : await supabase.from("evidence_sources").insert({ ...record, created_by: userId });
    if (result.error) {
      if (result.error.code === "23505") return { ok: false, message: "같은 근거 텍스트가 이미 등록되어 있습니다." };
      throw result.error;
    }
    revalidatePath(`/workspace/brands/${input.brandId}/ai-settings`);
    return { ok: true, message: input.id ? "공식 근거를 수정했습니다." : "공식 근거를 등록했습니다." };
  } catch (error) { return fail(error); }
}

export async function toggleEvidenceSource(formData: FormData) {
  const input = evidenceToggleSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireBrandPermission(input.brandId, "edit");
  const { error } = await supabase.from("evidence_sources").update({ is_active: input.isActive }).eq("id", input.id).eq("brand_id", input.brandId);
  if (error) throw new Error("공식 근거 상태를 변경하지 못했습니다.");
  revalidatePath(`/workspace/brands/${input.brandId}/ai-settings`);
}
