"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission, requireOrganizationAdmin } from "@/modules/authorization/server";
import { brandArchiveSchema, brandInputSchema, brandUpdateSchema } from "@/modules/brands/schemas";

export type ActionState = { ok: boolean; message: string };
const failure = (error: unknown): ActionState => ({ ok: false, message: error instanceof z.ZodError ? "입력값을 다시 확인해 주세요." : "요청을 처리하지 못했습니다." });

export async function createBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = brandInputSchema.parse(Object.fromEntries(formData));
    const { supabase, organizationId } = await requireOrganizationAdmin(input.organizationId);
    const { count } = await supabase.from("brands").select("id", { count: "exact", head: true }).eq("agency_organization_id", organizationId).eq("advertiser_organization_id", input.advertiserOrganizationId);
    if (!count) throw new Error("Advertiser organization is outside the agency scope");
    const { error } = await supabase.from("brands").insert({ agency_organization_id: organizationId, advertiser_organization_id: input.advertiserOrganizationId, name: input.name, brand_key: input.brandKey, domain: input.domain, publishing_path: input.publishingPath });
    if (error) throw error;
    revalidatePath("/workspace/brands");
    return { ok: true, message: "브랜드를 생성했습니다." };
  } catch (error) { return failure(error); }
}

export async function updateBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = brandUpdateSchema.parse(Object.fromEntries(formData));
    await requireOrganizationAdmin(input.organizationId);
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const { error } = await supabase.from("brands").update({ name: input.name, domain: input.domain, publishing_path: input.publishingPath }).eq("id", input.brandId).eq("agency_organization_id", input.organizationId);
    if (error) throw error;
    revalidatePath("/workspace/brands");
    return { ok: true, message: "브랜드 정보를 수정했습니다." };
  } catch (error) { return failure(error); }
}

export async function archiveBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = brandArchiveSchema.parse(Object.fromEntries(formData));
    await requireOrganizationAdmin(input.organizationId);
    const { supabase } = await requireBrandPermission(input.brandId, "manage");
    const { error } = await supabase.from("brands").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", input.brandId).eq("agency_organization_id", input.organizationId);
    if (error) throw error;
    revalidatePath("/workspace/brands");
    return { ok: true, message: "브랜드를 보관했습니다." };
  } catch (error) { return failure(error); }
}
