"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission, requireOrganizationAdmin } from "@/modules/authorization/server";
import { brandArchiveSchema, brandInputSchema, brandUpdateSchema } from "@/modules/brands/schemas";

export type BrandField = "name" | "brandKey" | "domain" | "publishingPath" | "advertiserOrganizationId";
export type ActionState = { ok: boolean; message: string; fieldErrors?: Partial<Record<BrandField, string[]>>; createdBrandId?: string };
const failure = (error: unknown): ActionState => {
  if (error instanceof z.ZodError) {
    const flattened = z.flattenError(error).fieldErrors as Partial<Record<BrandField, string[]>>;
    return { ok: false, message: "표시된 항목을 확인해 주세요.", fieldErrors: flattened };
  }
  return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
};

export async function createBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = brandInputSchema.parse(Object.fromEntries(formData));
    const { supabase, organizationId } = await requireOrganizationAdmin(input.organizationId);
    const { count } = await supabase.from("brands").select("id", { count: "exact", head: true }).eq("agency_organization_id", organizationId).eq("advertiser_organization_id", input.advertiserOrganizationId);
    if (!count) throw new Error("Advertiser organization is outside the agency scope");
    const { data: duplicate, error: duplicateError } = await supabase.from("brands").select("brand_key,domain").eq("agency_organization_id", organizationId).or(`brand_key.eq.${input.brandKey},domain.eq.${input.domain}`);
    if (duplicateError) throw duplicateError;
    const fieldErrors: ActionState["fieldErrors"] = {};
    if (duplicate?.some((brand) => brand.brand_key === input.brandKey)) fieldErrors.brandKey = ["이미 사용 중인 브랜드 키입니다."];
    if (duplicate?.some((brand) => brand.domain === input.domain)) fieldErrors.domain = ["이미 등록된 연결 도메인입니다."];
    if (Object.keys(fieldErrors).length) return { ok: false, message: "중복된 정보를 확인해 주세요.", fieldErrors };
    const { error } = await supabase.from("brands").insert({ agency_organization_id: organizationId, advertiser_organization_id: input.advertiserOrganizationId, name: input.name, brand_key: input.brandKey, domain: input.domain, publishing_path: input.publishingPath });
    if (error) {
      if (error.code === "23505") return { ok: false, message: "중복된 정보를 확인해 주세요.", fieldErrors: { brandKey: ["이미 사용 중인 브랜드 키입니다."] } };
      throw error;
    }
    const { data: created } = await supabase.from("brands").select("id").eq("agency_organization_id", organizationId).eq("brand_key", input.brandKey).single();
    revalidatePath("/workspace/brands");
    return { ok: true, message: "브랜드를 생성했습니다.", createdBrandId: created?.id };
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
