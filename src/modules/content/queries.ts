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
    .select("id,brand_id,title,slug,status,owner_id,updated_at,current_version_id,current_draft_id,primary_keyword,brands!inner(id,name,archived_at),profiles!content_items_owner_id_fkey(id,display_name),content_versions!content_items_current_version_fk(id,version_no,status)", { count: "exact" })
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

export async function listAccessibleContentOwners() {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase.from("content_items")
    .select("owner_id,profiles!content_items_owner_id_fkey(id,display_name),brands!inner(archived_at)")
    .is("archived_at", null).is("brands.archived_at", null);
  if (error) throw error;
  const owners = new Map<string, string>();
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (profile) owners.set(profile.id, profile.display_name);
  }
  return [...owners].map(([id, name]) => ({ id, name }));
}

export async function countAccessibleContent() {
  const { supabase } = await requireAuthenticatedUser();
  const { count, error } = await supabase.from("content_items").select("id,brands!inner(archived_at)", { count: "exact", head: true }).is("archived_at", null).is("brands.archived_at", null);
  if (error) throw error;
  return count ?? 0;
}
