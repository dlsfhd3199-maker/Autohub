"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission } from "@/modules/authorization/server";
import { getBrandKnowledge } from "@/modules/brand-knowledge/queries";
import { generationPlanSchema, generatedDraftSchema, type GenerationContext } from "./contracts";
import { FakeGenerationProvider } from "./fake-provider";
import { generationLimits } from "./config";

const startSchema = z.object({ brandId: z.string().uuid(), topic: z.string().trim().min(5).max(300), primaryKeyword: z.string().trim().min(1).max(120), secondaryKeywords: z.string().max(1000).transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean)).pipe(z.array(z.string().max(120)).max(20)), idempotencyKey: z.string().uuid(), evidenceIds: z.array(z.string().uuid()).max(30) });
const draftSchema = z.object({ brandId: z.string().uuid(), jobId: z.string().uuid() });
export type GenerationActionState = { ok: boolean; message: string; jobId?: string; plan?: z.infer<typeof generationPlanSchema>; contentId?: string };
const failure = (message: string): GenerationActionState => ({ ok: false, message });

function contextFrom(job: { topic: string; primary_keyword: string; secondary_keywords: unknown; evidence_snapshot: unknown }, knowledge: Record<string, unknown> | null): GenerationContext {
  return { topic: job.topic, primaryKeyword: job.primary_keyword, secondaryKeywords: z.array(z.string()).parse(job.secondary_keywords), knowledge, evidence: z.array(z.object({ id: z.string().uuid(), title: z.string(), officialUrl: z.string().url(), evidenceText: z.string() })).parse(job.evidence_snapshot) };
}

