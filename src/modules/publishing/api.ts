import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { publishedDetailSchema, publishedListSchema } from "./contracts";
import { hashPublishingKey, isPublishingKey } from "./keys";

export function parseBearerHeader(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  const key = header.slice(7);
  return isPublishingKey(key) ? key : null;
}

function anonymousClient() {
  const env = getPublicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function fetchPublishedList(brandKey: string, bearerKey: string) {
  const { data, error } = await anonymousClient().rpc("get_test_published_content_list", { target_brand_key: brandKey, supplied_bearer_hash: hashPublishingKey(bearerKey) });
  if (error) throw new Error("Publishing query failed");
  if (!data) return null;
  return publishedListSchema.parse(data);
}

export async function fetchPublishedDetail(brandKey: string, slug: string, bearerKey: string) {
  const { data, error } = await anonymousClient().rpc("get_test_published_content_detail", { target_brand_key: brandKey, target_slug: slug, supplied_bearer_hash: hashPublishingKey(bearerKey) });
  if (error) throw new Error("Publishing query failed");
  if (!data) return null;
  return publishedDetailSchema.parse(data);
}
