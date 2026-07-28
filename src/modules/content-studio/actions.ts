"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBrandPermission } from "@/modules/authorization/server";
import { initialDocument } from "./document";
import { requireContentEditor } from "./server";

const createSchema = z.object({ brandId: z.string().uuid(), title: z.string().trim().min(1).max(160), slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,159}$/), primaryKeyword: z.string().trim().max(120) });

export async function createContent(formData: FormData) {
  const input = createSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireBrandPermission(input.brandId, "edit");
  const document = initialDocument();
  document.metadata.primaryKeyword = input.primaryKeyword;
  const { data, error } = await supabase.rpc("create_content_with_draft", { target_brand_id: input.brandId, content_title: input.title, content_slug: input.slug, keyword: input.primaryKeyword, document });
  if (error || !data?.contentId) throw error ?? new Error("Content creation failed");
  redirect(`/workspace/content/${data.contentId}/studio`);
}

export async function createVersion(formData: FormData) {
  const contentId = z.string().uuid().parse(formData.get("contentId"));
  const summary = z.string().trim().min(1).max(500).parse(formData.get("summary"));
  const { supabase } = await requireContentEditor(contentId);
  const { error } = await supabase.rpc("create_content_version", { target_content_id: contentId, summary });
  if (error) throw error;
  revalidatePath(`/workspace/content/${contentId}/studio`);
}

export async function restoreVersion(formData: FormData) {
  const contentId = z.string().uuid().parse(formData.get("contentId"));
  const versionId = z.string().uuid().parse(formData.get("versionId"));
  const { supabase } = await requireContentEditor(contentId);
  const { error } = await supabase.rpc("restore_content_version", { target_content_id: contentId, source_version_id: versionId });
  if (error) throw error;
  revalidatePath(`/workspace/content/${contentId}/studio`);
}
