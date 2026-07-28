import { requireAuthenticatedUser } from "@/modules/auth/session";
import { requireBrandPermission } from "@/modules/authorization/server";
import { paginationRange, type contentSearchSchema } from "@/modules/content/search";
import type { z } from "zod";

type Search = z.infer<typeof contentSearchSchema>;

export async function listAccessibleContent(search: Search) {
  const { supabase } = await requireAuthenticatedUser();
  if (search.brandId) await requireBrandPermission(search.brandId, "read");
  const { from, to } = paginationRange(search.page, search.pageSize);
  let query = supabase
    .from("content_items")
    .select("id,brand_id,title,slug,status,owner_id,updated_at,current_version_id,brands!inner(id,name,archived_at),profiles!content_items_owner_id_fkey(id,display_name),content_versions!content_items_current_version_fk(id,version_no,status)", { count: "exact" })
    .is("archived_at", null)
    .is("brands.archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (search.brandId) query = query.eq("brand_id", search.brandId);
  if (search.status) query = query.eq("status", search.status);
  if (search.ownerId) query = query.eq("owner_id", search.ownerId);
  if (search.q) {
    const safe = search.q.replace(/[,%()]/g, " ");
    query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page: search.page, pageSize: search.pageSize, pageCount: Math.max(1, Math.ceil((count ?? 0) / search.pageSize)) };
}
