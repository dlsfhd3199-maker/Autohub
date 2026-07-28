import { z } from "zod";
import { requireAuthenticatedUser } from "@/modules/auth/session";
import { requireBrandPermission } from "@/modules/authorization/server";
import { contentDocumentSchema } from "./document";

export const saveDraftSchema = z.object({ revision: z.number().int().positive(), title: z.string().trim().min(1).max(160), primaryKeyword: z.string().trim().max(120), document: contentDocumentSchema }).strict();

export async function requireContentEditor(contentId: string) {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase.from("content_items").select("id,brand_id").eq("id", contentId).maybeSingle();
  if (error || !data) throw new Error("Content not found");
  return requireBrandPermission(data.brand_id, "edit");
}

export async function getContentStudio(contentId: string) {
  const { supabase } = await requireAuthenticatedUser();
  const { data: content, error } = await supabase.from("content_items")
    .select("id,brand_id,title,status,primary_keyword,current_draft_id,current_version_id,brands!inner(id,name),content_versions!content_items_current_draft_fk(id,version_no,status,body_json,revision,saved_at,title_snapshot,is_working_draft)")
    .eq("id", contentId).maybeSingle();
  if (error || !content) throw new Error("Content not found");
  const { data: canEdit } = await supabase.rpc("can_edit_brand_content", { target_brand_id: content.brand_id });
  const { data: history, error: historyError } = await supabase.from("content_versions")
    .select("id,version_no,status,title_snapshot,body_json,change_summary,created_at,saved_at,created_by,profiles!content_versions_created_by_fkey(display_name)")
    .eq("content_id", contentId).eq("is_working_draft", false).order("version_no", { ascending: false });
  if (historyError) throw historyError;
  const draftValue = Array.isArray(content.content_versions) ? content.content_versions[0] : content.content_versions;
  const draft = draftValue ? { ...draftValue, body_json: contentDocumentSchema.parse(draftValue.body_json) } : null;
  return { content, draft, history: (history ?? []).map((item) => ({ ...item, body_json: contentDocumentSchema.parse(item.body_json) })), canEdit: canEdit === true };
}