export async function generatePlan(_state: GenerationActionState, formData: FormData): Promise<GenerationActionState> {
  let jobId: string | undefined;
  try {
    const input = startSchema.parse({ ...Object.fromEntries(formData), evidenceIds: formData.getAll("evidenceIds") });
    const { supabase, userId } = await requireBrandPermission(input.brandId, "edit");
    const existing = await supabase.from("generation_jobs").select("id,status,plan_json").eq("brand_id", input.brandId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (existing.data) return { ok: existing.data.status === "plan_ready", message: "동일한 생성 요청 결과를 불러왔습니다.", jobId: existing.data.id, plan: existing.data.plan_json ? generationPlanSchema.parse(existing.data.plan_json) : undefined };
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("generation_jobs").select("id", { count: "exact", head: true }).gte("created_at", dayStart.toISOString()).neq("status", "cancelled");
    if ((count ?? 0) >= generationLimits.dailyJobLimit) return failure("오늘의 로컬 AI 생성 한도 3건을 모두 사용했습니다.");
    const knowledge = await getBrandKnowledge(input.brandId);
    const evidence = knowledge.sources.filter((source) => input.evidenceIds.includes(source.id) && source.is_active).map((source) => ({ id: source.id, title: source.title, officialUrl: source.official_url, evidenceText: source.evidence_text }));
    if (evidence.length !== input.evidenceIds.length) return failure("선택한 근거 중 사용할 수 없는 항목이 있습니다.");
    const snapshot = evidence;
    const { data: job, error: insertError } = await supabase.from("generation_jobs").insert({ brand_id: input.brandId, requested_by: userId, topic: input.topic, primary_keyword: input.primaryKeyword, secondary_keywords: input.secondaryKeywords, status: "planning", idempotency_key: input.idempotencyKey, evidence_snapshot: snapshot, model: "gpt-5.6-terra" }).select("id,topic,primary_keyword,secondary_keywords,evidence_snapshot").single();
    if (insertError) return failure(insertError.code === "23505" ? "다른 생성 작업이 진행 중입니다. 완료 후 다시 시도해 주세요." : "생성 작업을 시작하지 못했습니다.");
    jobId = job.id;
    const provider = new FakeGenerationProvider();
    const result = await provider.generatePlan(contextFrom(job, knowledge.profile as Record<string, unknown> | null));
    const plan = generationPlanSchema.parse(result.plan);
    const { error: updateError } = await supabase.from("generation_jobs").update({ status: "plan_ready", plan_json: plan, input_tokens: result.inputTokens, output_tokens: result.outputTokens }).eq("id", job.id).eq("brand_id", input.brandId).eq("status", "planning");
    if (updateError) throw updateError;
    revalidatePath(`/workspace/brands/${input.brandId}/generate`);
    return { ok: true, message: "기획안을 생성했습니다. 확인 후 콘텐츠 초안을 생성해 주세요.", jobId: job.id, plan };
  } catch {
    if (jobId) { try { const inputBrand = z.string().uuid().safeParse(formData.get("brandId")); if (inputBrand.success) { const { supabase } = await requireBrandPermission(inputBrand.data, "edit"); await supabase.from("generation_jobs").update({ status: "failed", error_code: "PLAN_FAILED", safe_error_message: "기획안 생성에 실패했습니다." }).eq("id", jobId); } } catch {} }
    return failure("기획안 생성에 실패했습니다. 입력과 근거를 확인해 주세요.");
  }
}

export async function generateDraft(_state: GenerationActionState, formData: FormData): Promise<GenerationActionState> {
  let lockedJobId: string | undefined;
  let lockedBrandId: string | undefined;
  try {
    const input = draftSchema.parse(Object.fromEntries(formData));
    const { supabase } = await requireBrandPermission(input.brandId, "edit");
    const { data: job, error } = await supabase.from("generation_jobs").select("id,brand_id,topic,primary_keyword,secondary_keywords,evidence_snapshot,plan_json,status,input_tokens,output_tokens").eq("id", input.jobId).eq("brand_id", input.brandId).maybeSingle();
    if (error || !job || job.status !== "plan_ready") return failure("초안을 생성할 수 있는 기획안이 아닙니다.");
    const { error: lockError } = await supabase.from("generation_jobs").update({ status: "drafting", started_at: new Date().toISOString() }).eq("id", job.id).eq("status", "plan_ready");
    if (lockError) return failure("다른 생성 작업이 진행 중입니다.");
    lockedJobId = job.id; lockedBrandId = input.brandId;
    const knowledge = await getBrandKnowledge(input.brandId);
    const provider = new FakeGenerationProvider();
    const result = await provider.generateDraft(contextFrom(job, knowledge.profile as Record<string, unknown> | null), generationPlanSchema.parse(job.plan_json));
    const draft = generatedDraftSchema.parse(result.draft);
    const slug = `virtual-ai-${job.id.slice(0, 8)}`;
    const title = draft.document.blocks.find((block) => block.type === "title")?.text ?? job.topic;
    const created = await supabase.rpc("create_content_with_draft", { target_brand_id: input.brandId, content_title: title, content_slug: slug, keyword: job.primary_keyword, document: draft.document });
    if (created.error || !created.data?.contentId) throw created.error ?? new Error("draft creation failed");
    const status = draft.reviewItems.length ? "needs_review" : "completed";
    const { error: completeError } = await supabase.from("generation_jobs").update({ status, review_items: draft.reviewItems, input_tokens: job.input_tokens + result.inputTokens, output_tokens: job.output_tokens + result.outputTokens, content_id: created.data.contentId, draft_version_id: created.data.draftId, completed_at: new Date().toISOString() }).eq("id", job.id).eq("status", "drafting");
    if (completeError) throw completeError;
    revalidatePath(`/workspace/content/${created.data.contentId}/studio`);
    return { ok: true, message: draft.reviewItems.length ? "초안을 생성했습니다. 검수 필요 항목을 확인해 주세요." : "초안을 생성했습니다.", contentId: created.data.contentId, jobId: job.id };
  } catch {
    if (lockedJobId && lockedBrandId) { try { const { supabase } = await requireBrandPermission(lockedBrandId, "edit"); await supabase.from("generation_jobs").update({ status: "failed", error_code: "DRAFT_FAILED", safe_error_message: "콘텐츠 초안 생성에 실패했습니다." }).eq("id", lockedJobId); } catch {} }
    return failure("콘텐츠 초안 생성에 실패했습니다. 다시 시도해 주세요.");
  }
}
